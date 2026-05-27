import { state } from './state.js';
import { $, logMsg, colLetter, normalise } from './utils.js';
import { REACH_COL_NAMES, CLICKS_COL_NAMES } from './config.js';
import { tabKeyForName } from './parser.js';

export async function sheetsApi(path, opts = {}) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${state.sheetId}${path}`,
    {
      ...opts,
      headers: {
        Authorization:  `Bearer ${state.accessToken}`,
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    }
  );
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Loads all geo tabs into state.sheetData.
// Callers should call buildMatches() + renderPreview() after this resolves.
export async function loadSheet() {
  logMsg('Loading spreadsheet metadata…');

  const meta    = await sheetsApi('?fields=sheets(properties(sheetId,title))');
  const allTabs = meta.sheets.map(s => ({ name: s.properties.title, gid: s.properties.sheetId }));
  logMsg(`Tabs found: ${allTabs.map(t => t.name).join(', ')}`, 'ok');

  const geoTabs = allTabs.map(t => ({ ...t, key: tabKeyForName(t.name) })).filter(t => t.key);
  logMsg(`Will read ${geoTabs.length} tab(s): ${geoTabs.map(t => t.name).join(', ')}`);

  for (const t of geoTabs) {
    logMsg(`  ↳ reading "${t.name}"…`);
    const resp = await sheetsApi(`/values/${encodeURIComponent(t.name)}?valueRenderOption=FORMATTED_VALUE`);
    const rows = resp.values ?? [];

    let headerIdx = -1, pubColIdx = -1;
    outer: for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < (rows[r] ?? []).length; c++) {
        if (normalise(rows[r][c]) === 'publication') {
          headerIdx = r; pubColIdx = c; break outer;
        }
      }
    }

    if (headerIdx === -1) {
      logMsg(`    no "Publication" header found in "${t.name}", skipping.`, 'warn');
      continue;
    }

    const headers  = rows[headerIdx];
    const dataRows = rows.slice(headerIdx + 1);

    const findCol = names => {
      for (const name of names) {
        const idx = headers.findIndex(h => normalise(h) === name);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const reachColIdx  = findCol(REACH_COL_NAMES);
    const clicksColIdx = findCol(CLICKS_COL_NAMES);

    state.sheetData[t.key] = { tabName: t.name, headerRowIndex: headerIdx, headers, rows: dataRows, pubColIdx, reachColIdx, clicksColIdx };

    logMsg(
      `    ${dataRows.length} rows; Publication=${colLetter(pubColIdx)}, Reach=${reachColIdx === -1 ? 'NOT FOUND' : colLetter(reachColIdx)}, Clicks=${clicksColIdx === -1 ? 'NOT FOUND' : colLetter(clicksColIdx)}`,
      (reachColIdx === -1 || clicksColIdx === -1) ? 'warn' : 'ok'
    );
  }

  logMsg('Sheet structure loaded.', 'ok');
}

// Writes selected matches to the sheet. Calls onSuccess(resp) on completion.
export async function writeToSheet(onSuccess) {
  const toWrite = state.matches.filter(m => m.kind === 'match' && m.selected);
  if (!toWrite.length) return;
  if (!confirm(`Write ${toWrite.length} row${toWrite.length === 1 ? '' : 's'} to your Google Sheet?\n\nReach and Link clicks values will OVERWRITE the existing cells.`)) return;

  $('btnWrite').disabled = true;
  logMsg(`Writing ${toWrite.length} matches to sheet…`);

  const data = toWrite.flatMap(m => {
    const t       = state.sheetData[m.tab];
    const entries = [];
    if (t.reachColIdx >= 0 && m.csvRow.reach !== null) {
      entries.push({ range: `'${t.tabName}'!${colLetter(t.reachColIdx)}${m.target.absoluteRow}`, values: [[m.csvRow.reach]] });
    }
    if (t.clicksColIdx >= 0 && m.csvRow.clicks !== null) {
      entries.push({ range: `'${t.tabName}'!${colLetter(t.clicksColIdx)}${m.target.absoluteRow}`, values: [[m.csvRow.clicks]] });
    }
    return entries;
  });

  try {
    const resp = await sheetsApi('/values:batchUpdate', {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
    });
    logMsg(`✓ Wrote ${resp.totalUpdatedCells} cells across ${resp.totalUpdatedSheets} sheet(s).`, 'ok');
    onSuccess?.(resp);
  } catch (e) {
    logMsg(`Write failed: ${e.message}`, 'err');
    $('btnWrite').disabled = false;
  }
}
