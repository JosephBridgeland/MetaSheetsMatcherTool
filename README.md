# Meta → Sheets Matcher

A browser-based tool for pulling **Reach** and **Link Clicks** from a Meta Ads Manager CSV export and writing them into the correct cells of a Google Sheet — automatically matched by publication, article number, and geo.

Built for TI Media's paid social reporting workflow.

---

## What it does

1. Export a CSV from Meta Ads Manager
2. Drop it into the tool
3. Sign in with Google and point it at your spreadsheet
4. The tool matches each ad set to the right row and tab in the sheet (by publication name, article number, and country)
5. Review every proposed match before anything is written
6. Click **Write to Sheet** — Reach and Link Clicks land in the right cells

---

## Supported geos

| Tab | Countries matched |
|-----|-------------------|
| US  | United States, USA, US |
| UK  | UK, United Kingdom |
| CA  | Canada |
| AU  | Australia |
| DE  | Germany |
| FR  | France |

---

## Setup (one-time, ~5 minutes)

You need a Google OAuth Client ID to allow the tool to write to your sheet. This is free and only needs to be done once.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project
2. **APIs & Services → Library** → search "Google Sheets API" → **Enable**
3. **APIs & Services → OAuth consent screen** → External → fill in app name → add your Google account as a test user
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Web application
5. Under **Authorised JavaScript origins** add: `https://josephbridgeland.github.io`
6. Copy the Client ID

Then in the tool:
- Paste the Client ID into the first field
- Paste your Spreadsheet ID into the second field (the long string in your Sheet's URL between `/d/` and `/edit`)
- Click **Sign in with Google**

Your Client ID and Spreadsheet ID are saved in your browser so you only need to enter them once.

---

## Matching logic

The tool parses each Meta ad set name expecting this format:

```
Brand | Publication - Article N - Topic - Country
```

It matches against sheet rows formatted as:

```
Publication standard article N
Publication Pro article N
```

**Strict match first** — `TechRadar` and `TechRadar Pro` are treated as distinct publications. If no strict match is found, a fuzzy fallback allows the `Pro` suffix to be missing from the ad set name. Fuzzy matches are flagged with an orange badge in the preview so you can sanity-check them before writing.

Ambiguous matches (same publication + article number appearing more than once in a tab) are flagged and never written automatically.

---

## Running locally

The tool runs entirely in your browser — no server or install needed when accessed via GitHub Pages. To run locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in Chrome. Add `http://localhost:8080` to your OAuth client's Authorised JavaScript origins in Google Cloud Console.

---

## Project structure

```
index.html       — HTML
styles.css       — CSS
js/
  config.js      — geo mappings and constants
  state.js       — shared app state
  utils.js       — utility functions
  parser.js      — CSV and sheet cell parsers
  matcher.js     — matching logic
  sheets.js      — Google Sheets API
  ui.js          — preview table and CSV dropzone
  app.js         — entry point and event wiring
```

---

*Vibe coded by Joseph Bridgeland*
