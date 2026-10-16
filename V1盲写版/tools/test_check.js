const { exec } = require('child_process');
const checkCmd = 'powershell.exe -NoProfile -Command "@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \'*desktop_pet.ps1*\' -and $_.ProcessId -ne $PID -and $_.CommandLine -notlike \'*Get-CimInstance*\' -and $_.CommandLine -notlike \'*Where-Object*\' }).Count"';
console.log('Running cmd:', checkCmd);
exec(checkCmd, (err, stdout, stderr) => {
    console.log('stdout:', stdout ? stdout.trim() : '');
    console.log('stderr:', stderr ? stderr.trim() : '');
    console.log('err:', err);
});
