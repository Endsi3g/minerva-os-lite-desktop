#!/bin/bash
# Minerva OS Reach Lite — macOS Setup & Deploy Script
# Usage: bash setup-mac.sh

set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# ── Colors ────────────────────────────────────────────────────────────────────
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

c()  { echo -e "${CYAN}$*${NC}"; }
g()  { echo -e "${GREEN}$*${NC}"; }
y()  { echo -e "${YELLOW}$*${NC}"; }
r()  { echo -e "${RED}$*${NC}"; }
b()  { echo -e "${BOLD}$*${NC}"; }
dim(){ echo -e "${DIM}$*${NC}"; }

header() {
  echo ""
  echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}   $1${NC}"
  echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
  echo ""
}

ok()   { g "  ✔ $*"; }
warn() { y "  ⚠  $*"; }
fail() { r "  ✘ $*"; }
info() { c "  → $*"; }

# ── Guard: macOS only ─────────────────────────────────────────────────────────
if [[ "$OSTYPE" != "darwin"* ]]; then
  fail "Ce script est réservé à macOS."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Main interactive menu ─────────────────────────────────────────────────────
clear
echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}   MINERVA OS REACH LITE — macOS Setup${NC}"
PKG_VERSION=$(node -p "require('${ROOT_DIR}/package.json').version" 2>/dev/null || echo "—")
echo -e "${DIM}   v${PKG_VERSION}${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}1)${NC} 🖥️  ${CYAN}Electron Desktop App${NC}    $(dim 'build + sign + installer dans /Applications')"
echo -e "  ${BOLD}2)${NC} 🌐 ${CYAN}Web App${NC}                 $(dim 'installer les dépendances + lancer le dev server')"
echo -e "  ${BOLD}3)${NC} 📱 ${CYAN}iOS Mobile App${NC}          $(dim 'Xcode + CocoaPods + Capacitor sync')"
echo -e "  ${BOLD}4)${NC} 📱 ${CYAN}Android Mobile App${NC}      $(dim 'Android SDK + Capacitor sync')"
echo -e "  ${BOLD}5)${NC} 🔧 ${CYAN}Full Setup${NC}              $(dim 'tout installer (Electron + iOS + Android)')"
echo -e "  ${BOLD}0)${NC} 🚪 Quitter"
echo ""
echo -e "${DIM}──────────────────────────────────────────────────────────${NC}"
read -rp "$(echo -e "${BOLD}Votre choix : ${NC}")" SETUP_CHOICE
echo ""

# ── Prerequisite checks (always run) ─────────────────────────────────────────
check_xcode() {
  info "Vérification des outils Xcode..."
  if xcode-select -p &>/dev/null; then ok "Xcode Command Line Tools"
  else
    warn "Xcode Command Line Tools absent — installation..."
    xcode-select --install
    r "Relancez ce script après l'installation de Xcode."
    exit 1
  fi
}

check_homebrew() {
  info "Vérification de Homebrew..."
  if command -v brew &>/dev/null; then ok "Homebrew ($(brew --version | head -1))"
  else
    warn "Homebrew absent — installation..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    export PATH="/opt/homebrew/bin:$PATH"
    ok "Homebrew installé"
  fi
}

check_node() {
  info "Vérification de Node.js et pnpm..."
  if ! command -v node &>/dev/null; then
    warn "Node.js absent — installation via Homebrew..."
    brew install node
  fi
  ok "Node.js $(node -v)"
  if ! command -v pnpm &>/dev/null; then
    warn "pnpm absent — installation..."
    npm install -g pnpm
  fi
  ok "pnpm $(pnpm -v)"
}

install_deps() {
  info "Installation des dépendances..."
  cd "$ROOT_DIR"
  pnpm install
  ok "Dépendances installées"
}

check_env() {
  info "Vérification du fichier d'environnement..."
  if [ ! -f "$ROOT_DIR/.env.local" ] && [ ! -f "$ROOT_DIR/.env" ]; then
    warn ".env.local manquant"
    if [ -f "$ROOT_DIR/.env.example" ]; then
      cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env.local"
      ok ".env.local créé depuis .env.example — configurez vos clés !"
    else
      fail ".env.example introuvable"
    fi
  else
    ok "Fichier d'environnement détecté"
  fi
}

# ── Electron setup ────────────────────────────────────────────────────────────
setup_electron() {
  header "Configuration Electron Desktop"
  check_xcode
  check_homebrew
  check_node
  install_deps
  check_env

  echo ""
  info "Build de l'application Electron (peut prendre 2-3 min)..."
  cd "$ROOT_DIR"
  pnpm run electron:build
  ok "Build terminé"

  APP_SRC=$(find "$ROOT_DIR/dist" -name "*.app" -maxdepth 3 | head -1)
  if [ -n "$APP_SRC" ]; then
    APP_DEST="/Applications/$(basename "$APP_SRC")"
    info "Désinstallation de l'ancienne version..."
    rm -rf "$APP_DEST" 2>/dev/null || true
    info "Installation dans /Applications/ ..."
    cp -r "$APP_SRC" "$APP_DEST"
    ok "Installé : $APP_DEST"

    echo ""
    read -rp "$(echo -e "${BOLD}Ouvrir l'application maintenant ? [y/N] : ${NC}")" OPEN_APP
    [[ "$OPEN_APP" =~ ^[yY]$ ]] && open "$APP_DEST"
  else
    warn "Aucune .app trouvée dans dist/ — vérifiez le build"
  fi
}

