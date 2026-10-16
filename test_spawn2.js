const { spawn } = require('child_process');
const fs = require('fs');

const log = (msg) => {
    fs.appendFileSync('D:/Antigravity/6/spawn_test2.log', `[${new Date().toISOString()}] ${msg}\n`);
};

log('Spawning without detached, capturing all stdio...');
const child = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-File', 'D:\\Antigravity\\6\\desktop_pet.ps1'
]);

child.stdout.on('data', (d) => log('STDOUT: ' + d.toString()));
child.stderr.on('data', (d) => log('STDERR: ' + d.toString()));
child.on('error', (e) => log('ERROR: ' + e.toString()));
child.on('exit', (code, sig) => {
    log(`EXIT: code=${code} sig=${sig}`);
    process.exit(0);
});

setTimeout(() => {
    log('Still alive after 5 seconds! PID=' + child.pid);
    child.kill();
    process.exit(0);
}, 5000);
