# Guide de Déploiement : Hermes Agent Gateway

Ce document explique comment déployer la passerelle **Hermes Agent** sur un VPS / Serveur Cloud pour assurer un fonctionnement H24 connecté à votre CRM Minerva OS.

---

## 1. Déploiement sur un VPS Linux (Docker Compose)

### Prérequis
* Un serveur VPS avec Linux (Ubuntu 22.04 LTS recommandé).
* Docker et Docker Compose installés.
* Un nom de domaine ou une adresse IP statique publique.

### Étapes de déploiement

1. **Cloner le dépôt de compétences** (ou copier le dossier `hermes-agent` sur votre VPS) :
   ```bash
   git clone https://github.com/NousResearch/hermes-agent.git
   cd hermes-agent
   ```

2. **Créer le fichier de configuration `.env`** à partir du template dans `skills/productivity/minerva/references/gateway-setup.md` :
   ```bash
   nano .env
   ```
   Renseignez les variables requises :
   ```bash
   MINERVA_API_URL="https://votre-app-minerva.vercel.app"
   HERMES_SERVICE_TOKEN="votre_secret_token_secu"
   OPENROUTER_API_KEY="sk-or-v1-..."
   TELEGRAM_BOT_TOKEN="..."
   TELEGRAM_ALLOWED_USERS="your_id"
   DISCORD_BOT_TOKEN="..."
   DISCORD_ALLOWED_USERS="your_id"
   TWILIO_ACCOUNT_SID="..."
   TWILIO_AUTH_TOKEN="..."
   TWILIO_PHONE_NUMBER="..."
   SMS_ALLOWED_USERS="..."
   ```

3. **Lancer le conteneur** via Docker Compose :
   ```bash
   docker compose -f skills/productivity/minerva/references/docker-compose.yml up -d
   ```

4. **Vérifier les journaux (logs)** :
   ```bash
   docker logs -f hermes_gateway
   ```

---

## 2. Guide d'utilisation Git (Commits & Pushes)

Pour sauvegarder vos configurations ou modifications locales dans le dépôt principal de l'application :

1. **Vérifier le statut** des fichiers modifiés :
   ```bash
   git status
   ```

2. **Ajouter les modifications** à l'index Git :
   ```bash
   git add .
   ```

3. **Valider les modifications** avec un message structuré (suivant la convention Conventional Commits) :
   ```bash
   git commit -m "feat: integrate hermes gateway configurations and deployment templates"
   ```

4. **Pousser sur la branche principale** (`master` ou `main`) :
   ```bash
   git push origin master
   ```

---

## 3. Publication des Versions (Releases sur GitHub)

Pour créer une nouvelle version officielle (Release) de votre application et mettre à jour le code de production :

1. **Créer un Tag Git** correspondant à la version (ex: `v2.77.0`) :
   ```bash
   git tag -a v2.77.0 -m "Release v2.77.0 - Hermes Agent Gateway Configuration & Deployment UI"
   ```

2. **Pousser le tag** sur GitHub :
   ```bash
   git push origin v2.77.0
   ```

3. **Créer la Release sur GitHub** :
   * Ouvrez votre dépôt sur GitHub.
   * Allez dans l'onglet **Releases** à droite, puis cliquez sur **Draft a new release**.
   * Sélectionnez le tag `v2.77.0` que vous venez de pousser.
   * Donnez un titre clair (ex: `v2.77.0 - Hermes Gateway & Cloud Setup`) et collez la liste des modifications depuis le Changelog.
   * Cliquez sur **Publish release**.
