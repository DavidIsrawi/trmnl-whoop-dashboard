# TRMNL Whoop Plugin

This "middleman" script fetches your latest Whoop data and pushes it to your TRMNL device via a Private Plugin Webhook.

## Setup Instructions

### 1. Whoop Developer Setup
1. Go to [Whoop Developer Dashboard](https://developer.whoop.com/).
2. Create a new App.
3. Note your **Client ID** and **Client Secret**.
4. Set your Redirect URI (e.g., `http://localhost:3000` for local setup).
5. Obtain an initial **Refresh Token**. You can use a tool like Postman or a simple OAuth flow to get this. Whoop requires the `offline` scope to provide a refresh token.

### 2. TRMNL Setup
1. Log in to your [TRMNL Dashboard](https://usetrmnl.com/).
2. Go to **Plugins** -> **Private Plugins**.
3. Create a new plugin using the **Webhook** strategy.
4. Copy the **Webhook URL**.
5. In the **Liquid Template** section, paste the contents of `trmnl_template.liquid`.

### 3. Middleman Setup
1. Clone this repository.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in your credentials.
   ```bash
   cp .env.example .env
   ```
4. Run the script manually to test:
   ```bash
   npx ts-node src/index.ts
   ```
5. **Important:** Every time the script runs, Whoop may issue a *new* refresh token. In a production environment (like Cloudflare Workers or a Cron job), you must persist this new refresh token so the next run can use it.

## Deployment Options

### GitHub Actions (Cron)
You can set up a GitHub Action to run this script on a schedule. You'll need to handle the refresh token persistence (e.g., by updating a GitHub Secret or using a database).

### Cloudflare Workers
This script can be easily adapted to a Cloudflare Worker using `wrangler`. You can use Cloudflare KV to store the `WHOOP_REFRESH_TOKEN`.

### Local / Raspberry Pi
Run it as a cron job on a local server.

## Data Payload
The script sends the following simplified JSON to TRMNL:
```json
{
  "recovery_score": 85,
  "resting_heart_rate": 52,
  "hrv": 65,
  "sleep_performance": 90,
  "strain": 12.5,
  "last_updated": "2023-10-27T10:00:00Z"
}
```
