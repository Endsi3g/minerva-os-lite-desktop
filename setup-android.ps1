# =========================================================================
#     Minerva OS Reach Lite - Windows Android Setup Script
# =========================================================================

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "     Minerva OS Reach Lite - Android SDK Setup Script     " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Ce script configure le SDK Android local pour votre projet Capacitor."
Write-Host ""

$appDir = Join-Path $PSScriptRoot "Minerva OS Lite\minerva-os-lite-desktop"

# 1. Recherche du SDK Android
$sdkPath = ""
if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    $sdkPath = $env:ANDROID_HOME
} elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk") {
    $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
} elseif (Test-Path "$env:USERPROFILE\AppData\Local\Android\Sdk") {
    $sdkPath = "$env:USERPROFILE\AppData\Local\Android\Sdk"
}

if (-not $sdkPath) {
    Write-Host "[ERREUR] Le SDK Android est introuvable sur votre machine." -ForegroundColor Red
    Write-Host "Veuillez installer Android Studio ou configurer la variable d'environnement ANDROID_HOME." -ForegroundColor Yellow
    Exit 1
}

Write-Host "[OK] SDK Android détecté à : $sdkPath" -ForegroundColor Green

# 2. Création du dossier android s'il n'existe pas encore
$androidDir = Join-Path $appDir "android"
if (-not (Test-Path $androidDir)) {
    Write-Host "[INFO] Création du répertoire android dans l'application..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $androidDir -Force | Out-Null
}

# 3. Génération du fichier local.properties requis par Gradle
# Gradle a besoin que les backslashes soient doublés et le deux-points échappé : C\:\\Users\\...
$escapedPath = $sdkPath.Replace("\", "\\").Replace(":", "\:")
$localPropertiesContent = "sdk.dir=$escapedPath"
$propertiesFilePath = Join-Path $androidDir "local.properties"

Write-Host "[INFO] Génération du fichier local.properties..." -ForegroundColor Yellow
Set-Content -Path $propertiesFilePath -Value $localPropertiesContent -Encoding Ascii

Write-Host "[OK] Fichier local.properties généré avec succès." -ForegroundColor Green

# 4. Compilation Next.js en mode Export Statique et synchronisation Capacitor
Write-Host "[INFO] Lancement de la compilation statique Next.js..." -ForegroundColor Yellow
Push-Location $appDir
try {
    # Définir la variable d'environnement pour l'export statique
    $env:EXPORT_MODE = "true"
    pnpm run build
    
    # Vérifier si la plateforme Android a déjà été ajoutée dans Capacitor
    if (-not (Test-Path (Join-Path $androidDir "app"))) {
        Write-Host "[INFO] Ajout de la plateforme Android à Capacitor..." -ForegroundColor Yellow
        npx cap add android
    } else {
        Write-Host "[INFO] Synchronisation de la plateforme Android avec Capacitor..." -ForegroundColor Yellow
    }
    
    npx cap sync android
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "  [SUCCÈS] Environnement Android prêt sur Windows !" -ForegroundColor Green
    Write-Host "  Vous pouvez ouvrir le projet dans Android Studio avec :" -ForegroundColor Green
    Write-Host "  npx cap open android (dans le dossier de l'application)" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Échec de la compilation ou de la synchronisation." -ForegroundColor Red
    Write-Error $_
} finally {
    Pop-Location
    $env:EXPORT_MODE = $null
}
