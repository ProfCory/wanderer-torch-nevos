# Setup (GitHub Pages)

This is a static site. No build step.

## Option A: GitHub Pages (recommended)
1. Create a new GitHub repo (public or private).
2. Add these files to the repo root.
3. In GitHub: **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** (or master) and **/** (root)
4. Open the Pages URL.

## Option B: Local
Just open `index.html` in a browser.

## Saving
- Characters are saved in **this browser** via `localStorage`.
- Use **Export JSON** (per character) or **Export All** to share/backup.
- Use **Import JSON** to load characters on another device or recover.

## Homebrew
- Use **Add Custom Feature / Feat** for anything outside free rules.
- You can also add custom items and custom attacks.

## Data format
Exported files are plain JSON. You can commit them to your repo (e.g., `data/characters/`).

## Rules links
This app links out to free rule references (D&D Beyond and Roll20) via `?` buttons.
