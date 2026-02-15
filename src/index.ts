import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { WhoopClient } from './whoop.js';
import { TrmnlClient } from './trmnl.js';
import { updateEnvVariable } from './utils.js';

// Load .env from custom path if provided (for cloud persistence)
const envPath = process.env.ENV_FILE_PATH;
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Start a minimal health check server for Azure
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Whoop TRMNL Plugin is running...\n');
}).listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

async function runPlugin() {
  const {
    WHOOP_CLIENT_ID,
    WHOOP_CLIENT_SECRET,
    WHOOP_REFRESH_TOKEN,
    TRMNL_WEBHOOK_URL,
  } = process.env;

  if (!WHOOP_CLIENT_ID || !WHOOP_CLIENT_SECRET || !WHOOP_REFRESH_TOKEN || !TRMNL_WEBHOOK_URL) {
    console.error('Missing environment variables. Please check your .env file.');
    return; // Don't exit process in a loop, just skip this run
  }

  const whoop = new WhoopClient(WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REFRESH_TOKEN);
  const trmnl = new TrmnlClient(TRMNL_WEBHOOK_URL);

  try {
    console.log(`[${new Date().toLocaleString()}] Refreshing Whoop token...`);
    await whoop.refreshAccessToken();
    const newRefreshToken = whoop.getUpdatedRefreshToken();
    
    // Update .env file automatically so we don't have to do it manually
    updateEnvVariable('WHOOP_REFRESH_TOKEN', newRefreshToken);
    // Update process.env for the next iteration in the same process
    process.env.WHOOP_REFRESH_TOKEN = newRefreshToken;

    console.log('Fetching Whoop data...');
    const [recovery, recentSleeps, cycle, weeklyStrainAvg, recentCycles, recentRecoveries] = await Promise.all([
      whoop.getLatestRecovery(),
      whoop.getRecentSleeps(10),
      whoop.getLatestCycle(),
      whoop.getWeeklyStrainAverage(),
      whoop.getRecentCycles(7),
      whoop.getRecentRecoveries(7),
    ]);

    const currentCycleId = cycle?.id;
    const sleepsForCycle = recentSleeps.filter(s => s.cycle_id === currentCycleId);

    let totalSleepMs = 0;
    let sleepPerformance = 0;
    let sleepEfficiency = 0;
    let respiratoryRate = 0;

    if (sleepsForCycle.length > 0) {
      // Use the sleep record linked to the latest recovery as the "main" sleep
      // Fallback to the longest sleep or first non-nap if recovery link is missing
      const mainSleep = sleepsForCycle.find(s => s.id === recovery?.sleep_id) || 
                        sleepsForCycle.find(s => !s.nap) || 
                        sleepsForCycle.reduce((prev, current) => {
                          const prevTime = (prev.score?.stage_summary?.total_in_bed_time_milli || 0);
                          const currTime = (current.score?.stage_summary?.total_in_bed_time_milli || 0);
                          return (prevTime > currTime) ? prev : current;
                        });

      sleepPerformance = mainSleep.score.sleep_performance_percentage;
      sleepEfficiency = mainSleep.score.sleep_efficiency_percentage || 0;
      respiratoryRate = mainSleep.score.respiratory_rate || 0;

      // Sum up durations from ALL sleeps in this cycle (main sleep + naps)
      sleepsForCycle.forEach(s => {
        if (s.score?.stage_summary) {
          totalSleepMs += (s.score.stage_summary.total_light_sleep_time_milli || 0) + 
                           (s.score.stage_summary.total_slow_wave_sleep_time_milli || 0) + 
                           (s.score.stage_summary.total_rem_sleep_time_milli || 0);
        }
      });
    }

    const sleepHours = Math.floor(totalSleepMs / (1000 * 60 * 60));
    const sleepMinutes = Math.floor((totalSleepMs % (1000 * 60 * 60)) / (1000 * 60));

    const formatSigFigs = (num: number | undefined | null, figs: number = 2) => {
      if (num === undefined || num === null) return null;
      // Use toPrecision to get the significant figures, then Number to clean up
      return Number(num.toPrecision(figs));
    };

    const payload = {
      recovery_score: recovery?.score?.recovery_score,
      resting_heart_rate: recovery?.score?.resting_heart_rate,
      hrv: formatSigFigs(recovery?.score?.hrv_rmssd_milli),
      spo2: formatSigFigs(recovery?.score?.spo2_percentage),
      skin_temp: formatSigFigs(recovery?.score?.skin_temp_celsius),
      sleep_performance: sleepPerformance || null,
      sleep_efficiency: formatSigFigs(sleepEfficiency),
      respiratory_rate: formatSigFigs(respiratoryRate),
      sleep_time: totalSleepMs > 0 ? `${sleepHours}h ${sleepMinutes}m` : '--',
      strain: formatSigFigs(cycle?.score?.strain),
      weekly_strain_avg: formatSigFigs(weeklyStrainAvg),
      kilojoules: cycle?.score?.kilojoule,
      recent_strains: recentCycles.map(c => c.score.strain).reverse(),
      recent_recoveries: recentRecoveries.map(r => r.score.recovery_score).reverse(),
      last_updated: new Date().toISOString(),
    };

    console.log('Payload for TRMNL:', payload);

    console.log('Pushing data to TRMNL...');
    await trmnl.pushData(payload);
    console.log('Success!');
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

const INTERVAL_MINUTES = parseInt(process.env.REFRESH_INTERVAL_MINUTES || '15');
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

console.log(`Whoop TRMNL Plugin started. Updating every ${INTERVAL_MINUTES} minutes.`);

// Run immediately
runPlugin();

// Schedule periodic updates
setInterval(runPlugin, INTERVAL_MS);
