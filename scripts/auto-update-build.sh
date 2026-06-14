#!/bin/bash
# Asynchronous auto-updater script for Minerva OS Reach Lite.

# Get project root directory
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Native macOS notification helper
notify() {
  osascript -e "display notification \"$1\" with title \"Minerva OS Auto-Updater\""
}

notify "Nouveau commit détecté. Reconstruction en tâche de fond..."

# Run Next.js and Electron packaging
npm run electron:build > /tmp/minerva-build.log 2>&1
BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  notify "❌ La reconstruction a échoué. Consultez /tmp/minerva-build.log"
  exit 1
fi

notify "📦 Reconstruction réussie. Réinstallation en cours..."

# Terminate running app instances
killall "Minerva OS Reach Lite" 2>/dev/null || true

# Delete old copy from /Applications
rm -rf "/Applications/Minerva OS Reach Lite.app"

# Find built app path
APP_PATH=""
if [ -d "dist/mac/Minerva OS Reach Lite.app" ]; then
  APP_PATH="dist/mac/Minerva OS Reach Lite.app"
elif [ -d "dist/mac-arm64/Minerva OS Reach Lite.app" ]; then
  APP_PATH="dist/mac-arm64/Minerva OS Reach Lite.app"
fi

if [ -n "$APP_PATH" ]; then
  # Copy app directly
  cp -R "$APP_PATH" "/Applications/"
  notify "🚀 Application mise à jour et redémarrée avec succès !"
  open "/Applications/Minerva OS Reach Lite.app"
else
  # Try finding DMG fallback
  DMG_PATH=$(find dist -name "Minerva OS Reach Lite-*.dmg" | head -n 1)
  if [ -n "$DMG_PATH" ]; then
    hdiutil attach "$DMG_PATH" -nobrowse -mountpoint "/Volumes/MinervaMount"
    cp -R "/Volumes/MinervaMount/Minerva OS Reach Lite.app" "/Applications/"
    hdiutil detach "/Volumes/MinervaMount"
    notify "🚀 Application mise à jour et redémarrée avec succès !"
    open "/Applications/Minerva OS Reach Lite.app"
  else
    notify "❌ Application introuvable dans dist/. Échec de la mise à jour."
    exit 1
  fi
fi
