---
name: GitRelease
description: Automates code versioning, tagging, release note compilation, GitHub Actions trigger, and landing page synchronization.
---

# GitRelease Skill

Use this skill to automate the process of version bumping, tagging, release notes preparation, triggering cloud builds via GitHub Actions, and updating landing pages for GitHub Pages.

> [!IMPORTANT]
> This skill is fully parameterized. All names, paths, URLs, and configurations must be dynamically loaded from the active repository. **Never hardcode specific project names or credentials.**

---

## 1. Prerequisites Checklist
Before initiating a release, verify that the active repository is configured with:
- [ ] A GitHub Actions workflow (e.g., `.github/workflows/release.yml` or similar) triggered by tag pushes matching `v*`.
- [ ] A public repository on GitHub with GitHub Pages configured to serve from the `docs` folder or `gh-pages` branch.
- [ ] A `docs/.nojekyll` file (if using GitHub Pages with static HTML pages to prevent Jekyll build engines from ignoring asset folders).

---

## 2. Dynamic Project Inspection
Determine the target application type and its configuration files dynamically by searching the codebase:
- **Tauri Projects**: Locate version tokens in `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src/App.tsx`, and component modals (`AboutModal.tsx`, `SettingsModal.tsx`).
- **Standard Node/Vite Projects**: Locate version tokens in `package.json`, `package-lock.json`, and UI footer components.
- **Python Projects**: Locate version tokens in `pyproject.toml`, `setup.py`, or `src/__init__.py`.

---

## 3. The Step-by-Step Release Flow

### Step 3.1: Version Bump (Codebase Alignment)
1. Determine the new version tag (e.g. `v1.0.X`).
2. Search and replace version references across all UI elements, configuration files, and package manifests.
3. Validate code compilation and type-safety locally (e.g., run `npm run build`, `npx tsc --noEmit`, or equivalent checks).

### Step 3.2: Landing Page Update (index.html)
If `index.html` exists in the `docs/` folder (or root):
1. **Version Badge**: Find the release status badge and bump its value (e.g., change `v1.0.X` to the new version).
2. **Download Links**: Dynamically update all installer download hyperlinks to point to the new version tag's release assets.
3. **Prepend Release Notes**:
   - Locate the `<section class="release-notes">` block.
   - Insert the new release version card/list item at the top of the release notes history.
   - Summarize the new changes clearly.

### Step 3.3: Committing and Pushing Code
1. Stage all changes:
   ```bash
   git add .
   ```
2. Commit changes with a clean prefix:
   ```bash
   git commit -m "chore: bump version to 1.0.X and update landing page"
   ```
3. Push to the default remote branch:
   ```bash
   git push origin main
   ```

### Step 3.4: Tagging the Release
1. Create a lightweight local tag corresponding to the new version:
   ```bash
   git tag v1.0.X
   ```
2. Push the tag to GitHub to trigger the Actions workflow:
   ```bash
   git push origin v1.0.X
   ```

### Step 3.5: Drafting Release Notes
Compile a clean release notes template using markdown for the user to copy/paste into GitHub Releases:
- **Title**: `## What's New in v1.0.X 🚀`
- **Key Changes**: Use bullet points categorized by feature type (e.g. `⚡ Features`, `🛠️ Bug Fixes`, `🎨 Styling`).
- **Upgrade Instructions**: Provide clear, simple steps for users updating to this version.

---

## 4. GitHub Pages Deployment Check
During the first release execution:
1. Verify if GitHub Pages is enabled for the repository.
2. If not enabled, output clear manual steps for the user:
   - Go to **Repository Settings** -> **Pages**.
   - Under **Build and deployment**, set Source to **Deploy from a branch**.
   - Select the branch (e.g. `main`) and folder (e.g. `/docs`).
   - Click **Save**.
