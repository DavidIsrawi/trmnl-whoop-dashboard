# TRMNL Whoop Plugin

This project integrates Whoop health data with TRMNL displays, fetching metrics like Recovery, Sleep, and Strain to display them on a low-power E-ink screen.

## Architecture

- **`src/index.ts`**: The main orchestrator. It fetches data from Whoop, transforms it into a flat JSON payload, and pushes it to TRMNL every 15 minutes.
- **`src/whoop.ts`**: Encapsulates the Whoop API client. Handles OAuth2 token refreshing and data retrieval from various endpoints (Recovery, Sleep, Cycles).
- **`src/trmnl.ts`**: A simple client to push data to TRMNL webhooks.
- **`src/auth.ts`**: A utility script to perform the initial OAuth2 authorization. It starts a local server to capture the redirect code.
- **`src/preview.ts`**: Renders the `trmnl_template.liquid` locally using `liquidjs` and mock data, saving the result to `preview.html`.
- **`trmnl_template.liquid`**: The UI definition (HTML/CSS/Liquid) that runs on the TRMNL device.

## Authentication & Token Management

- **OAuth2 Flow**: Initial setup requires `npm run auth` to get the first refresh token.
- **Persistence**: `WhoopClient` automatically refreshes the access token when it expires. The new `REFRESH_TOKEN` is written back to the `.env` file via `updateEnv` in `src/utils.ts` to ensure it persists across restarts.
- **Environment Variables**: Managed in `.env`. See `.env.example` for required fields (`WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `TRMNL_ID`, etc.).

## Data Standards

- **Metric Formatting**: Numbers should be formatted to significant figures or specific decimal places (e.g., `Number(val.toFixed(1))`) before being sent in the payload for clean display.
- **Timeframes**: Data is typically fetched for the current day or the most recent available cycles.
- **Payload Structure**: Keep the payload flat and simple to make Liquid template access straightforward.

## UI & Rendering

- **Screen Constraints**: The TRMNL screen is **800x480 pixels**.
- **Liquid Templates**: Use Liquid logic for conditional rendering and loops.
- **CSS**: Styles should be embedded within the `<style>` tag in the Liquid template. Avoid external dependencies unless they are standard web fonts or simple assets.

## Development Workflows

- **Initial Setup**: `cp .env.example .env` and fill in credentials.
- **Authentication**: `npm run auth` to authorize the app with Whoop.
- **Local Preview**: `npm run preview` to generate `preview.html` and verify the UI.
- **Running**: `npm start` for development (uses `tsx`) or `npm run build && npm run serve` for production.

## Mandates

- **Token Protection**: Never log or print access/refresh tokens.
- **Environment Persistence**: Always ensure `updateEnv` is called after a token refresh.
- **Visual Integrity**: Maintain the 800x480 aspect ratio in the template. Avoid overflowing content.
- **Documentation**: If `trmnl_template.liquid` is modified, regenerate the `dashboard.png` preview (via `npm run preview` and a screenshot) and update `README.md`.
- **Concurrency**: Fetch Whoop data (Recovery, Sleep, Cycles) concurrently using `Promise.all` to minimize execution time.
