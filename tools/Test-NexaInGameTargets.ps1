param(
    [string[]]$Versions = @("1.20.1", "1.20.4", "1.20.6", "1.21.1", "1.21.4", "1.21.8"),
    [switch]$NoClean
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$ingameRoot = Join-Path $repoRoot "ingame"
$logRoot = Join-Path $repoRoot "artifacts\nexo-ingame\build-logs"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

$gradle = Get-Command gradle -ErrorAction SilentlyContinue
if (-not $gradle) {
    throw "No se encontró 'gradle' en PATH. Usa el Build Manager de NEXA o instala/expón Gradle para ejecutar esta matriz local."
}

$results = @()

foreach ($version in $Versions) {
    $project = Join-Path $ingameRoot "fabric-$version"
    if (-not (Test-Path (Join-Path $project "build.gradle"))) {
        $results += [pscustomobject]@{ Version = $version; Status = "SKIP"; Detail = "Target inexistente" }
        continue
    }

    $log = Join-Path $logRoot "fabric-$version.log"
    $tasks = @()
    if (-not $NoClean) { $tasks += "clean" }
    $tasks += "build"

    Write-Host ""
    Write-Host "=== NEXA In-Game · Fabric $version ===" -ForegroundColor Cyan
    Write-Host "Proyecto: $project"
    Write-Host "Log:      $log"

    Push-Location $project
    try {
        & $gradle.Source @tasks "--no-daemon" "--console=plain" "--stacktrace" 2>&1 | Tee-Object -FilePath $log
        $exit = $LASTEXITCODE
        if ($exit -eq 0) {
            $results += [pscustomobject]@{ Version = $version; Status = "PASS"; Detail = "build/libs" }
        }
        else {
            $results += [pscustomobject]@{ Version = $version; Status = "FAIL"; Detail = $log }
        }
    }
    catch {
        $_ | Out-String | Add-Content -Path $log
        $results += [pscustomobject]@{ Version = $version; Status = "FAIL"; Detail = $log }
    }
    finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "=== RESUMEN NEXA IN-GAME ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

if ($results.Status -contains "FAIL") {
    Write-Host "Una o más versiones fallaron. Revisa el PRIMER error 'error:' o 'FAILURE:' de cada log; el stacktrace final de Gradle suele ser sólo consecuencia." -ForegroundColor Yellow
    exit 1
}

exit 0
