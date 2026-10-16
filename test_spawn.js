const { spawn } = require('child_process');
const fs = require('fs');

const log = (msg) => {
    fs.appendFileSync('D:/Antigravity/6/spawn_test.log', `[${new Date().toISOString()}] ${msg}\n`);
};

log('Testing spawn powershell directly...');
const child1 = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
    '-File', 'D:\\Antigravity\\6\\desktop_pet.ps1'
], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
});

child1.stdout.on('data', (d) => log('stdout: ' + d.toString()));
child1.stderr.on('data', (d) => log('stderr: ' + d.toString()));
child1.on('error', (e) => log('error: ' + e.toString()));
child1.on('exit', (code, sig) => log(`exit code=${code} sig=${sig}`));
child1.unref();

log(`Spawned child1 pid=${child1.pid}`);

setTimeout(() => {
    log('Done waiting 3 seconds');
    process.exit(0);
}, 3000);
