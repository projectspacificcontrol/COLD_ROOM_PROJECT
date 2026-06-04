$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LogDir = Join-Path $Root "logs/dev"
$PidFile = Join-Path $LogDir "pids.json"

if (-not (Test-Path $PidFile)) {
    Write-Host "No dev PID file found. Nothing to stop." -ForegroundColor Yellow
    exit 0
}

$pids = Get-Content -LiteralPath $PidFile | ConvertFrom-Json

foreach ($id in @($pids.backend, $pids.frontend)) {
    if ($null -ne $id) {
        $process = Get-Process -Id $id -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $id -Force
            Write-Host "Stopped process $id"
        }
    }
}

Remove-Item -LiteralPath $PidFile -Force
Write-Host "Development servers stopped." -ForegroundColor Green

