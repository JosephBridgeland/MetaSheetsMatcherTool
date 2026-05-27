import { state } from './state.js';
import { $, logMsg } from './utils.js';
import { LS_CLIENT_KEY, LS_SHEET_KEY } from './config.js';
import { buildMatches } from './matcher.js';
import { loadSheet, writeToSheet } from './sheets.js';
import { setupDropzone, handleCsvFile, renderPreview, updateWriteSummary, setVisibleSelection } from './ui.js';

// ── GOOGLE OAUTH ──────────────────────────────────────────────────────────────

let tokenClient = null;

function loadGisLibrary() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = Object.assign(document.createElement('script'), {
      src:    'https://accounts.google.com/gsi/client',
      async:  true,
      defer:  true,
      onload: resolve,
      onerror: () => reject(new Error('Failed to load Google Identity Services')),
    });
    document.head.appendChild(s);
  });
}

async function connectGoogle() {
  const cid = $('clientId').value.trim();
  const sid = $('sheetId').value.trim();
  if (!cid) { logMsg('Enter your OAuth Client ID first.', 'err'); return; }
  if (!sid) { logMsg('Enter the Spreadsheet ID first.',   'err'); return; }

  state.sheetId = sid;
  localStorage.setItem(LS_CLIENT_KEY, cid);
  localStorage.setItem(LS_SHEET_KEY,  sid);

  try {
    await loadGisLibrary();
    logMsg('Google Identity Services loaded.', 'ok');
  } catch (e) {
    logMsg(e.message, 'err'); return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: cid,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    callback(resp) {
      if (resp.error) {
        logMsg(`OAuth error: ${resp.error}`, 'err');
        $('connStatus').textContent = `Auth failed: ${resp.error}`;
        return;
      }
      state.accessToken = resp.access_token;
      $('connStatus').innerHTML  = '<span class="pill ok">Signed in</span>';
      $('btnLoadSheet').disabled = false;
      logMsg('Signed in to Google.', 'ok');
    },
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
}

// ── COORDINATION ──────────────────────────────────────────────────────────────

// Rebuilds matches and re-renders whenever either the CSV or the sheet data changes.
function tryRebuildMatches() {
  if (state.csvRows.length && Object.keys(state.sheetData).length) {
    buildMatches();
    renderPreview();
  }
}

async function handleLoadSheet() {
  try {
    await loadSheet();
    tryRebuildMatches();
  } catch (e) {
    logMsg(e.message, 'err');
  }
}

function handleWriteComplete(resp) {
  $('writeSummary').innerHTML += ` <span class="pill ok">Done — ${resp.totalUpdatedCells} cells updated</span>`;
}

// ── INIT ──────────────────────────────────────────────────────────────────────

function init() {
  // Restore saved credentials so the user doesn't retype them each session.
  const savedClient = localStorage.getItem(LS_CLIENT_KEY);
  const savedSheet  = localStorage.getItem(LS_SHEET_KEY);
  if (savedClient) $('clientId').value = savedClient;
  if (savedSheet)  $('sheetId').value  = savedSheet;

  setupDropzone(file => handleCsvFile(file, tryRebuildMatches));

  $('btnConnect').addEventListener('click', connectGoogle);
  $('btnLoadSheet').addEventListener('click', handleLoadSheet);
  $('btnWrite').addEventListener('click', () => writeToSheet(handleWriteComplete));

  document.querySelectorAll('.fchip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.fchip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter = chip.dataset.filter;
      renderPreview();
    });
  });

  $('selectAll').addEventListener('click',  () => setVisibleSelection(true));
  $('selectNone').addEventListener('click', () => setVisibleSelection(false));
}

init();
