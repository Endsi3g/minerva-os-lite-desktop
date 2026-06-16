#!/usr/bin/env node
/**
 * Minerva OS Reach Lite - Interactive Deploy & Release CLI
 */

import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const C = {
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  reset:   '\x1b[0m',
};
const b = (s) => `${C.bold}${s}${C.reset}`;
const c = (s) => `${C.cyan}${s}${C.reset}`;
const g = (s) => `${C.green}${s}${C.reset}`;
const y = (s) => `${C.yellow}${s}${C.reset}`;
const r = (s) => `${C.red}${s}${C.reset}`;
const dim = (s) => `${C.dim}${s}${C.reset}`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}` };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  console.log(dim(`> ${cmd}`));
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT, env: ENV, ...opts });
    return true;
  } catch {
    console.error(r(`[ERREUR] Échec : ${cmd}`));
    return false;
  }
}

function runOut(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, env: ENV }).toString().trim();
  } catch {
    return '';
  }
}

function has(cmd) {
  try { execSync(`command -v ${cmd}`, { stdio: 'ignore', env: ENV }); return true; }
  catch { return false; }
}

const pm = () => has('pnpm') ? 'pnpm' : 'npm';

function ask(rl, q) {
  return new Promise(res => rl.question(q, res));
}

function header(title) {
  const line = '═'.repeat(56);
  console.log(`\n${C.cyan}${line}${C.reset}`);
  console.log(`${b(c(`   ${title}`))}`.padEnd(60));
  console.log(`${C.cyan}${line}${C.reset}`);
}

// ─── Package.json helpers ────────────────────────────────────────────────────

function readPkg() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
}

function writePkg(pkg) {
  fs.writeFileSync(path.join(ROOT, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.replace(/[^0-9.]/g, '').split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

// ─── App locator ─────────────────────────────────────────────────────────────

function findBuiltApp() {
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(dist)) return null;
  for (const dir of ['mac-arm64', 'mac', 'mac-x64', 'mac-universal']) {
    const d = path.join(dist, dir);
    if (!fs.existsSync(d)) continue;
    const app = fs.readdirSync(d).find(f => f.endsWith('.app'));
    if (app) return path.join(d, app);
  }
  return null;
}

// ─── 1. Diagnostics ──────────────────────────────────────────────────────────

function runDiagnostics() {
  header('DIAGNOSTICS ENVIRONNEMENT');
  let warns = 0, errors = 0;

  console.log(`\n${b('Système')} : ${process.platform} (${process.arch})`);

  const checks = [
    ['node',    () => runOut('node -v'),       'Node.js'],
    ['pnpm',    () => runOut('pnpm -v'),       'pnpm'],
    ['git',     () => runOut('git --version'), 'Git'],
    ['gh',      () => runOut('gh --version').split('\n')[0], 'GitHub CLI (gh)'],
  ];
  console.log(`\n${b('Outils :')} `);
  for (const [cmd, version, label] of checks) {
    if (has(cmd)) console.log(`  ${g('✔')} ${label} : ${dim(version())}`);
    else { console.log(`  ${y('!')} ${label} : absent`); warns++; }
  }

  const envFile = ['.env.local', '.env'].find(f => fs.existsSync(path.join(ROOT, f)));
  console.log(`\n${b('Env')} : `);
  if (envFile) {
    const c = fs.readFileSync(path.join(ROOT, envFile), 'utf8');
    const ok = c.includes('NEXT_PUBLIC_SUPABASE_URL=') && !c.includes('votre-projet');
    console.log(`  ${ok ? g('✔') : y('!')} ${envFile} ${ok ? '' : '— clés par défaut détectées'}`);
    if (!ok) warns++;
  } else {
    console.log(`  ${r('✘')} Aucun .env.local`); errors++;
  }

  const pkg = readPkg();
  console.log(`\n${b('Projet')} :`);
  console.log(`  Version    : ${g(pkg.version)}`);
  console.log(`  Electron   : ${g(pkg.devDependencies?.electron || '—')}`);

  console.log(`\n${C.dim}${'─'.repeat(56)}${C.reset}`);
  console.log(`Bilan : ${errors ? r(errors + ' erreur(s)') : g('0 erreur')}  ${warns ? y(warns + ' avertissement(s)') : g('0 avertissement')}`);
}

// ─── 2. Electron Desktop ─────────────────────────────────────────────────────

async function menuElectron(rl) {
  header('ELECTRON DESKTOP APP');
  console.log(`\n  ${b('1)')} ${c('Dev mode')}         ${dim('(live reload, pnpm electron:dev)')}`);
  console.log(`  ${b('2)')} ${c('Build & Sign')}     ${dim('(DMG pour macOS arm64)')}`);
  console.log(`  ${b('3)')} ${c('Build & Installer')} ${dim('(build → copier dans /Applications)')}`);
  console.log(`  ${b('0)')} Retour\n`);

  const choice = (await ask(rl, `${b('Votre choix : ')}`)).trim();

  if (choice === '1') {
    console.log('\n' + c('Démarrage du serveur Next.js...'));
    run(`${pm()} run dev &`, { detached: true });
    await new Promise(r => setTimeout(r, 2000));
    run(`${pm()} run electron:dev`);
  }
  else if (choice === '2') {
    run(`${pm()} run electron:build`);
    const app = findBuiltApp();
    if (app) console.log(g(`\n✔ App construite : ${app}`));
  }
  else if (choice === '3') {
    const ok = run(`${pm()} run electron:build`);
    if (!ok) return;
    const app = findBuiltApp();
    if (!app) { console.error(r('App introuvable dans dist/')); return; }
    const dest = `/Applications/${path.basename(app)}`;
    console.log(c(`\nInstallation dans /Applications/ ...`));
    run(`rm -rf "${dest}"`);
    run(`cp -r "${app}" "${dest}"`);
    console.log(g(`✔ Installé : ${dest}`));
    run(`open "${dest}"`);
  }
}

// ─── 3. Web App ──────────────────────────────────────────────────────────────

async function menuWeb(rl) {
  header('WEB APP');
  console.log(`\n  ${b('1)')} ${c('Dev server')}         ${dim('(pnpm dev — localhost:3000)')}`);
  console.log(`  ${b('2)')} ${c('Build production')}   ${dim('(pnpm build)')}`);
  console.log(`  ${b('3)')} ${c('Start production')}   ${dim('(pnpm start — requiert un build)')}`);
  console.log(`  ${b('0)')} Retour\n`);

  const choice = (await ask(rl, `${b('Votre choix : ')}`)).trim();
  if (choice === '1') run(`${pm()} run dev`);
  else if (choice === '2') run(`${pm()} run build`);
  else if (choice === '3') run(`${pm()} run start`);
}

// ─── 4. Mobile ───────────────────────────────────────────────────────────────

async function menuMobile(rl) {
  header('MOBILE APP (Capacitor)');
  console.log(`\n  ${b('1)')} ${c('Sync iOS')}                ${dim('(cap sync ios)')}`);
  console.log(`  ${b('2)')} ${c('Sync Android')}             ${dim('(cap sync android)')}`);
  console.log(`  ${b('3)')} ${c('Sync iOS + Android')}       ${dim('(cap sync)')}`);
  console.log(`  ${b('4)')} ${c('Ouvrir Xcode')}             ${dim('(cap open ios)')}`);
  console.log(`  ${b('5)')} ${c('Lancer sur iPhone USB')}    ${dim('(cap run ios)')}`);
  console.log(`  ${b('6)')} ${c('Live Reload iPhone')}       ${dim('(cap run ios --live-reload)')}`);
  console.log(`  ${b('7)')} ${c('Ouvrir Android Studio')}    ${dim('(cap open android)')}`);
  console.log(`  ${b('0)')} Retour\n`);

  const choice = (await ask(rl, `${b('Votre choix : ')}`)).trim();
  const buildThenSync = (syncCmd) => {
    const ok = run(`${pm()} run cap:sync`);
    if (ok) run(syncCmd);
  };

  if (choice === '1') run(`${pm()} run cap:sync`);
  else if (choice === '2') buildThenSync('npx cap sync android');
  else if (choice === '3') run(`${pm()} run cap:sync`);
  else if (choice === '4') run('npx cap open ios');
  else if (choice === '5') run('npx cap run ios');
  else if (choice === '6') run('npx cap run ios --live-reload --external');
  else if (choice === '7') run('npx cap open android');
}

// ─── 5. Publish Release ──────────────────────────────────────────────────────

async function menuRelease(rl) {
  header('PUBLIER UNE RELEASE GITHUB');

  const pkg = readPkg();
  console.log(`\n  Version actuelle : ${g(pkg.version)}\n`);
  console.log(`  ${b('1)')} Patch  ${dim(`→ ${bumpVersion(pkg.version, 'patch')}`)}`);
  console.log(`  ${b('2)')} Minor  ${dim(`→ ${bumpVersion(pkg.version, 'minor')}`)}`);
  console.log(`  ${b('3)')} Major  ${dim(`→ ${bumpVersion(pkg.version, 'major')}`)}`);
  console.log(`  ${b('4)')} Custom (saisir manuellement)`);
  console.log(`  ${b('0)')} Retour\n`);

  const choice = (await ask(rl, `${b('Type de version : ')}`)).trim();
  if (choice === '0') return;

  let newVersion;
  if (choice === '1') newVersion = bumpVersion(pkg.version, 'patch');
  else if (choice === '2') newVersion = bumpVersion(pkg.version, 'minor');
  else if (choice === '3') newVersion = bumpVersion(pkg.version, 'major');
  else if (choice === '4') {
    newVersion = (await ask(rl, `Nouvelle version (ex: 2.9.0) : `)).trim();
  } else return;

  if (!newVersion) return;

  const tag = `v${newVersion}`;
  console.log(`\n${c(`→ Nouvelle version : ${g(tag)}`)}\n`);

  const confirm = (await ask(rl, `Confirmer (build → commit → tag → push → release) ? [y/N] : `)).trim().toLowerCase();
  if (confirm !== 'y') { console.log(y('Annulé.')); return; }

  // 1. Bump version
  pkg.version = newVersion;
  writePkg(pkg);
  console.log(g(`\n✔ package.json mis à jour → ${newVersion}`));

  // 2. Build Electron
  console.log(c('\n→ Build Electron (avec signature)...'));
  const buildOk = run(`${pm()} run electron:build`);
  if (!buildOk) { console.error(r('Build échoué — release annulée.')); return; }

  // 3. Git commit + tag
  console.log(c(`\n→ Commit & tag ${tag}...`));
  run(`git add package.json pnpm-lock.yaml scripts/ setup-mac.sh 2>/dev/null || git add package.json`);
  run(`git commit -m "release: ${tag} — Electron 43 + macOS 26 support"`);
  run(`git tag ${tag}`);

  // 4. Push
  console.log(c('\n→ Push vers GitHub...'));
  run('git push origin master');
  run(`git push origin ${tag}`);

  // 5. GitHub Release via gh CLI or electron-builder --publish
  if (has('gh')) {
    console.log(c('\n→ Création de la release GitHub via gh CLI...'));
    const app = findBuiltApp();
    const distDir = app ? path.dirname(app) : path.join(ROOT, 'dist', 'mac-arm64');

    // Find DMG
    let dmg = '';
    if (fs.existsSync(distDir)) {
      const files = fs.readdirSync(distDir);
      const dmgFile = files.find(f => f.endsWith('.dmg'));
      if (dmgFile) dmg = path.join(distDir, dmgFile);
    }

    const notes = `## Minerva OS Reach Lite ${tag}\n\n- Electron 43 beta — macOS 26 (Tahoe) compatibility\n- Fixed EXC_BREAKPOINT crash on macOS 26 (brk #0 / V8 CHECK failure)\n- Fixed signing pipeline: per-component entitlements instead of --deep\n`;
    const notesFile = path.join(ROOT, 'dist', '_release-notes.md');
    fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
    fs.writeFileSync(notesFile, notes);

    const attachFlag = dmg ? `"${dmg}"` : '';
    run(`gh release create ${tag} ${attachFlag} --title "Minerva OS Reach Lite ${tag}" --notes-file "${notesFile}"`);
    fs.unlinkSync(notesFile);
  } else {
    console.log(c('\n→ Publication via electron-builder (GH_TOKEN requis)...'));
    run(`([ -d app/api ] && mv app/api app-api-temp || true); cross-env EXPORT_MODE=true npx next build; status=$?; ([ -d app-api-temp ] && mv app-api-temp app/api || true); [ $status -eq 0 ] && npx electron-builder --publish always`);
  }

  console.log(g(`\n✔ Release ${tag} publiée sur GitHub !`));
}

