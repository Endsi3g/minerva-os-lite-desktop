import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const gitHooksDir = path.join(projectRoot, '.git', 'hooks');

if (!fs.existsSync(gitHooksDir)) {
  console.error("❌ Dossier .git/hooks introuvable. Êtes-vous dans un dépôt git ?");
  process.exit(1);
}

// Ensure the helper shell script is executable
const helperScript = path.join(projectRoot, 'scripts', 'auto-update-build.sh');
try {
  fs.chmodSync(helperScript, '0755');
  console.log("📂 auto-update-build.sh rendu exécutable (755).");
} catch (e) {
  console.warn("⚠️ Impossible de modifier les permissions de auto-update-build.sh:", e.message);
}

const hooks = ['post-commit', 'post-merge'];
const hookContent = `#!/bin/bash
# Auto-generated hook by Minerva OS setup
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/../.." && pwd)"
bash "\$DIR/scripts/auto-update-build.sh" > /tmp/minerva-git-update.log 2>&1 &
`;

hooks.forEach(hook => {
  const hookPath = path.join(gitHooksDir, hook);
  try {
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    console.log(`✅ Hook git '${hook}' créé avec succès.`);
  } catch (err) {
    console.error(`❌ Échec de la création du hook ${hook}:`, err.message);
  }
});

console.log("🚀 Les hooks git d'auto-mise à jour sont maintenant actifs ! En tâche de fond, chaque commit ou pull reconstruira et redémarrera l'application.");
