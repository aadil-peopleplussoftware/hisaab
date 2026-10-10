const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.resolve(rootDir, 'web');

console.log('\x1b[35m%s\x1b[0m', '=====================================================');
console.log('\x1b[36m%s\x1b[0m', ' 🚀 Hisaab Enterprise Personal Finance Web App');
console.log('\x1b[32m%s\x1b[0m', ' 🐘 PostgreSQL: postgres@localhost:5432/hisaab_db');
console.log('\x1b[34m%s\x1b[0m', ' ⚡ Backend Web API: http://localhost:5000/swagger');
console.log('\x1b[33m%s\x1b[0m', ' 🌐 Frontend Web SPA: http://localhost:4200');
console.log('\x1b[35m%s\x1b[0m', '=====================================================\n');

function prefixLog(prefix, color, data) {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.log(`${color}[${prefix}]\x1b[0m ${line}`);
    }
  }
}

// 1. Launch ASP.NET Core 8 Web API
const apiProcess = spawn('dotnet', ['run', '--project', 'src/Hisaab.Api', '--launch-profile', 'http'], {
  cwd: rootDir,
  shell: true
});

apiProcess.stdout.on('data', (data) => prefixLog('API', '\x1b[36m', data));
apiProcess.stderr.on('data', (data) => prefixLog('API-ERR', '\x1b[31m', data));

// 2. Launch Angular 18 Frontend
const webProcess = spawn('npm', ['start'], {
  cwd: webDir,
  shell: true
});

webProcess.stdout.on('data', (data) => prefixLog('WEB', '\x1b[32m', data));
webProcess.stderr.on('data', (data) => prefixLog('WEB-ERR', '\x1b[31m', data));

// Graceful cleanup on Ctrl+C or kill
let cleanedUp = false;
function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  console.log('\n\x1b[33mShutting down Hisaab servers...\x1b[0m');

  if (process.platform === 'win32') {
    if (apiProcess.pid) {
      try { spawn('taskkill', ['/pid', String(apiProcess.pid), '/f', '/t'], { stdio: 'ignore', shell: true }); } catch (_) {}
    }
    if (webProcess.pid) {
      try { spawn('taskkill', ['/pid', String(webProcess.pid), '/f', '/t'], { stdio: 'ignore', shell: true }); } catch (_) {}
    }
  } else {
    try { apiProcess.kill('SIGTERM'); } catch (_) {}
    try { webProcess.kill('SIGTERM'); } catch (_) {}
  }

  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

