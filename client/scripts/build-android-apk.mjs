import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDirectory = path.join(clientDirectory, 'android');
const apiBaseUrl = process.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  console.error('Set VITE_API_BASE_URL to the HTTPS Render API URL ending in /api before building the APK.');
  process.exit(1);
}

try {
  const apiUrl = new URL(apiBaseUrl);
  if (apiUrl.protocol !== 'https:' || apiUrl.pathname.replace(/\/+$/, '') !== '/api') {
    throw new Error('the URL must use HTTPS and end with /api');
  }
} catch (error) {
  console.error(`Invalid VITE_API_BASE_URL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function run(command, args, cwd) {
  const windows = process.platform === 'win32';
  const executable = windows ? process.env.ComSpec || 'cmd.exe' : command;
  const executableArgs = windows ? ['/d', '/c', [command, ...args].join(' ')] : args;
  const result = spawnSync(executable, executableArgs, {
    cwd,
    env: process.env,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(`Could not start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
run(npmCommand, ['run', 'build'], clientDirectory);
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['cap', 'sync', 'android'], clientDirectory);

const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
run(gradleCommand, ['--stop'], androidDirectory);
run(gradleCommand, ['--no-daemon', '--max-workers=1', 'assembleDebug'], androidDirectory);

console.log(`Debug APK created at ${path.join(androidDirectory, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')}`);
