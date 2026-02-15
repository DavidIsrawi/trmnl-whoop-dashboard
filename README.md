# TRMNL Whoop Plugin 🚀

A lightweight integration that brings your latest **Whoop** recovery, sleep, and strain data directly to your **TRMNL** e-ink display.

![Whoop](https://img.shields.io/badge/Whoop-v2%20API-blue)
![TRMNL](https://img.shields.io/badge/TRMNL-Webhook-green)
![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen)

## 📱 Dashboard Preview

![TRMNL Whoop Dashboard](dashboard.png)

## ✨ Features

- **Recovery Tracking:** Monitor your Recovery Score, HRV, RHR, SpO2, and Skin Temperature.
- **Sleep Insights:** Track your sleep performance percentage.
- **Strain Analysis:** View your daily strain and weekly strain average.
- **Energy Expenditure:** Monitor kilojoules (calories) burned.
- **Auto-Refreshing:** Automatically refreshes Whoop OAuth tokens and persists them locally.
- **Periodic Updates:** Configurable polling interval to keep your device updated.

## 📊 Data Points

The following data is pushed to your TRMNL device:

| Metric | Key | Description |
| :--- | :--- | :--- |
| **Recovery** | `recovery_score` | Your daily recovery percentage (0-100) |
| **HRV** | `hrv` | Heart Rate Variability (ms) |
| **RHR** | `resting_heart_rate` | Resting Heart Rate (bpm) |
| **Sleep** | `sleep_performance` | Sleep performance percentage |
| **Strain** | `strain` | Daily physical strain (0-21) |
| **Strain Avg** | `weekly_strain_avg` | Average strain over the last 7 days |
| **SpO2** | `spo2` | Blood oxygen levels (%) |
| **Skin Temp** | `skin_temp` | Skin temperature (Celsius) |
| **Energy** | `kilojoules` | Energy expended in KJ |

## 🚀 Setup Instructions

### 1. Whoop Developer Setup
1. Visit the [Whoop Developer Dashboard](https://developer.whoop.com/).
2. Create a new App.
3. Save your **Client ID** and **Client Secret**.
4. Set a Redirect URI (e.g., `http://localhost:3000` for local, or `https://<app-name>.azurewebsites.net/auth/callback` for Azure).
5. Obtain an initial **Refresh Token** (ensure the `offline` scope is included).

### 2. TRMNL Setup
1. Log in to your [TRMNL Dashboard](https://usetrmnl.com/).
2. Navigate to **Plugins** -> **Private Plugins**.
3. Create a new plugin using the **Webhook** strategy.
4. Copy your unique **Webhook URL**.
5. Copy the code from `trmnl_template.liquid` into the **Liquid Template** section of your plugin.

### 3. Installation & Configuration
1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/trmnl-whoop-plugin.git
   cd trmnl-whoop-plugin
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment:
   ```bash
   cp .env.example .env
   ```
4. Fill in the `.env` file with your credentials:
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`
   - `WHOOP_REFRESH_TOKEN`
   - `TRMNL_WEBHOOK_URL`
   - `REFRESH_INTERVAL_MINUTES` (Default: 15)

### 4. Running the Plugin
Start the polling service:
```bash
npm start
```
*Note: The script will automatically update the `WHOOP_REFRESH_TOKEN` in your `.env` file when it refreshes.*

## 🛠 Deployment Options

I wanted something I could set and forget, so I opted for **Azure App Service**. It's rock solid and handles the token rotation perfectly since I've connected it to persistent storage.

### My Setup: Azure App Service (Recommended)
This is the best way to ensure your Whoop credentials don't expire due to the cloud's ephemeral nature:

1. **Persistent Storage:** I created a Standard Azure Storage Account and a File Share called `whoop-data`. My `.env` file lives there.
2. **Web App:** I'm running this on a **Node 24 LTS** Linux Web App.
3. **Configuration:**
   - **Path Mappings:** I mounted my Azure File Share to `/data`.
   - **App Settings:** I set `ENV_FILE_PATH` to `/data/.env`.
   - **Always On:** I turned this **On** (Basic B1 tier) so the background timer never sleeps.
4. **Health Checks:** I added a tiny HTTP server so Azure knows the plugin is alive and kicking.

### Other Ways to Host
- **Home Server / Raspberry Pi:** If you have a Pi or an always-on PC at home, you can just run `pm2 start dist/index.js`. It's the simplest way to keep your `.env` file safe on local disk.
- **Docker:** I'm working on a containerized version for even easier deployment!

## 📄 License
MIT
