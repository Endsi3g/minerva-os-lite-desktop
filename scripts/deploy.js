#!/usr/bin/env node

/**
 * Minerva OS Reach Lite - Interactive Deployment & Diagnostic Script
 * 
 * This Node.js utility handles dependency checking, pre-flight environment checks,
 * Electron app builds (Windows/macOS), Capacitor mobile syncs (iOS/Android), and releases.
 * Built entirely with native Node modules to ensure zero-dependency requirements.
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// ANSI Colors
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';
const NC = '\x1b[0m'; // Reset Color
const BOLD = '\x1b[1m';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper to run commands and redirect stdout/stderr to parent process console
function runCommand(command, cwd = projectRoot) {
  console.log(`${CYAN}> ${command}${NC}`);
  try {
    execSync(command, { stdio: 'inherit', cwd, env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}` } });
    return true;
  } catch (err) {
    console.error(`${RED}[ERREUR] Commande échouée : ${command}${NC}`);
    return false;
  }
}

// Check command presence in system PATH
function hasCommand(command) {
  try {
    const cmd = process.platform === 'win32' ? `where ${command}` : `command -v ${command}`;
    execSync(cmd, { stdio: 'ignore', env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}` } });
    return true;
  } catch {
    return false;
  }
}

// Diagnostic Step
function runDiagnostics() {
  console.clear();
  console.log(`${BOLD}${CYAN}===========================================================`);
  console.log(`     DIAGNOSTICS & ANALYSE DE L'ENVIRONNEMENT DE DEV     `);
  console.log(`===========================================================${NC}\n`);

  let warnings = 0;
  let errors = 0;

  // 1. Host OS
  console.log(`${BOLD}1. Système d'exploitation :${NC} ${process.platform} (${process.arch})`);

  // 2. Node & Package Managers
  console.log(`\n${BOLD}2. Outils de développement NPM :${NC}`);
  if (hasCommand('node')) {
    const version = execSync('node -v').toString().trim();
    console.log(`  - Node.js : ${GREEN}[OK] ${version}${NC}`);
  } else {
    console.log(`  - Node.js : ${RED}[ERREUR] Absent !${NC}`);
    errors++;
  }

  if (hasCommand('pnpm')) {
    const version = execSync('pnpm -v').toString().trim();
    console.log(`  - pnpm    : ${GREEN}[OK] v${version}${NC}`);
  } else {
    console.log(`  - pnpm    : ${YELLOW}[ATTENTION] Absent ! NPM sera utilisé par défaut.${NC}`);
    warnings++;
  }

  // 3. Environment Variables
  console.log(`\n${BOLD}3. Fichiers d'environnement (.env.local) :${NC}`);
  const envPath = path.join(projectRoot, '.env.local');
  const envFallbackPath = path.join(projectRoot, '.env');

  if (fs.existsSync(envPath) || fs.existsSync(envFallbackPath)) {
    console.log(`  - Fichier : ${GREEN}[OK] Fichier de configuration trouvé.${NC}`);
    
    // Read variables to check Supabase config
    const content = fs.existsSync(envPath) 
      ? fs.readFileSync(envPath, 'utf8') 
      : fs.readFileSync(envFallbackPath, 'utf8');

    const hasUrl = content.includes('NEXT_PUBLIC_SUPABASE_URL=') && !content.includes('NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co');
    const hasKey = content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon');

    if (hasUrl && hasKey) {
      console.log(`  - Supabase: ${GREEN}[OK] Clés Supabase configurées.${NC}`);
    } else {
      console.log(`  - Supabase: ${YELLOW}[ATTENTION] Clés d'API par défaut détectées ! La synchronisation échouera.${NC}`);
      warnings++;
    }
  } else {
    console.log(`  - Fichier : ${YELLOW}[ATTENTION] .env.local manquant. Génération depuis .env.example...${NC}`);
    const examplePath = path.join(projectRoot, '.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log(`    ${GREEN}-> .env.local créé à partir de .env.example. Veuillez le configurer !${NC}`);
    } else {
      console.log(`    ${RED}-> Erreur : .env.example introuvable !${NC}`);
      errors++;
    }
    warnings++;
  }

  // 4. Mobile Tooling (Xcode/Cocoapods/Android SDK)
  console.log(`\n${BOLD}4. Compilateurs pour plateformes mobiles (Capacitor) :${NC}`);
  
  // iOS Checking
  if (process.platform === 'darwin') {
    if (hasCommand('xcode-select')) {
      try {
        const path = execSync('xcode-select -p').toString().trim();
        console.log(`  - Xcode Command Line Tools : ${GREEN}[OK] ${path}${NC}`);
      } catch {
        console.log(`  - Xcode Command Line Tools : ${RED}[ERREUR] Non installé !${NC}`);
        errors++;
      }
    }
    if (hasCommand('pod')) {
      const version = execSync('pod --version').toString().trim();
      console.log(`  - CocoaPods                : ${GREEN}[OK] v${version}${NC}`);
    } else {
      console.log(`  - CocoaPods                : ${YELLOW}[ATTENTION] Absent ! Installez-le via 'brew install cocoapods'.${NC}`);
      warnings++;
    }
  } else {
    console.log(`  - iOS Tools                : ${YELLOW}[INFO] Skip (Disponible uniquement sur macOS).${NC}`);
  }

  // Android Checking
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const androidSdkPath = process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
    : path.join(homeDir || '', 'Library', 'Android', 'sdk');

  if (fs.existsSync(androidSdkPath)) {
    console.log(`  - SDK Android              : ${GREEN}[OK] Détecté à ${androidSdkPath}${NC}`);
  } else if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
    console.log(`  - SDK Android              : ${GREEN}[OK] Détecté via ANDROID_HOME à ${process.env.ANDROID_HOME}${NC}`);
  } else {
    console.log(`  - SDK Android              : ${YELLOW}[ATTENTION] SDK introuvable. Requis pour compiler les versions Android (.apk).${NC}`);
    warnings++;
  }

  console.log(`\n-----------------------------------------------------------`);
  console.log(`Bilan : ${errors} Erreur(s), ${warnings} Avertissement(s)`);
  console.log(`-----------------------------------------------------------`);
}

// 2. Dependencies installation and validations
function runTests() {
  console.log(`\n${CYAN}--- Installation et tests des dépendances ---${NC}\n`);
  const pkgManager = hasCommand('pnpm') ? 'pnpm' : 'npm';
  
  console.log(`1. Installation des dépendances via ${pkgManager}...`);
  if (!runCommand(`${pkgManager} install`)) return false;

  console.log(`\n2. Vérification des types TypeScript...`);
  if (!runCommand(`${pkgManager} run typecheck`)) return false;

  console.log(`\n3. Analyse statique (ESLint)...`);
  if (!runCommand(`${pkgManager} run lint`)) return false;

  console.log(`\n${GREEN}✔ Toutes les validations sont passées avec succès !${NC}`);
  return true;
}

// 3. Electron App Packaging
function compileDesktop(rl) {
  return new Promise((resolve) => {
    console.log(`\n${CYAN}--- Menu : Compilation de l'application Bureau (Electron) ---${NC}\n`);
    console.log(`1) compiler pour l'OS Hôte Courant (recommandé)`);
    console.log(`2) Compiler pour Windows (Cross-compilation depuis macOS)`);
    console.log(`3) Compiler pour Windows + macOS (toutes plateformes)`);
    console.log(`4) Retour au menu principal`);

    rl.question(`\nVotre choix (1-4) : `, (choice) => {
      const pkgManager = hasCommand('pnpm') ? 'pnpm' : 'npm';
      
      switch (choice.trim()) {
        case '1':
          console.log(`\nCompilation de l'application de bureau pour l'OS courant...`);
          runCommand(`${pkgManager} run electron:build`);
          break;
        case '2':
          console.log(`\nCross-compilation pour Windows (.exe)...`);
          runCommand(`([ -d app/api ] && mv app/api app-api-temp || true); cross-env EXPORT_MODE=true next build; status=$?; ([ -d app-api-temp ] && mv app-api-temp app/api || true); [ $status -eq 0 ] && electron-builder --win`);
          break;
        case '3':
          console.log(`\nCompilation universelle (Mac & Windows)...`);
          runCommand(`([ -d app/api ] && mv app/api app-api-temp || true); cross-env EXPORT_MODE=true next build; status=$?; ([ -d app-api-temp ] && mv app-api-temp app/api || true); [ $status -eq 0 ] && electron-builder --win --mac`);
          break;
        case '4':
        default:
          break;
      }
      resolve();
    });
  });
}

// 4. Capacitor Mobile Sync
function compileMobile(rl) {
  return new Promise((resolve) => {
    console.log(`\n${CYAN}--- Menu : Compilation et synchronisation mobile (Capacitor) ---${NC}\n`);
    console.log(`1) Synchroniser la plateforme iOS`);
    console.log(`2) Synchroniser la plateforme Android`);
    console.log(`3) Synchroniser les deux plateformes (iOS + Android)`);
    console.log(`4) Retour au menu principal`);

    rl.question(`\nVotre choix (1-4) : `, (choice) => {
      const pkgManager = hasCommand('pnpm') ? 'pnpm' : 'npm';
      let buildNeeded = false;
      let syncCmd = '';

      switch (choice.trim()) {
        case '1':
          buildNeeded = true;
          syncCmd = 'npx cap sync ios';
          break;
        case '2':
          buildNeeded = true;
          syncCmd = 'npx cap sync android';
          break;
        case '3':
          buildNeeded = true;
          syncCmd = 'npx cap sync';
          break;
        case '4':
        default:
          resolve();
          return;
      }

      if (buildNeeded) {
        console.log(`\nCompilation statique de Next.js...`);
        // Move app/api to prevent static build warnings
        const buildStatus = runCommand(`([ -d app/api ] && mv app/api app-api-temp || true); cross-env EXPORT_MODE=true next build; status=$?; ([ -d app-api-temp ] && mv app-api-temp app/api || true); exit $status`);
        
        if (buildStatus) {
          console.log(`\nSynchronisation Capacitor (${syncCmd})...`);
          runCommand(syncCmd);
          
          console.log(`\n${GREEN}✔ Synchronisation mobile terminée !${NC}`);
          
          if (choice.trim() === '1' && process.platform === 'darwin') {
            rl.question(`Voulez-vous ouvrir Xcode pour compiler l'application iOS ? (y/N) : `, (ans) => {
              if (ans.trim().toLowerCase() === 'y') {
                runCommand('npx cap open ios');
              }
              resolve();
            });
            return;
          } else if (choice.trim() === '2') {
            rl.question(`Voulez-vous ouvrir Android Studio ? (y/N) : `, (ans) => {
              if (ans.trim().toLowerCase() === 'y') {
                runCommand('npx cap open android');
              }
              resolve();
            });
            return;
          }
        }
      }
      resolve();
    });
  });
}

// 5. Publish Release to GitHub
function publishRelease(rl) {
  return new Promise((resolve) => {
    console.log(`\n${CYAN}--- Menu : Publication de la version (GitHub Releases) ---${NC}\n`);
    console.log(`Ce flux va packager l'application Bureau et l'uploader vers GitHub Releases.`);
    console.log(`Assurez-vous que GH_TOKEN est configuré dans vos variables système.\n`);

    rl.question(`Voulez-vous lancer la publication complète ? (y/N) : `, (ans) => {
      if (ans.trim().toLowerCase() === 'y') {
        const pkgManager = hasCommand('pnpm') ? 'pnpm' : 'npm';
        
        console.log(`\n1. Compilation et empaquetage avec publication vers GitHub...`);
        runCommand(`([ -d app/api ] && mv app/api app-api-temp || true); cross-env EXPORT_MODE=true next build; status=$?; ([ -d app-api-temp ] && mv app-api-temp app/api || true); [ $status -eq 0 ] && electron-builder --publish always`);
      }
      resolve();
    });
  });
}

// Interactive CLI Entrypoint Loop
function showMainMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const loop = () => {
    console.log(`\n${BOLD}${CYAN}===========================================================`);
    console.log(`           MINERVA OS REACH LITE - DEPLOYMENT CLI          `);
    console.log(`===========================================================${NC}`);
    console.log(`1) Exécuter les diagnostics environnementaux`);
    console.log(`2) Installer les dépendances et valider le projet`);
    console.log(`3) Compiler et packager l'application Bureau (Electron)`);
    console.log(`4) Compiler et synchroniser l'application Mobile (Capacitor)`);
    console.log(`5) Publier la Release sur GitHub (Desktop)`);
    console.log(`6) Quitter`);
    console.log(`-----------------------------------------------------------`);

    rl.question(`${BOLD}Votre choix (1-6) : ${NC}`, async (choice) => {
      switch (choice.trim()) {
        case '1':
          runDiagnostics();
          break;
        case '2':
          runTests();
          break;
        case '3':
          await compileDesktop(rl);
          break;
        case '4':
          await compileMobile(rl);
          break;
        case '5':
          await publishRelease(rl);
          break;
        case '6':
          console.log(`\nFermeture du CLI de déploiement. Bon développement ! 👋\n`);
          rl.close();
          process.exit(0);
        default:
          console.log(`${RED}Choix invalide. Veuillez saisir un nombre entre 1 et 6.${NC}`);
          break;
      }
      // Return to main menu
      loop();
    });
  };

  loop();
}

// Check run command args or fallback to menu
if (process.argv.includes('--diagnostics')) {
  runDiagnostics();
  process.exit(0);
} else if (process.argv.includes('--test')) {
  const ok = runTests();
  process.exit(ok ? 0 : 1);
} else {
  showMainMenu();
}
