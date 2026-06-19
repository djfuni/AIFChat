import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appJsonPath = path.join(root, 'app.json');
const easJsonPath = path.join(root, 'eas.json');

for (const file of [appJsonPath, easJsonPath]) {
  if (!fs.existsSync(file)) {
    console.error(`Missing required file: ${path.basename(file)}`);
    process.exit(1);
  }
  JSON.parse(fs.readFileSync(file, 'utf8'));
}

const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
let pkg = app?.expo?.android?.package;
if (!pkg) {
  const buildGradlePath = path.join(root, 'android', 'app', 'build.gradle');
  if (fs.existsSync(buildGradlePath)) {
    const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
    const match = buildGradle.match(/applicationId\s+'([^']+)'/);
    if (match) pkg = match[1];
  }
}
if (!pkg || pkg === 'top.aifmusic.chat') {
  console.warn('Warning: android.applicationId is still the default value: top.aifmusic.chat');
  console.warn('Before publishing, change it to your own reverse-domain package name, for example com.yourcompany.aifchat.');
}

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || app?.expo?.extra?.apiBaseUrl;
if (!apiBaseUrl || !/^https:\/\//.test(apiBaseUrl)) {
  console.warn('Warning: API base URL should be HTTPS. Set EXPO_PUBLIC_API_BASE_URL=https://your-domain.com');
} else {
  console.log(`API base URL: ${apiBaseUrl}`);
}

console.log('Config check completed.');
