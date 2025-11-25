const { exec } = require('child_process');

console.log('Debugging Log Search...');

const psLogCommand = `
        $logs = Get-ChildItem "H:\\WeGameApps\\英雄联盟" -Recurse -Filter "*LeagueClientUx.log*" | Sort-Object LastWriteTime;
        Write-Output "--- All Log Files ---"
        $logs | ForEach-Object { Write-Output "$($_.LastWriteTime) - $($_.FullName)" }
        
        $log = $logs | Select-Object -Last 1;
        if ($log) {
            Write-Output "--- Selected Log ---"
            Write-Output "File: $($log.FullName)"
            
            $content = Get-Content $log.FullName;
            $portLine = $content | Select-String "app-port" | Select-Object -First 1;
            Write-Output "--- Line containing app-port ---"
            Write-Output $portLine
            
            $port = $content | Select-String -Pattern '--app-port=(\d+)' -AllMatches | ForEach-Object { $_.Matches | ForEach-Object { $_.Groups[1].Value } } | Select-Object -First 1;
            Write-Output "Extracted Port: $port"
        }
    } else {
        Write-Output "No log file found."
    }
`;

exec(`powershell -Command "${psLogCommand.replace(/\n/g, ' ')}"`, (err, stdout, stderr) => {
    if (err) {
        console.error('Exec Error:', err);
    }
    if (stderr) {
        console.error('Stderr:', stderr);
    }
    console.log('Stdout:', stdout);
});
