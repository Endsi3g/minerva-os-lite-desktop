import readline from 'readline';
import { spawn } from 'child_process';

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
  console.log("  \x1b[34m[6]\x1b[0m Mobile   - Capacitor Export & Sync iOS");
  console.log("  \x1b[34m[7]\x1b[0m Mobile   - Ouvrir dans Xcode Simulator");
  console.log("  \x1b[34m[8]\x1b[0m Mobile   - Capacitor Export & Sync Android");
  console.log("  \x1b[34m[9]\x1b[0m Mobile   - Ouvrir dans Android Studio");
  console.log("");
  console.log("  \x1b[31m[10]\x1b[0m Quitter");
  console.log("\x1b[35m========================================================\x1b[0m");
  rl.question("Entrez votre choix (1-10) : ", handleChoice);
}

function runCommand(command, args = []) {
  console.log(`\n\x1b[90m> Exécution de : ${command} ${args.join(' ')}\x1b[0m\n`);
  rl.close();
  
  const child = spawn(command, args, { stdio: 'inherit', shell: true });
  
  child.on('close', (code) => {
    console.log(`\n\x1b[32mProcessus terminé avec le code ${code}\x1b[0m\n`);
    process.exit(code || 0);
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
      runCommand('pnpm', ['run', 'electron:build']);
      break;
    case '6':
      runCommand('pnpm', ['run', 'cap:sync']);
      break;
    case '7':
      runCommand('pnpm', ['run', 'cap:open:ios']);
      break;
    case '8':
      runCommand('pnpm', ['run', 'cap:sync:android']);
      break;
    case '9':
      runCommand('pnpm', ['run', 'cap:open:android']);
      break;
    case '10':
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

// Start the launcher menu
printMenu();
