import { state } from './state.js';
import { $, escHtml, fmtNum, colLetter, logMsg, normalise } from './utils.js';
import { COUNTRY_TO_TAB } from './config.js';
import { parseAdSetName } from './parser.js';

// ── CSV DROPZONE ──────────────────────────────────────────────────────────────

// Sets up drag-and-drop and click-to-browse on the dropzone.
// Calls onFile(file) when a CSV is selected.
export function setupDropzone(onFile) {
  const dz    = $('dropzone');
  const input = $('fileInput');

  dz.addEventListener('click', () => input.click());
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('dragging'); });
  dz.addEventListener('dragleave', ()  => dz.classList.remove('dragging'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('dragging');
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', e => {
    if (e.target.files[0]) onFile(e.target.files[0]);
  });
}

// Parses a CSV file and stores results in state.csvRows.
// Calls onComplete() when done so the caller can trigger match building.
export function handleCsvFile(file, onComplete) {
  logMsg(`Parsing CSV: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  /* global Papa */
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete({ data: rows }) {
      let skipped = 0;
      const parsed = [];

      for (const r of rows) {
        const name = r['Ad set name'];
        if (!name) { skipped++; continue; }
        const p = parseAdSetName(name);
        if (!p)  { skipped++; continue; }
        const reach  = parseFloat(r['Reach']);
        const clicks = parseFloat(r['Link clicks']);
        parsed.push({
          adSet:       name,
          publication: p.publication,
          articleNum:  p.articleNum,
          country:     p.country,
          tab:         COUNTRY_TO_TAB[normalise(p.country)] ?? null,
          reach:       isNaN(reach)  ? null : Math.round(reach),
          clicks:      isNaN(clicks) ? null : Math.round(clicks),
        });
      }

      state.csvRows = parsed;
      const geos = new Set(parsed.map(r => r.tab).filter(Boolean));
      const pubs = new Set(parsed.map(r => normalise(r.publication)));

      $('sRows').textContent      = parsed.length;
      $('sCountries').textContent = geos.size;
      $('sPubs').textContent      = pubs.size;
      $('sSkipped').textContent   = skipped;
      $('csvStats').style.display = 'block';
      $('dropzone').classList.add('loaded');
      $('dropzone').querySelector('.big').textContent   = `Loaded: ${file.name}`;
      $('dropzone').querySelector('.small').textContent = `${parsed.length} ad sets · ${geos.size} geos · ${pubs.size} publications`;

      logMsg(`Parsed ${parsed.length} ad sets, ${skipped} skipped. Geos: ${[...geos].join(', ')}`, 'ok');
      onComplete?.();
    },
    error: err => logMsg(`Parse error: ${err.message}`, 'err'),
  });
}

// ── PREVIEW TABLE ─────────────────────────────────────────────────────────────

export function renderPreview() {
  const wrap = $('previewWrap');
  if (!state.matches.length) {
    wrap.innerHTML = '<div class="empty">No matches built yet.</div>';
    return;
  }

  $('filterBar').style.display = 'flex';
  $('writeBar').style.display  = 'flex';

  const counts = { all: state.matches.length, match: 0, unmatched: 0, ambiguous: 0 };
  for (const m of state.matches) counts[m.kind]++;
  $('filterCount').textContent = `${counts.match} match · ${counts.unmatched} unmatched · ${counts.ambiguous} ambiguous`;

  const visible = state.filter === 'all'
    ? state.matches
    : state.matches.filter(m => m.kind === state.filter);

  const rowsHtml = visible.map(m => {
    const globalIdx = state.matches.indexOf(m);
    const checkbox  = m.kind === 'match'
      ? `<input type="checkbox" class="rowsel" data-idx="${globalIdx}" ${m.selected ? 'checked' : ''} />`
      : `<input type="checkbox" disabled />`;

    if (m.kind === 'match') {
      const t          = state.sheetData[m.tab];
      const reachCell  = t.reachColIdx  >= 0 ? `${colLetter(t.reachColIdx)}${m.target.absoluteRow}`  : '—';
      const clicksCell = t.clicksColIdx >= 0 ? `${colLetter(t.clicksColIdx)}${m.target.absoluteRow}` : '—';
      const fuzzyBadge = m.fuzzy ? ' <span class="pill warn" title="Pro-suffix fuzzy match — sanity-check this one">fuzzy</span>' : '';
      return `<tr class="match${m.selected ? '' : ' deselected'}" data-idx="${globalIdx}">
        <td style="text-align:center">${checkbox}</td>
        <td><span class="pill ok">match</span>${fuzzyBadge}</td>
        <td>${escHtml(m.csvRow.adSet)}</td>
        <td>${m.tab}</td>
        <td>${escHtml(m.target.sheetText)}<br/><span style="color:var(--ink-soft);font-size:10px">row ${m.target.absoluteRow}</span></td>
        <td><strong>${fmtNum(m.csvRow.reach)}</strong> → ${reachCell}</td>
        <td><strong>${fmtNum(m.csvRow.clicks)}</strong> → ${clicksCell}</td>
      </tr>`;
    }

    if (m.kind === 'unmatched') {
      return `<tr class="unmatched">
        <td style="text-align:center">${checkbox}</td>
        <td><span class="pill err">unmatched</span></td>
        <td>${escHtml(m.csvRow.adSet)}</td>
        <td>${m.csvRow.tab ?? '?'}</td>
        <td colspan="3" style="font-style:italic">${escHtml(m.reason)}</td>
      </tr>`;
    }

    const candidateLines = m.candidates.map(c => `row ${c.absoluteRow}: "${escHtml(c.sheetText)}"`).join('<br/>');
    return `<tr class="ambiguous">
      <td style="text-align:center">${checkbox}</td>
      <td><span class="pill warn">ambiguous</span></td>
      <td>${escHtml(m.csvRow.adSet)}</td>
      <td>${m.tab}</td>
      <td colspan="3" style="font-style:italic">Multiple rows match — won't write. Candidates:<br/>${candidateLines}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="preview">
      <thead><tr>
        <th style="width:36px;text-align:center">✓</th>
        <th style="width:90px">Status</th>
        <th>Meta Ad set</th>
        <th style="width:50px">Tab</th>
        <th>Sheet target</th>
        <th>Reach</th>
        <th>Link clicks</th>
      </tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="7" class="empty">No rows in this view.</td></tr>'}</tbody>
    </table>`;

  wrap.querySelectorAll('.rowsel').forEach(cb => {
    cb.addEventListener('change', e => {
      const idx = +e.target.dataset.idx;
      state.matches[idx].selected = e.target.checked;
      e.target.closest('tr').classList.toggle('deselected', !e.target.checked);
      updateWriteSummary();
    });
  });

  updateWriteSummary();
}

export function updateWriteSummary() {
  let total = 0, selected = 0, unmatched = 0, ambiguous = 0;
  for (const m of state.matches) {
    if (m.kind === 'match')     { total++; if (m.selected) selected++; }
    if (m.kind === 'unmatched') unmatched++;
    if (m.kind === 'ambiguous') ambiguous++;
  }
  $('writeSummary').innerHTML =
    `<strong>${selected}</strong> of ${total} matched row${total === 1 ? '' : 's'} selected to write. ` +
    `<strong>${unmatched}</strong> unmatched, <strong>${ambiguous}</strong> ambiguous (always skipped).`;
  $('btnWrite').disabled = selected === 0;
}

export function setVisibleSelection(value) {
  const visible = state.filter === 'all'
    ? state.matches
    : state.matches.filter(m => m.kind === state.filter);
  for (const m of visible) {
    if (m.kind === 'match') m.selected = value;
  }
  renderPreview();
}
