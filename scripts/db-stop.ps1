# Cleanly stops NOIRE's isolated MySQL instance (port 3307 only).
$ErrorActionPreference = 'Stop'
$root = Join-Path (Split-Path $PSScriptRoot -Parent) '.mysql-noire'
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend\.env'
$line = Get-Content $envFile | Where-Object { $_ -match '^NOIRE_MYSQL_ROOT_PASSWORD=' } | Select-Object -First 1
if (-not $line) { throw 'NOIRE_MYSQL_ROOT_PASSWORD not found in backend/.env' }
$env:MYSQL_PWD = ($line -replace '^NOIRE_MYSQL_ROOT_PASSWORD=', '').Trim('"')
& 'C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqladmin.exe' --defaults-file="$root\my.ini" -u root shutdown
Remove-Item Env:MYSQL_PWD
Write-Host 'NOIRE MySQL stopped.'
