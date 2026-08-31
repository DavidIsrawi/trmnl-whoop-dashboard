import { Liquid } from 'liquidjs';
import fs from 'fs';
import path from 'path';

const localUtcOffsetSeconds = -new Date().getTimezoneOffset() * 60;
process.env.TZ = 'UTC';

const engine = new Liquid({ timezoneOffset: 0 });
const templatePath = path.join(process.cwd(), 'trmnl_template.liquid');
const template = fs.readFileSync(templatePath, 'utf8');

// Mock data matching the payload sent to TRMNL
const mockData = {
  recovery_score: 85,
  recovery_status: 'High recovery',
  recovery_guidance: 'Ready for strain',
  recovery_delta: 8,
  sleep_performance: 92,
  sleep_status: 'Well rested',
  sleep_efficiency: 96,
  hrv: 72,
  resting_heart_rate: 54,
  respiratory_rate: 14.5,
  sleep_time: '7h 15m',
  vo2_max: 52,
  strain: 12.4,
  strain_status: 'Above 7-day avg',
  strain_delta: 1.6,
  weekly_strain_avg: 10.8,
  spo2: 98,
  skin_temp: 36.5,
  kilojoules: 8500,
  recent_strains: [8.2, 12.5, 15.1, 9.4, 11.2, 14.8, 12.4],
  recent_recoveries: [45, 62, 88, 32, 55, 76, 85],
  last_updated: new Date().toISOString(),
  trmnl: {
    user: {
      utc_offset: localUtcOffsetSeconds
    }
  }
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
        html, body {
            width: 800px;
            height: 480px;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #ffffff;
        }

        body {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body>
${html}
</body>
</html>
`;
    fs.writeFileSync('preview.html', wrappedHtml.replace(/[ \t]+$/gm, ''));
    console.log('Preview generated: preview.html');
    console.log('Open preview.html in your browser to see the result.');
  })
  .catch((err) => console.error(err));
