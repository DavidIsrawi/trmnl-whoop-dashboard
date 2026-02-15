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
    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>TRMNL Preview</title>
          <style>
            body { 
              background: #f0f0f0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              font-family: sans-serif;
            }
            .trmnl-screen {
              width: 800px; /* TRMNL width */
              height: 480px; /* TRMNL height */
              background: white;
              padding: 0;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              overflow: hidden;
              position: relative;
            }
            /* Basic TRMNL Layout Emulation */
            .view { height: 100%; display: flex; flex-direction: column; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header .title { font-size: 24px; font-weight: bold; }
            .content { flex-grow: 1; }
            .footer { border-top: 1px solid #eee; padding-top: 10px; font-size: 12px; color: #888; }
            .grid { display: grid; gap: 20px; }
            .grid--cols-2 { grid-template-columns: 1fr 1fr; }
          </style>
        </head>
        <body>
          <div class="trmnl-screen">
            ${html}
          </div>
        </body>
      </html>
    `;
    fs.writeFileSync('preview.html', wrappedHtml);
    console.log('Preview generated: preview.html');
    console.log('Open preview.html in your browser to see the result.');
  })
  .catch((err) => console.error(err));
