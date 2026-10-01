/**
 * Local dev: Postgres + Redis (Docker) + backend + frontend + ai-services.
 * Prerequisites: backend/.env, ai-services/.env (GEMINI_API_KEY for AI).
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

function log(msg) {
  console.log(`[bee3ly dev] ${msg}`);
}

function spawnProc(label, command, args, cwd) {
  log(`starting ${label}…`);
  const child = spawn(command, args, {
    cwd,
    shell: isWin,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) log(`${label} stopped (${signal})`);
    else if (code && code !== 0) {
      log(`${label} exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
}

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      try {
        if (isWin) child.kill();
        else child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
  }
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => {
  log('stopping app processes (Docker keeps running — use npm run dev:stop)');
  shutdown(0);
});
process.on('SIGTERM', () => shutdown(0));

log('Docker: postgres + redis');
execSync('docker compose up -d', { cwd: root, stdio: 'inherit' });

const backendDir = path.join(root, 'backend');

log('Database: prisma migrate deploy');
execSync('npx prisma migrate deploy', { cwd: backendDir, stdio: 'inherit' });
const frontendDir = path.join(root, 'frontend');
const aiDir = path.join(root, 'ai-services');

if (!existsSync(path.join(backendDir, '.env'))) {
  log('warning: backend/.env missing — copy from backend/.env.example');
}
if (!existsSync(path.join(aiDir, '.env'))) {
  log('warning: ai-services/.env missing — AI may fail without GEMINI_API_KEY');
}

const venvPython = path.join(aiDir, '.venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(aiDir, '.venv', 'bin', 'python');
const pythonCmd = existsSync(venvPython)
  ? venvPython
  : existsSync(venvPythonUnix)
    ? venvPythonUnix
    : 'python';

children.push(
  spawnProc('backend', 'npm', ['run', 'start:dev'], backendDir),
  spawnProc('frontend', 'npm', ['run', 'dev'], frontendDir),
  spawnProc('ai-services', pythonCmd, ['-m', 'app.main'], aiDir),
);

log('API http://localhost:5000 | UI http://localhost:5173 | AI http://127.0.0.1:8000');
