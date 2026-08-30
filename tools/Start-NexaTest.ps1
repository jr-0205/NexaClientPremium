[CmdletBinding()]
param(
    [switch]$RunChecks,
    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedBranch = "feature/premium-user-module"
$DevUrl = "http://127.0.0.1:5173"
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$UiRoot = Join-Path $RepoRoot "src\NexaLauncher.UI"
$DesktopProject = Join-Path $RepoRoot "src\NexaLauncher.Desktop\NexaLauncher.Desktop.csproj"
$Solution = Join-Path $RepoRoot "NexoLauncher.slnx"
$TestsProject = Join-Path $RepoRoot "tests\NexoLauncher.Core.Tests\NexoLauncher.Core.Tests.csproj"
$ViteProcess = $null

function Write-Step([string]$Message) {
    Write-Host "`n[NEXA TEST] $Message" -ForegroundColor Cyan
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontró '$Name' en PATH."
    }
}

function Wait-ForPort([string]$HostName, [int]$Port, [int]$TimeoutSeconds = 25) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $client = [System.Net.Sockets.TcpClient]::new()
            $task = $client.ConnectAsync($HostName, $Port)
            if ($task.Wait(500) -and $client.Connected) {
                $client.Dispose()
                return $true
            }
            $client.Dispose()
        }
        catch {
            # Vite todavía está iniciando.
        }
        Start-Sleep -Milliseconds 350
    }
    return $false
}

function Stop-ProcessTree([int]$ProcessId) {
    if ($ProcessId -le 0) { return }
    try {
        & taskkill.exe /PID $ProcessId /T /F *> $null
    }
    catch {
        try { Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue } catch { }
    }
}

try {
    Set-Location $RepoRoot

    Write-Step "Validando entorno"
    Require-Command "git"
    Require-Command "npm"
    Require-Command "dotnet"

    $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo determinar la rama Git actual."
    }
    if ($branch -ne $ExpectedBranch) {
        throw "Estás en '$branch'. Cambia primero a '$ExpectedBranch' para evitar probar o modificar main por accidente."
    }

    $commit = (& git rev-parse --short HEAD).Trim()
    $dirty = & git status --porcelain
    Write-Host "Rama   : $branch"
    Write-Host "Commit : $commit"
    if ($dirty) {
        Write-Warning "Hay cambios locales sin commit. El script no los modificará ni hará pull automáticamente."
    }

    if (-not (Test-Path $UiRoot)) { throw "No existe la UI en '$UiRoot'." }
    if (-not (Test-Path $DesktopProject)) { throw "No existe el proyecto Desktop en '$DesktopProject'." }

    if (-not $SkipInstall -and -not (Test-Path (Join-Path $UiRoot "node_modules"))) {
        Write-Step "Instalando dependencias de la UI"
        & npm --prefix $UiRoot install
        if ($LASTEXITCODE -ne 0) { throw "npm install falló con código $LASTEXITCODE." }
    }

    if ($RunChecks) {
        Write-Step "Compilando frontend"
        & npm --prefix $UiRoot run build
        if ($LASTEXITCODE -ne 0) { throw "El build de React/Vite falló con código $LASTEXITCODE." }

        Write-Step "Compilando solución .NET"
        & dotnet build $Solution -c Debug
        if ($LASTEXITCODE -ne 0) { throw "dotnet build falló con código $LASTEXITCODE." }

        Write-Step "Ejecutando pruebas Core"
        & dotnet run --project $TestsProject -c Debug
        if ($LASTEXITCODE -ne 0) { throw "Las pruebas fallaron con código $LASTEXITCODE." }
    }

    Write-Step "Iniciando Vite en $DevUrl"
    $shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell.exe" }
    $escapedUi = $UiRoot.Replace("'", "''")
    $viteCommand = "Set-Location -LiteralPath '$escapedUi'; `$Host.UI.RawUI.WindowTitle='NEXA UI DEV'; npm run dev"
    $ViteProcess = Start-Process -FilePath $shell -ArgumentList @("-NoLogo", "-NoExit", "-Command", $viteCommand) -PassThru

    if (-not (Wait-ForPort -HostName "127.0.0.1" -Port 5173)) {
        throw "Vite no abrió el puerto 5173 en 25 segundos. Revisa la ventana 'NEXA UI DEV'."
    }

    Write-Host "Vite listo." -ForegroundColor Green

    Write-Step "Iniciando NEXA Desktop"
    $env:NEXA_UI_DEV_URL = $DevUrl
    Write-Host "Cierra la ventana de NEXA para terminar esta sesión de prueba.`n" -ForegroundColor DarkGray

    & dotnet run --project $DesktopProject
    $desktopExit = $LASTEXITCODE
    if ($desktopExit -ne 0) {
        throw "NEXA Desktop terminó con código $desktopExit."
    }
}
catch {
    Write-Host "`n[NEXA TEST] ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Remove-Item Env:NEXA_UI_DEV_URL -ErrorAction SilentlyContinue
    if ($null -ne $ViteProcess -and -not $ViteProcess.HasExited) {
        Write-Host "`n[NEXA TEST] Cerrando Vite..." -ForegroundColor DarkGray
        Stop-ProcessTree -ProcessId $ViteProcess.Id
    }
    Set-Location $RepoRoot
}

Write-Host "`n[NEXA TEST] Sesión finalizada correctamente." -ForegroundColor Green
