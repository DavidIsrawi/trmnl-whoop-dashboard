import dotenv from 'dotenv';
import { WhoopClient } from './whoop.js';
import { TrmnlClient } from './trmnl.js';
import { updateEnvVariable } from './utils.js';

dotenv.config();

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
    const [recovery, sleep, cycle, weeklyStrainAvg] = await Promise.all([
      whoop.getLatestRecovery(),
      whoop.getLatestSleep(),
      whoop.getLatestCycle(),
      whoop.getWeeklyStrainAverage(),
    ]);

    const payload = {
      recovery_score: recovery?.score?.recovery_score,
      resting_heart_rate: recovery?.score?.resting_heart_rate,
      hrv: recovery?.score?.hrv_rmssd_milli,
      spo2: recovery?.score?.spo2_percentage,
      skin_temp: recovery?.score?.skin_temp_celsius,
      sleep_performance: sleep?.score?.sleep_performance_percentage,
      respiratory_rate: sleep?.score?.respiratory_rate,
      vo2_max: null, // Not available in public API v2 yet
      strain: cycle?.score?.strain,
      weekly_strain_avg: weeklyStrainAvg,
      kilojoules: cycle?.score?.kilojoule,
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
