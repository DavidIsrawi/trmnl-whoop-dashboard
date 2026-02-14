import fs from 'fs';
import path from 'path';

/**
 * Updates a variable in the .env file.
 * If the variable exists, it replaces its value.
 * If it doesn't exist, it appends it.
 */
export function updateEnvVariable(key: string, value: string) {
  const envPath = path.resolve(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `${key}=${value}\n`);
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  let found = false;
  
  const newLines = lines.map(line => {
    // Match key=value while ignoring comments and whitespace
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  
  if (!found) {
    newLines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(envPath, newLines.join('\n'));
}