// ─── 6. Dependencies ─────────────────────────────────────────────────────────

function installDeps() {
  console.log(c('\n→ Installation des dépendances...'));
  run(`${pm()} install`);
  console.log(c('\n→ Vérification TypeScript...'));
  run(`${pm()} run typecheck`);
  console.log(c('\n→ ESLint...'));
  run(`${pm()} run lint`);
  console.log(g('\n✔ Validation terminée.'));
}

// ─── Main menu ───────────────────────────────────────────────────────────────

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  while (true) {
    const pkg = readPkg();
    console.clear();
    console.log(`${C.cyan}${'═'.repeat(56)}${C.reset}`);
    console.log(b(c('   MINERVA OS REACH LITE — DEPLOY CLI')));
    console.log(`${C.dim}   v${pkg.version}  ·  Electron ${pkg.devDependencies?.electron || '—'}${C.reset}`);
    console.log(`${C.cyan}${'═'.repeat(56)}${C.reset}`);
    console.log('');
    console.log(`  ${b('1)')} 🖥️  ${c('Electron Desktop App')}     ${dim('build, sign, installer')}`);
    console.log(`  ${b('2)')} 🌐 ${c('Web App')}                  ${dim('dev / build / start')}`);
    console.log(`  ${b('3)')} 📱 ${c('Mobile App')}               ${dim('iOS & Android Capacitor')}`);
    console.log(`  ${b('4)')} 🚀 ${c('Publier une Release')}      ${dim('bump → build → commit → push → GitHub')}`);
    console.log(`  ${b('5)')} 🔍 ${c('Diagnostics')}              ${dim('vérifier l\'environnement')}`);
    console.log(`  ${b('6)')} 📦 ${c('Installer les dépendances')}`);
    console.log(`  ${b('0)')} 🚪 Quitter`);
    console.log(`\n${C.dim}${'─'.repeat(56)}${C.reset}`);

    const choice = (await ask(rl, `${b('Votre choix : ')}`)).trim();

    if (choice === '1') await menuElectron(rl);
    else if (choice === '2') await menuWeb(rl);
    else if (choice === '3') await menuMobile(rl);
    else if (choice === '4') await menuRelease(rl);
    else if (choice === '5') { runDiagnostics(); await ask(rl, '\nAppuyez sur Entrée pour continuer...'); }
    else if (choice === '6') { installDeps(); await ask(rl, '\nAppuyez sur Entrée pour continuer...'); }
    else if (choice === '0') { console.log('\nAu revoir ! 👋\n'); rl.close(); process.exit(0); }
    else console.log(y('\nChoix invalide.\n'));
  }
}

// ─── CLI flags ───────────────────────────────────────────────────────────────

if (process.argv.includes('--diagnostics')) { runDiagnostics(); process.exit(0); }
else main().catch(err => { console.error(err); process.exit(1); });
