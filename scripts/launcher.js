import readline from 'readline';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function printMenu() {
  console.clear();
  console.log("\x1b[35m========================================================\x1b[0m");
  console.log("\x1b[1m\x1b[36m   Minerva OS Reach Lite - Interactive App Launcher\x1b[0m");
  console.log("\x1b[35m========================================================\x1b[0m");
  console.log("Choisissez une plateforme et un mode d'exécution :");
  console.log("");
  console.log("  \x1b[32m[1]\x1b[0m Web App  - Mode Développement (pnpm run dev)");
  console.log("  \x1b[32m[2]\x1b[0m Web App  - Build Production (pnpm run build)");
  console.log("  \x1b[32m[3]\x1b[0m Web App  - Démarrer Production (pnpm run start)");
  console.log("");
  console.log("  \x1b[33m[4]\x1b[0m Desktop  - Electron Dev Mode (Live reload)");
  console.log("  \x1b[33m[5]\x1b[0m Desktop  - Compiler Installer (.exe, .dmg)");
  console.log("");
  console.log("  \x1b[34m[6]\x1b[0m Mobile   - Compiler & Synchroniser (Capacitor Sync)");
  console.log("  \x1b[34m[7]\x1b[0m Mobile   - Ouvrir le projet dans Xcode (iOS)");
  console.log("  \x1b[34m[8]\x1b[0m Mobile   - Lancer sur iPhone connecté (USB)");
  console.log("  \x1b[34m[9]\x1b[0m Mobile   - Lancer sur iPhone connecté (Live Reload)");
  console.log("  \x1b[34m[10]\x1b[0m Mobile  - Ouvrir dans Android Studio");
  console.log("");
  console.log("  \x1b[31m[11]\x1b[0m Quitter");
  console.log("\x1b[35m========================================================\x1b[0m");
  rl.question("Entrez votre choix (1-11) : ", handleChoice);
}

function runCommand(command, args = [], callback = null) {
  console.log(`\n\x1b[90m> Exécution de : ${command} ${args.join(' ')}\x1b[0m\n`);
  rl.close();
  
  const child = spawn(command, args, { stdio: 'inherit', shell: true });
  
  child.on('close', (code) => {
    console.log(`\n\x1b[32mProcessus terminé avec le code ${code}\x1b[0m\n`);
    if (code === 0 && callback) {
      callback();
    } else {
      process.exit(code || 0);
    }
  });
}

function handleChoice(answer) {
  const choice = answer.trim();
  switch (choice) {
    case '1':
      runCommand('pnpm', ['run', 'dev']);
      break;
    case '2':
      runCommand('pnpm', ['run', 'build']);
      break;
    case '3':
      runCommand('pnpm', ['run', 'start']);
      break;
    case '4':
      runCommand('pnpm', ['run', 'electron:dev']);
      break;
    case '5':
      runCommand('pnpm', ['run', 'electron:build'], () => {
        openPackagedApp();
      });
      break;
    case '6':
      runCommand('pnpm', ['run', 'cap:sync']);
      break;
    case '7':
      runCommand('npx', ['cap', 'open', 'ios']);
      break;
    case '8':
      runCommand('npx', ['cap', 'run', 'ios']);
      break;
    case '9':
      runCommand('npx', ['cap', 'run', 'ios', '--live-reload', '--external']);
      break;
    case '10':
      runCommand('npx', ['cap', 'open', 'android']);
      break;
    case '11':
      console.log("\nAu revoir !");
      rl.close();
      process.exit(0);
      break;
    default:
      console.log("\n\x1b[31mChoix invalide. Veuillez saisir un nombre entre 1 et 10.\x1b[0m");
      setTimeout(printMenu, 1500);
      break;
  }
}

function openPackagedApp() {
  console.log("\n\x1b[36mRecherche de l'application compilée pour ouverture automatique...\x1b[0m");
  const distPath = path.resolve(process.cwd(), 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log("\x1b[31mDossier dist/ introuvable. Impossible d'ouvrir l'application.\x1b[0m");
    process.exit(0);
  }

  let appPath = null;

  if (process.platform === 'darwin') {
    // macOS: Look for .app folders inside dist/mac, dist/mac-arm64, dist/mac-x64, etc.
    const possibleDirs = ['mac', 'mac-arm64', 'mac-x64', 'mac-universal'];
    for (const dir of possibleDirs) {
      const fullDir = path.join(distPath, dir);
      if (fs.existsSync(fullDir)) {
        const files = fs.readdirSync(fullDir);
        const appFile = files.find(f => f.endsWith('.app'));
        if (appFile) {
          appPath = path.join(fullDir, appFile);
          break;
        }
      }
    }
    // Fallback: search dist root or any subdirectory for .app
    if (!appPath) {
      const findApp = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            if (file.endsWith('.app')) {
              return fullPath;
            }
            if (file !== 'node_modules' && file !== '.git') {
              const res = findApp(fullPath);
              if (res) return res;
            }
          }
        }
        return null;
      };
      try {
        appPath = findApp(distPath);
      } catch (e) {}
    }
  } else if (process.platform === 'win32') {
    // Windows: Look for unpacked exe or similar
    const possibleDirs = ['win-unpacked'];
    for (const dir of possibleDirs) {
      const fullDir = path.join(distPath, dir);
      if (fs.existsSync(fullDir)) {
        const files = fs.readdirSync(fullDir);
        const exeFile = files.find(f => f.endsWith('.exe'));
        if (exeFile) {
          appPath = path.join(fullDir, exeFile);
          break;
        }
      }
    }
  }

  if (appPath) {
    console.log(`\x1b[32mApplication trouvée : ${appPath}\x1b[0m`);
    console.log("\x1b[36mLancement de l'application...\x1b[0m");
    let cmd = '';
    if (process.platform === 'darwin') {
      cmd = `open "${appPath}"`;
    } else if (process.platform === 'win32') {
      cmd = `start "" "${appPath}"`;
    } else {
      cmd = `"${appPath}" &`;
    }
    
    exec(cmd, (err) => {
      if (err) {
        console.error(`\x1b[31mErreur lors du lancement de l'application : ${err.message}\x1b[0m`);
      }
      process.exit(0);
    });
  } else {
    console.log("\x1b[33mAucune application compilée (.app ou .exe) n'a été trouvée dans dist/.\x1b[0m");
    process.exit(0);
  }
}

// Start the launcher menu
printMenu();
