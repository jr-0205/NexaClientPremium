[CmdletBinding()]
param(
    [switch]$RunChecks,
    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedBranch = "feature/premium-user-module"
$DevHost = "127.0.0.1"
$PreferredDevPort = 5173
$DevUrl = $null
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$UiRoot = Join-Path $RepoRoot "src\NexaLauncher.UI"
$DesktopProject = Join-Path $RepoRoot "src\NexaLauncher.Desktop\NexaLauncher.Desktop.csproj"
$Solution = Join-Path $RepoRoot "NexoLauncher.slnx"
$TestsProject = Join-Path $RepoRoot "tests\NexoLauncher.Core.Tests\NexoLauncher.Core.Tests.csproj"
$ViteProcess = $null
$ViteStdOut = Join-Path ([System.IO.Path]::GetTempPath()) "nexa-vite-$PID.stdout.log"
$ViteStdErr = Join-Path ([System.IO.Path]::GetTempPath()) "nexa-vite-$PID.stderr.log"

function Write-Step([string]$Message) {
    Write-Host "`n[NEXA TEST] $Message" -ForegroundColor Cyan
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontró '$Name' en PATH."
    }
}

function Get-AvailableTcpPort([string]$HostName, [int]$PreferredPort) {
    $preferredClient = [System.Net.Sockets.TcpClient]::new()
    try {
        $connectTask = $preferredClient.ConnectAsync($HostName, $PreferredPort)
        if (-not ($connectTask.Wait(250) -and $preferredClient.Connected)) {
            return $PreferredPort
        }
    }
    catch {
        return $PreferredPort
    }
    finally {
        $preferredClient.Dispose()
    }

    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Parse($HostName),
        0
    )
    try {
        $listener.Start()
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    }
    finally {
        $listener.Stop()
    }
}

function Get-ViteLog {
    $lines = @()
    if (Test-Path $ViteStdOut) { $lines += Get-Content -LiteralPath $ViteStdOut -ErrorAction SilentlyContinue }
    if (Test-Path $ViteStdErr) { $lines += Get-Content -LiteralPath $ViteStdErr -ErrorAction SilentlyContinue }
    return ($lines | Select-Object -Last 30) -join [Environment]::NewLine
}

function Wait-ForVite([System.Diagnostics.Process]$Process, [string]$HostName, [int]$Port, [int]$TimeoutSeconds = 25) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            $log = Get-ViteLog
            throw "Vite terminó antes de abrir el puerto $Port (código $($Process.ExitCode)).`n$log"
        }
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
    $log = Get-ViteLog
    throw "Vite no abrió el puerto $Port en $TimeoutSeconds segundos.`n$log"
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

    $devPort = Get-AvailableTcpPort -HostName $DevHost -PreferredPort $PreferredDevPort
    $DevUrl = "http://${DevHost}:$devPort"
    Write-Step "Iniciando Vite en $DevUrl"
    Remove-Item -LiteralPath $ViteStdOut, $ViteStdErr -Force -ErrorAction SilentlyContinue
    $npmCommand = (Get-Command "npm.cmd" -ErrorAction SilentlyContinue).Source
    if (-not $npmCommand) { $npmCommand = (Get-Command "npm").Source }
    $ViteProcess = Start-Process `
        -FilePath $npmCommand `
        -ArgumentList @("run", "dev", "--", "--host", $DevHost, "--port", $devPort, "--strictPort") `
        -WorkingDirectory $UiRoot `
        -RedirectStandardOutput $ViteStdOut `
        -RedirectStandardError $ViteStdErr `
        -WindowStyle Hidden `
        -PassThru

    Wait-ForVite -Process $ViteProcess -HostName $DevHost -Port $devPort

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
    Remove-Item -LiteralPath $ViteStdOut, $ViteStdErr -Force -ErrorAction SilentlyContinue
    Set-Location $RepoRoot
}

Write-Host "`n[NEXA TEST] Sesión finalizada correctamente." -ForegroundColor Green
