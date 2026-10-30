# Starts NOIRE's isolated MySQL instance on 127.0.0.1:3307 as a normal user process
# (no Windows service). The existing MySQL267 service on port 3306 is not touched.
$ErrorActionPreference = 'Stop'
$root = Join-Path (Split-Path $PSScriptRoot -Parent) '.mysql-noire'
$mysqld = 'C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqld.exe'

if (Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host 'Port 3307 is already listening - NOIRE MySQL is probably running.'
    exit 0
}
if (-not (Test-Path "$root\data")) {
    throw "Data directory not found at $root\data. See docs/database.md to initialise the instance."
}

Start-Process -FilePath $mysqld -ArgumentList "--defaults-file=`"$root\my.ini`"" -WindowStyle Hidden
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    if (Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue) {
        Write-Host 'NOIRE MySQL is running on 127.0.0.1:3307'
        exit 0
    }
}
throw "MySQL did not start - see $root\mysqld.err"
