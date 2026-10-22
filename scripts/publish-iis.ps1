# Publish script for Hisaab Project to IIS
param (
    [string]$PublishDir = "D:\Applications\Hisaab\WebRoot"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$WebDir = Join-Path $RootDir "web"
$ApiProject = Join-Path $RootDir "src\Hisaab.Api\Hisaab.Api.csproj"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Publishing Hisaab for Local IIS Hosting" -ForegroundColor Green
Write-Host " Target Directory: $PublishDir" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Build Angular Frontend
Write-Host "`n[1/4] Building Angular SPA..." -ForegroundColor Cyan
Push-Location $WebDir
try {
    npm run build
} finally {
    Pop-Location
}

# Put app offline to release IIS w3wp locks if site is active
$OfflineFile = Join-Path $PublishDir "app_offline.htm"
if (Test-Path $PublishDir) {
    Set-Content -Path $OfflineFile -Value "<html><body><h2>Deploying updates...</h2></body></html>" -Force
    Start-Sleep -Seconds 2
}

try {
    # 2. Publish ASP.NET Core 8 API
    Write-Host "`n[2/4] Publishing ASP.NET Core API..." -ForegroundColor Cyan
    dotnet publish $ApiProject -c Release -o $PublishDir

    # 3. Copy Angular Build to wwwroot
    Write-Host "`n[3/4] Copying Angular assets to wwwroot..." -ForegroundColor Cyan
    $WwwRoot = Join-Path $PublishDir "wwwroot"
    if (-not (Test-Path $WwwRoot)) {
        New-Item -ItemType Directory -Path $WwwRoot -Force | Out-Null
    }

    $AngularDist = Join-Path $WebDir "dist\web\browser"
    Copy-Item -Path "$AngularDist\*" -Destination $WwwRoot -Recurse -Force
} finally {
    if (Test-Path $OfflineFile) {
        Remove-Item -Path $OfflineFile -Force -ErrorAction SilentlyContinue
    }
}

# Create logs folder if not exists
$LogsDir = Join-Path $PublishDir "logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

# Ensure web.config has stdout logging & development environment enabled for troubleshooting
$WebConfigFile = Join-Path $PublishDir "web.config"
if (Test-Path $WebConfigFile) {
    [xml]$xml = Get-Content $WebConfigFile
    $aspNetCore = $xml.configuration.location.'system.webServer'.aspNetCore
    if ($aspNetCore) {
        $aspNetCore.SetAttribute("stdoutLogEnabled", "true")
        if (-not $aspNetCore.environmentVariables) {
            $envVars = $xml.CreateElement("environmentVariables")
            $envVar = $xml.CreateElement("environmentVariable")
            $envVar.SetAttribute("name", "ASPNETCORE_ENVIRONMENT")
            $envVar.SetAttribute("value", "Development")
            $envVars.AppendChild($envVar) | Out-Null
            $aspNetCore.AppendChild($envVars) | Out-Null
        }
        $xml.Save($WebConfigFile)
    }
}

Write-Host "`n[4/4] Verifying Publish Output..." -ForegroundColor Cyan
if ((Test-Path (Join-Path $PublishDir "Hisaab.Api.dll")) -and (Test-Path (Join-Path $WwwRoot "index.html"))) {
    Write-Host "`n SUCCESS! Hisaab has been published to: $PublishDir" -ForegroundColor Green
    Write-Host " Next: Set up your IIS Website and Hosts file as guided." -ForegroundColor Yellow
} else {
    Write-Host "`n Warning: Publish completed but some expected files are missing." -ForegroundColor Red
}

