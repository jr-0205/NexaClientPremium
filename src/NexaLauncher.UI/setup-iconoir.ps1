$ErrorActionPreference = "Stop"

Write-Host "NEXA UI · preparando Iconoir..." -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm no está disponible en PATH. Instala Node.js LTS y vuelve a ejecutar este script."
}

Write-Host "Instalando iconoir-react@7.12.1..."
npm install iconoir-react@7.12.1

Write-Host "Validando TypeScript + Vite..."
npm run build

Write-Host "Iconoir quedó instalado y package.json/package-lock.json fueron actualizados por npm." -ForegroundColor Green
