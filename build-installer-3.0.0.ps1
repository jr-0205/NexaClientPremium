[CmdletBinding()]
param(
    [string]$Version = "3.0.0",
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$UiDir = Join-Path $RepoRoot "src\NexaLauncher.UI"
$DesktopProject = Join-Path $RepoRoot "src\NexaLauncher.Desktop\NexaLauncher.Desktop.csproj"
$Solution = Join-Path $RepoRoot "NexoLauncher.slnx"
$TestsProject = Join-Path $RepoRoot "tests\NexoLauncher.Core.Tests"
$PublishDir = Join-Path $RepoRoot "artifacts\publish\win-x64"
$InstallerDir = Join-Path $RepoRoot "artifacts\installer"
$IssFile = Join-Path $RepoRoot "installer\NexoLauncher.iss"

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontro '$Name' en PATH. Instala la herramienta requerida y vuelve a ejecutar el script."
    }
}

function Find-Iscc {
    $fromPath = Get-Command "ISCC.exe" -ErrorAction SilentlyContinue
    if ($null -ne $fromPath) { return $fromPath.Source }

    $programFilesX86 = [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFilesX86)
    $programFiles = [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFiles)
    $localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)

    $candidatePaths = @(
        (Join-Path $programFilesX86 "Inno Setup 6\ISCC.exe")
        (Join-Path $programFiles "Inno Setup 6\ISCC.exe")
        (Join-Path $localAppData "Programs\Inno Setup 6\ISCC.exe")
    )

    $candidates = @($candidatePaths | Where-Object { $_ -and (Test-Path $_) })
    if ($candidates.Length -gt 0) { return $candidates[0] }

    throw "No se encontro Inno Setup 6 (ISCC.exe). Instala Inno Setup 6 y vuelve a ejecutar el script."
}

if ($Version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
    throw "Version invalida: '$Version'. Ejemplo valido: 3.0.0"
}

Require-Command "node"
Require-Command "npm"
Require-Command "dotnet"
$Iscc = Find-Iscc

Write-Host "NEXA Client - compilacion de instalador v$Version" -ForegroundColor White
Write-Host "Repositorio: $RepoRoot" -ForegroundColor DarkGray
Write-Host "Inno Setup: $Iscc" -ForegroundColor DarkGray

Write-Step "Limpiando artefactos de publicacion anteriores"
if (Test-Path $PublishDir) { Remove-Item $PublishDir -Recurse -Force }
if (Test-Path $InstallerDir) { Remove-Item $InstallerDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $PublishDir | Out-Null
New-Item -ItemType Directory -Force -Path $InstallerDir | Out-Null

Write-Step "Instalando dependencias y compilando React / TypeScript"
Push-Location $UiDir
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci fallo con codigo $LASTEXITCODE." }

    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build fallo con codigo $LASTEXITCODE." }
}
finally {
    Pop-Location
}

Write-Step "Restaurando solucion .NET"
dotnet restore $Solution
if ($LASTEXITCODE -ne 0) { throw "dotnet restore fallo con codigo $LASTEXITCODE." }

if (-not $SkipTests) {
    Write-Step "Compilando solucion y ejecutando checks"
    dotnet build $Solution -c Release --no-restore
    if ($LASTEXITCODE -ne 0) { throw "dotnet build fallo con codigo $LASTEXITCODE." }

    dotnet run --project $TestsProject -c Release --no-build
    if ($LASTEXITCODE -ne 0) { throw "Los checks de NEXA fallaron con codigo $LASTEXITCODE." }
}

Write-Step "Publicando NEXA Client v$Version para Windows x64"
dotnet publish $DesktopProject `
    -c Release `
    -r win-x64 `
    --self-contained true `
    --no-restore `
    -o $PublishDir `
    -p:Version=$Version `
    -p:AssemblyVersion="$Version.0" `
    -p:FileVersion="$Version.0" `
    -p:InformationalVersion=$Version
if ($LASTEXITCODE -ne 0) { throw "dotnet publish fallo con codigo $LASTEXITCODE." }

$PublishedExe = Join-Path $PublishDir "NexaLauncher.Desktop.exe"
$PublishedUi = Join-Path $PublishDir "wwwroot\index.html"
if (-not (Test-Path $PublishedExe)) { throw "No se genero $PublishedExe." }
if (-not (Test-Path $PublishedUi)) { throw "La UI compilada no fue copiada a wwwroot." }

Write-Step "Compilando instalador con Inno Setup"
& $Iscc "/DAppVersion=$Version" $IssFile
if ($LASTEXITCODE -ne 0) { throw "Inno Setup fallo con codigo $LASTEXITCODE." }

$Installer = Join-Path $InstallerDir "NEXA-Client-Setup-$Version-win-x64.exe"
if (-not (Test-Path $Installer)) { throw "Inno Setup termino, pero no se encontro el instalador esperado: $Installer" }

Write-Step "Instalador listo"
$SizeMiB = [Math]::Round((Get-Item $Installer).Length / 1MB, 2)
Write-Host "Archivo: $Installer" -ForegroundColor Green
Write-Host "Tamano: $SizeMiB MiB" -ForegroundColor Green
Write-Host "Version: $Version" -ForegroundColor Green
Write-Host ""
Write-Host "Para compilar nuevamente:" -ForegroundColor DarkGray
Write-Host ".\build-installer-3.0.0.ps1" -ForegroundColor White
