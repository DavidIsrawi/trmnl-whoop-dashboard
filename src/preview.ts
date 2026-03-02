import { Liquid } from 'liquidjs';
import fs from 'fs';
import path from 'path';

const engine = new Liquid();
const templatePath = path.join(process.cwd(), 'trmnl_template.liquid');
const template = fs.readFileSync(templatePath, 'utf8');

// Mock data matching the payload sent to TRMNL
const mockData = {
  recovery_score: 85,
  sleep_performance: 92,
  sleep_efficiency: 96,
  hrv: 72,
  resting_heart_rate: 54,
  respiratory_rate: 14.5,
  sleep_time: '7h 15m',
  vo2_max: 52,
  strain: 12.4,
  weekly_strain_avg: 10.8,
  spo2: 98,
  skin_temp: 36.5,
  kilojoules: 8500,
  recent_strains: [8.2, 12.5, 15.1, 9.4, 11.2, 14.8, 12.4],
  recent_recoveries: [45, 62, 88, 32, 55, 76, 85],
  last_updated: new Date().toISOString()
};

engine
  .parseAndRender(template, mockData)
  .then((html) => {
    const wrappedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TRMNL Whoop Dashboard Preview</title>
    <style>
        html, body { margin: 0; padding: 0; background: #ffffff; }
    </style>
</head>
<body>
${html}
<style>
    /* Preview overrides: placed after template styles to win the cascade */
    .whoop-dashboard { overflow: visible !important; height: auto !important; min-height: 460px; }
    .whoop-dashboard .main-grid { flex: 1 1 260px !important; }
</style>
</body>
</html>
`;
    fs.writeFileSync('preview.html', wrappedHtml);
    console.log('Preview generated: preview.html');
    console.log('Open preview.html in your browser to see the result.');
  })
  .catch((err) => console.error(err));
