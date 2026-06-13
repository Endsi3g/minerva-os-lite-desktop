# Minerva OS Lite — Handoff Document

This document describes the key features, architecture, and current state of the **Minerva OS Lite** application after completing the interactive workspace integration.

---

## 1. Project Overview & Repository
- **Project Name**: Minerva OS Lite
- **GitHub Repository**: [https://github.com/Endsi3g/minerva-os-lite-desktop](https://github.com/Endsi3g/minerva-os-lite-desktop)
- **First Stable Release**: [v1.0.2](https://github.com/Endsi3g/minerva-os-lite-desktop/releases/tag/v1.0.2)
- **Technology Stack**: Next.js 16.2.6 (Turbopack), TypeScript, Tailwind CSS, Supabase, Radix UI, Lucide icons.
- **Dependency Management**: `pnpm` (run scripts and install commands inside the `Minerva OS Lite/minerva-os-lite-desktop` directory).

---

## 2. Completed Features

### 💻 Collapsible Sidebar (Full Screen Toggling)
- **Controls**: A sidebar toggle button (`PanelLeftClose` / `ChevronRight`) is located in the top application header bar (top-left).
- **Behavior**: Clicking this toggle collapses the sidebar into an icon-only strip with hover tooltips (`radix-ui` tooltip provider). This gives the user maximum screen space (Full Screen) to edit campaigns or manage connections.
- **State Persistence**: The collapse/expand state is stored inside `localStorage` under `minerva_sidebar_collapsed` to remain synchronized between pages (e.g., when navigating between `/today`, `/welcome`, and `/integrations`).

### 🔌 Interactive Integration Creator & Workspace
- **Add Integration Dialog**: Allows creation of new integration connectors from scratch. Supporting:
  - **Connection Types**: Build from Scratch, Connect Remote MCP, or Connect Remote Agent (A2A).
  - **Fields**: Integration name, description.
- **Integrations Workspace (Langdock Flow)**: Selecting any custom integration displays a dedicated workspace with three main sections:
  1. **Build Tab**:
     - *Authentication sub-tab*: Configure authentication methods (None, API Key, OAuth 2.0 Client Credentials). Features a functional **Save** button showing simulated saving states and a checkmark success badge.
     - *Actions & Triggers sub-tabs*: Display dedicated zero-state cards for creating request parameters or webhooks.
  2. **Share Tab**:
     - *General Access*: Change the access restriction (Private/Restricted vs Public/Entire Workspace) using a custom dropdown.
     - *Invite members*: Add team members, external groups, or API keys. Shows an active user profile row.
  3. **Insights Tab**:
     - Visualizes action metrics and usage histories for the connector over selected timeframes.

### 👥 User Invitations & Profile Picture
- **Invite Users Button**: Placed in the top-right header, this button triggers a clean, popover dialog form allowing user additions.
- **Simulated Email Deliveries**: After submitting an invitation with a chosen role (editor, viewer, or admin), a loading spinner indicates progress before showing a bounce-check animation confirming the email delivery.
- **Avatar Profile**: A premium profile image (via Unsplash) is integrated in the top-right header, matching the style guidelines.

### 🤖 Functional AI Agents
- **Location**: `/agents`
- **Features**: Displays the three customized Minerva agents:
  1. **Tableau Insight Explorer**: Visualizes database tables and metrics.
  2. **Health Assistant**: Parses research and outputs interview findings.
  3. **ASMobbin Agent**: Summarizes user onboarding experiences.
- Includes full agent creation workflows to define custom instruction sets and models.

### 📱 Responsive Layout
- Hamburger menu trigger (`Menu`) and backdrop overlays are enabled on smaller devices to toggle the sidebar smoothly on mobile viewpoints.

---

## 3. Database Schema

The core database structures are stored in [supabase_schema.sql](file:///c:/Minerva%20OS%20Reach%20Lite/Minerva%20OS%20Lite/minerva-os-lite-desktop/supabase_schema.sql):
- **`profiles`**: Stores base identity settings (user ID, full name, company name).
- **`leads`**: Centralizes prospect metrics, contact emails, social coordinates, and local SEO score checks.
- **`folders` & `projects`**: Organizes prospecting campaign folders.
- **`connected_integrations`**: Stores state keys of connected services.

---

## 4. Local Development & Deployment

To run and validate the code locally, run the following commands:

```powershell
# 1. Install dependencies (inside the app directory)
pnpm install

# 2. Run the development server
pnpm run dev

# 3. Validate code compilation, ESLint compliance, and production build
./deploy-test.ps1
```

The `./deploy-test.ps1` script ensures that:
- The code typechecks cleanly (`tsc --noEmit`).
- No critical warnings or styling issues remain (`eslint`).
- Next.js builds the production optimized package.
- The web app starts and responds on port 3000.

---

## 5. Roadmap & Future Steps

### 📱 Full Native Mobile Build (iOS & Android)
- **Status**: Core Capacitor dependencies added, `capacitor.config.json` configured, and `setup-mac.sh` created to prepare the environment.
- **Next Steps**:
  - Integrate native features like push notifications (`@capacitor/push-notifications`), camera access, and persistent local storage.
  - Finalize Android integration by installing Android SDK and running `npx cap add android` / `npx cap sync android`.
  - Set up automated CI/CD pipelines (e.g., GitHub Actions with Fastlane) to deploy build artifacts to Apple TestFlight and Google Play Console.

### 💻 Production Desktop App (Electron)
- **Status**: Electron wrapper added (`electron/main.cjs`, `preload.js`), packaging scripts configured, and `electron-builder` set up in `package.json`.
- **Next Steps**:
  - Implement an auto-update system (e.g., using `electron-updater`) to push security fixes and features to desktop clients automatically.
  - Add native menu bars, system tray quick-access icons, and windows-specific shortcuts.
  - Configure code-signing certificates to prevent security warnings on Windows (SmartScreen) and macOS (Gatekeeper).

### ⚡ Real-World Integrations & AI Engine Expansion
- **Status**: Added global fallback API keys (`process.env.OPENROUTER_API_KEY` and `process.env.ANTHROPIC_API_KEY`) and native Anthropic streaming. Added manual demo data import to keep workspaces clean by default.
- **Next Steps**:
  - Connect real email dispatch engines (e.g., Resend, SendGrid) to replace invitation simulation with real emails.
  - Transition Google Maps scraping (`/api/scrape-maps`) from mock data to actual calls using Google Places API or direct puppeteer scrapers.
  - Expand supported LLMs in the AI Copilot to include OpenAI (`gpt-4o`) and deepseek models dynamically.

