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

    const recoveryScore = recovery?.score?.recovery_score;
    const strainScore = formatSigFigs(cycle?.score?.strain);
    const recentStrainScores = recentCycles.map(c => c.score.strain).reverse();
    const recentRecoveryScores = recentRecoveries.map(r => r.score.recovery_score).reverse();
    const recoveryAverage = recentRecoveryScores.length > 0
      ? recentRecoveryScores.reduce((sum, score) => sum + score, 0) / recentRecoveryScores.length
      : null;
    const recoveryDelta = recoveryScore !== undefined && recoveryAverage !== null
      ? Math.round(recoveryScore - recoveryAverage)
      : null;
    const strainDelta = strainScore !== null && weeklyStrainAvg !== null && weeklyStrainAvg !== undefined
      ? Number((strainScore - weeklyStrainAvg).toFixed(1))
      : null;
    const recoveryStatus = recoveryScore === undefined
      ? null
      : recoveryScore >= 67
        ? 'High recovery'
        : recoveryScore >= 34
          ? 'Moderate recovery'
          : 'Low recovery';
    const recoveryGuidance = recoveryScore === undefined
      ? null
      : recoveryScore >= 67
        ? 'Ready for strain'
        : recoveryScore >= 34
          ? 'Keep it balanced'
          : 'Prioritize recovery';
    const strainStatus = strainDelta === null
      ? null
      : strainDelta > 1
        ? 'Above 7-day avg'
        : strainDelta < -1
          ? 'Below 7-day avg'
          : 'Near 7-day avg';
    const sleepStatus = sleepPerformance === 0
      ? null
      : sleepPerformance >= 85
        ? 'Well rested'
        : sleepPerformance >= 70
          ? 'Solid sleep'
          : 'Needs attention';

    const payload = {
      recovery_score: recoveryScore,
      recovery_status: recoveryStatus,
      recovery_guidance: recoveryGuidance,
      recovery_delta: recoveryDelta,
      resting_heart_rate: recovery?.score?.resting_heart_rate,
      hrv: formatSigFigs(recovery?.score?.hrv_rmssd_milli),
      spo2: formatSigFigs(recovery?.score?.spo2_percentage),
      skin_temp: formatSigFigs(recovery?.score?.skin_temp_celsius),
      sleep_performance: sleepPerformance || null,
      sleep_status: sleepStatus,
      sleep_efficiency: formatSigFigs(sleepEfficiency),
      respiratory_rate: formatSigFigs(respiratoryRate),
      sleep_time: totalSleepMs > 0 ? `${sleepHours}h ${sleepMinutes}m` : '--',
      strain: strainScore,
      strain_status: strainStatus,
      strain_delta: strainDelta,
      weekly_strain_avg: formatSigFigs(weeklyStrainAvg),
      kilojoules: cycle?.score?.kilojoule,
      recent_strains: recentStrainScores,
      recent_recoveries: recentRecoveryScores,
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
