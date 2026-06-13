#!/bin/bash

# Exit on error
set -e

# ANSI Color Codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}===========================================================${NC}"
echo -e "${CYAN}     Minerva OS Reach Lite - macOS Dev Setup Script        ${NC}"
echo -e "${CYAN}===========================================================${NC}"
echo -e "Ce script va préparer votre environnement macOS pour compiler"
echo -e "l'application en version de bureau (Electron) et mobile (iOS & Android)."
echo ""

# 1. Vérification du système d'exploitation
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${RED}[ERREUR] Ce script doit être exécuté uniquement sur macOS.${NC}"
  exit 1
fi

# 2. Vérification des outils de ligne de commande Xcode
echo -e "${CYAN}[1/6] Vérification des outils de ligne de commande Xcode...${NC}"
if xcode-select -p &>/dev/null; then
  echo -e "${GREEN}[OK] Outils de ligne de commande Xcode détectés.${NC}"
else
  echo -e "${YELLOW}[ATTENTION] Les outils de ligne de commande Xcode sont absents.${NC}"
  echo -e "Installation en cours, veuillez suivre les instructions à l'écran..."
  xcode-select --install
  echo -e "${YELLOW}Veuillez relancer ce script une fois l'installation de Xcode terminée.${NC}"
  exit 1
fi

# 3. Vérification de Homebrew
echo -e "${CYAN}[2/6] Vérification de Homebrew...${NC}"
if command -v brew &>/dev/null; then
  echo -e "${GREEN}[OK] Homebrew est installé.${NC}"
else
  echo -e "${YELLOW}[INFO] Homebrew n'est pas installé. Installation en cours...${NC}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo -e "${GREEN}[OK] Homebrew a été installé avec succès.${NC}"
fi

# 4. Vérification de Node.js et pnpm
echo -e "${CYAN}[3/6] Vérification de Node.js et pnpm...${NC}"
if command -v node &>/dev/null; then
  echo -e "${GREEN}[OK] Node.js est disponible ($(node -v)).${NC}"
else
  echo -e "${YELLOW}[INFO] Node.js est absent. Installation via Homebrew...${NC}"
  brew install node
fi

if command -v pnpm &>/dev/null; then
  echo -e "${GREEN}[OK] pnpm est disponible ($(pnpm -v)).${NC}"
else
  echo -e "${YELLOW}[INFO] pnpm est absent. Installation en cours...${NC}"
  npm install -g pnpm
fi

# 5. Vérification de CocoaPods (requis pour iOS native plugins)
echo -e "${CYAN}[4/6] Vérification de CocoaPods...${NC}"
if command -v pod &>/dev/null; then
  echo -e "${GREEN}[OK] CocoaPods est disponible ($(pod --version)).${NC}"
else
  echo -e "${YELLOW}[INFO] CocoaPods est absent. Installation via Homebrew...${NC}"
  brew install cocoapods
fi

# 5b. Vérification du SDK Android (requis pour compiler Android)
echo -e "${CYAN}[4b/6] Vérification du SDK Android...${NC}"
ANDROID_SDK_PATH="$HOME/Library/Android/sdk"
if [ -d "$ANDROID_SDK_PATH" ]; then
  echo -e "${GREEN}[OK] SDK Android détecté à : $ANDROID_SDK_PATH${NC}"
else
  if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    ANDROID_SDK_PATH="$ANDROID_HOME"
    echo -e "${GREEN}[OK] SDK Android détecté (via ANDROID_HOME) à : $ANDROID_SDK_PATH${NC}"
  else
    ANDROID_SDK_PATH=""
    echo -e "${YELLOW}[ATTENTION] Le SDK Android est introuvable. Si vous souhaitez compiler pour Android, veuillez installer Android Studio.${NC}"
  fi
fi

# 6. Installation des dépendances NPM
echo -e "${CYAN}[5/6] Installation des dépendances du projet...${NC}"
ROOT_DIR="$(pwd)"
echo -e "Dossier racine : $ROOT_DIR"

if [ -f "$ROOT_DIR/package.json" ]; then
  echo "Installation des dépendances à la racine..."
  pnpm install
fi

DESKTOP_DIR="$ROOT_DIR/Minerva OS Lite/minerva-os-lite-desktop"
if [ -d "$DESKTOP_DIR" ]; then
  echo "Installation des dépendances dans le dossier Desktop/App..."
  cd "$DESKTOP_DIR"
  pnpm install
else
  echo -e "${RED}[ERREUR] Le répertoire de l'application $DESKTOP_DIR est introuvable.${NC}"
  exit 1
fi

# 7. Initialisation / Synchronisation des plateformes mobiles Capacitor
echo -e "${CYAN}[6/6] Initialisation des plateformes mobiles...${NC}"
EXPORT_MODE=true pnpm run build

# iOS
if [ -d "$DESKTOP_DIR/ios" ]; then
  echo "La plateforme iOS est déjà ajoutée. Synchronisation en cours..."
  npx cap sync ios
else
  echo "Ajout de la plateforme iOS..."
  npx cap add ios
  npx cap sync ios
fi

# Android
if [ -n "$ANDROID_SDK_PATH" ] && [ -d "$ANDROID_SDK_PATH" ]; then
  mkdir -p "$DESKTOP_DIR/android"
  echo "sdk.dir=$ANDROID_SDK_PATH" > "$DESKTOP_DIR/android/local.properties"
  echo -e "${GREEN}[OK] Fichier android/local.properties configuré.${NC}"
  
  if [ -d "$DESKTOP_DIR/android/app" ]; then
    echo "La plateforme Android est déjà ajoutée. Synchronisation en cours..."
    npx cap sync android
  else
    echo "Ajout de la plateforme Android..."
    npx cap add android
    npx cap sync android
  fi
fi

echo ""
echo -e "${GREEN}===========================================================${NC}"
echo -e "${GREEN}  [SUCCÈS] Environnement configuré avec succès pour macOS !${NC}"
echo -e "${GREEN}  Vous pouvez lancer l'application en mode interactif avec :${NC}"
echo -e "${CYAN}  pnpm run launch${NC}"
echo -e "${GREEN}===========================================================${NC}"
