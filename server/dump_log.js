const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Dumping Log Content...');

const psCommand = `
    $OutputEncoding = [System.Console]::OutputEncoding = [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8;
    $source = Get-ChildItem "H:\\WeGameApps\\英雄联盟" -Recurse -Filter "*LeagueClientUx.log*" | Sort-Object LastWriteTime | Select-Object -Last 1;
    if ($source) {
        Write-Output "Found Log: $($source.FullName)"
        $dest = "C:\\CODE\\web_code\\lol\\server\\temp_log.log";
        try {
            Copy-Item -LiteralPath $source.FullName -Destination $dest -Force;
            Write-Output "Copy success to $dest";
            $content = Get-Content $dest -TotalCount 50;
            Write-Output "--- Content Start ---"
            Write-Output $content
            Write-Output "--- Content End ---"
        } catch {
            Write-Output "Copy failed: $_"
        }
    } else {
        Write-Output "No log found"
    }
`;

exec(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`, (err, stdout, stderr) => {
    if (err) console.error('Error:', err);
    console.log('Stdout:', stdout);
    console.log('Stderr:', stderr);
});