# ── Web App setup ─────────────────────────────────────────────────────────────
setup_web() {
  header "Configuration Web App"
  check_homebrew
  check_node
  install_deps
  check_env

  ok "Environnement web prêt !"
  echo ""
  echo -e "  Commandes disponibles :"
  echo -e "  ${CYAN}pnpm run dev${NC}    → Serveur de développement (localhost:3000)"
  echo -e "  ${CYAN}pnpm run build${NC}  → Build production"
  echo -e "  ${CYAN}pnpm run start${NC}  → Démarrer le serveur de production"
  echo ""
  read -rp "$(echo -e "${BOLD}Lancer le serveur de développement maintenant ? [y/N] : ${NC}")" START_DEV
  if [[ "$START_DEV" =~ ^[yY]$ ]]; then
    cd "$ROOT_DIR"
    pnpm run dev
  fi
}

# ── iOS setup ─────────────────────────────────────────────────────────────────
setup_ios() {
  header "Configuration iOS (Capacitor)"
  check_xcode
  check_homebrew
  check_node

  info "Vérification de CocoaPods..."
  if ! command -v pod &>/dev/null; then
    warn "CocoaPods absent — installation..."
    brew install cocoapods
  fi
  ok "CocoaPods $(pod --version)"

  install_deps
  check_env

  info "Export statique Next.js pour Capacitor..."
  cd "$ROOT_DIR"
  [ -d app/api ] && mv app/api app-api-temp
  EXPORT_MODE=true pnpm run build
  [ -d app-api-temp ] && mv app-api-temp app/api

  if [ -d "$ROOT_DIR/ios" ]; then
    info "Synchronisation Capacitor iOS..."
    npx cap sync ios
  else
    info "Ajout de la plateforme iOS..."
    npx cap add ios
    npx cap sync ios
  fi
  ok "Synchronisation iOS terminée"

  echo ""
  read -rp "$(echo -e "${BOLD}Ouvrir Xcode maintenant ? [y/N] : ${NC}")" OPEN_XCODE
  [[ "$OPEN_XCODE" =~ ^[yY]$ ]] && npx cap open ios

  echo ""
  read -rp "$(echo -e "${BOLD}Lancer sur iPhone connecté (live reload) ? [y/N] : ${NC}")" RUN_IOS
  [[ "$RUN_IOS" =~ ^[yY]$ ]] && npx cap run ios --live-reload --external
}

# ── Android setup ─────────────────────────────────────────────────────────────
setup_android() {
  header "Configuration Android (Capacitor)"
  check_homebrew
  check_node
  install_deps
  check_env

  ANDROID_SDK_PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
  if [ -d "$ANDROID_SDK_PATH" ]; then
    ok "SDK Android : $ANDROID_SDK_PATH"
  else
    warn "SDK Android introuvable. Installez Android Studio et relancez ce script."
    exit 1
  fi

  info "Export statique Next.js pour Capacitor..."
  cd "$ROOT_DIR"
  [ -d app/api ] && mv app/api app-api-temp
  EXPORT_MODE=true pnpm run build
  [ -d app-api-temp ] && mv app-api-temp app/api

  mkdir -p "$ROOT_DIR/android"
  echo "sdk.dir=$ANDROID_SDK_PATH" > "$ROOT_DIR/android/local.properties"

  if [ -d "$ROOT_DIR/android/app" ]; then
    info "Synchronisation Capacitor Android..."
    npx cap sync android
  else
    info "Ajout de la plateforme Android..."
    npx cap add android
    npx cap sync android
  fi
  ok "Synchronisation Android terminée"

  echo ""
  read -rp "$(echo -e "${BOLD}Ouvrir Android Studio maintenant ? [y/N] : ${NC}")" OPEN_AS
  [[ "$OPEN_AS" =~ ^[yY]$ ]] && npx cap open android
}

# ── Full setup ────────────────────────────────────────────────────────────────
setup_full() {
  setup_electron
  setup_ios
  setup_android
}

# ── Router ────────────────────────────────────────────────────────────────────
case "$SETUP_CHOICE" in
  1) setup_electron ;;
  2) setup_web      ;;
  3) setup_ios      ;;
  4) setup_android  ;;
  5) setup_full     ;;
  0) echo "Au revoir !"; exit 0 ;;
  *) r "Choix invalide."; exit 1 ;;
esac

echo ""
g "══════════════════════════════════════════════════════════"
g "  Setup terminé avec succès !"
g "  Utilisez 'pnpm run deploy' pour accéder au CLI complet."
g "══════════════════════════════════════════════════════════"
echo ""
