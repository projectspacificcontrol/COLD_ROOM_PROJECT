param(
    [int]$ApiPort = 8000,
    [int]$WebPort = 5173
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ApiDir = Join-Path $Root "services/api"
$WebDir = Join-Path $Root "apps/web"
$LogDir = Join-Path $Root "logs/dev"
$PidFile = Join-Path $LogDir "pids.json"
$EnvFile = Join-Path $Root ".env"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Load-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Missing .env file at $Path"
    }
    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }
        $parts = $line.Split("=", 2)
        [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
}

function Test-PortInUse {
    param([int]$Port)
    $match = netstat -ano | Select-String ":$Port\s+.*LISTENING"
    return $null -ne $match
}

Load-DotEnv $EnvFile
[Environment]::SetEnvironmentVariable("PYTHONPATH", ".", "Process")
[Environment]::SetEnvironmentVariable("VITE_API_BASE_URL", "http://localhost:$ApiPort/api", "Process")
[Environment]::SetEnvironmentVariable("VITE_USE_FIXTURES", "false", "Process")

if (Test-PortInUse $ApiPort) {
    Write-Host "Backend port $ApiPort is already in use. Stop it first or run scripts/stop-dev.ps1." -ForegroundColor Yellow
    exit 1
}

if (Test-PortInUse $WebPort) {
    Write-Host "Frontend port $WebPort is already in use. Stop it first or run scripts/stop-dev.ps1." -ForegroundColor Yellow
    exit 1
}

Write-Host "Preparing local backend database..." -ForegroundColor Cyan
Push-Location $ApiDir
python -m alembic upgrade head
python -m app.scripts.seed
Pop-Location

$ApiOut = Join-Path $LogDir "backend.out.log"
$ApiErr = Join-Path $LogDir "backend.err.log"
$WebOut = Join-Path $LogDir "frontend.out.log"
$WebErr = Join-Path $LogDir "frontend.err.log"
foreach ($log in @($ApiOut, $ApiErr, $WebOut, $WebErr)) {
    if (Test-Path $log) {
        Remove-Item -LiteralPath $log -Force
    }
}

Write-Host "Starting backend on http://localhost:$ApiPort ..." -ForegroundColor Cyan
$ApiProcess = Start-Process -FilePath "python" `
    -ArgumentList "-m","uvicorn","app.main:app","--reload","--host","127.0.0.1","--port","$ApiPort" `
    -WorkingDirectory $ApiDir `
    -RedirectStandardOutput $ApiOut `
    -RedirectStandardError $ApiErr `
    -PassThru `
    -WindowStyle Hidden

Write-Host "Starting frontend on http://localhost:$WebPort ..." -ForegroundColor Cyan
$WebProcess = Start-Process -FilePath "npm" `
    -ArgumentList "run","dev","--","--host","127.0.0.1","--port","$WebPort" `
    -WorkingDirectory $WebDir `
    -RedirectStandardOutput $WebOut `
    -RedirectStandardError $WebErr `
    -PassThru `
    -WindowStyle Hidden

@{
    backend = $ApiProcess.Id
    frontend = $WebProcess.Id
    apiPort = $ApiPort
    webPort = $WebPort
} | ConvertTo-Json | Set-Content -LiteralPath $PidFile

Start-Sleep -Seconds 4

Write-Host ""
Write-Host "Development servers started." -ForegroundColor Green
Write-Host "Frontend: http://localhost:$WebPort"
Write-Host "Admin:    http://localhost:$WebPort/admin/login"
Write-Host "Backend:  http://localhost:$ApiPort/api/health"
Write-Host ""
Write-Host "Logs:"
Write-Host "Backend stdout: $ApiOut"
Write-Host "Backend stderr: $ApiErr"
Write-Host "Frontend stdout: $WebOut"
Write-Host "Frontend stderr: $WebErr"
Write-Host ""
Write-Host "Stop both with:"
Write-Host "powershell -ExecutionPolicy Bypass -File scripts/stop-dev.ps1"

