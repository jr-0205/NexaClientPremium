[CmdletBinding()]
param(
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Debug'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiRoot = Join-Path $repoRoot 'src\NexaLauncher.UI'
$desktopProject = Join-Path $repoRoot 'src\NexaLauncher.Desktop\NexaLauncher.Desktop.csproj'

Write-Host 'NEXA Client - entorno de prueba' -ForegroundColor Cyan
Write-Host "Repositorio: $repoRoot"
Write-Host "Configuracion: $Configuration"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'No se encontro npm. Instala Node.js 22 o agrega npm al PATH.'
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw 'No se encontro dotnet. Instala el SDK .NET 10 o agrega dotnet al PATH.'
}

Push-Location $uiRoot
try {
    if (-not (Test-Path (Join-Path $uiRoot 'node_modules'))) {
        Write-Host 'Instalando dependencias de la UI...' -ForegroundColor DarkCyan
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci fallo con codigo $LASTEXITCODE." }
    }

    Write-Host 'Compilando UI React...' -ForegroundColor DarkCyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build fallo con codigo $LASTEXITCODE." }
}
finally {
    Pop-Location
}

Write-Host 'Iniciando NEXA Client...' -ForegroundColor Green
& dotnet run --project $desktopProject -c $Configuration
if ($LASTEXITCODE -ne 0) {
    throw "NEXA termino con codigo $LASTEXITCODE."
}
