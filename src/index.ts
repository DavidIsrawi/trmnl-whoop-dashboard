import dotenv from 'dotenv';
import path from 'path';
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
    const [recovery, sleep, cycle, weeklyStrainAvg, recentCycles, recentRecoveries] = await Promise.all([
      whoop.getLatestRecovery(),
      whoop.getLatestSleep(),
      whoop.getLatestCycle(),
      whoop.getWeeklyStrainAverage(),
      whoop.getRecentCycles(7),
      whoop.getRecentRecoveries(7),
    ]);

    const sleepScore = sleep?.score;
    let sleepHours = 0;
    let sleepMinutes = 0;
    if (sleepScore?.stage_summary) {
      const totalSleepMs = (sleepScore.stage_summary.total_light_sleep_time_milli || 0) + 
                           (sleepScore.stage_summary.total_slow_wave_sleep_time_milli || 0) + 
                           (sleepScore.stage_summary.total_rem_sleep_time_milli || 0);
      sleepHours = Math.floor(totalSleepMs / (1000 * 60 * 60));
      sleepMinutes = Math.floor((totalSleepMs % (1000 * 60 * 60)) / (1000 * 60));
    }

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
      sleep_performance: sleep?.score?.sleep_performance_percentage,
      sleep_efficiency: formatSigFigs(sleep?.score?.sleep_efficiency_percentage),
      respiratory_rate: formatSigFigs(sleep?.score?.respiratory_rate),
      sleep_time: sleepScore?.stage_summary ? `${sleepHours}h ${sleepMinutes}m` : '--',
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
