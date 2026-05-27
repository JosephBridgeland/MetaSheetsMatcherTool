import { state } from './state.js';
import { normalise } from './utils.js';
import { parseSheetPub } from './parser.js';

// Strict: "TechRadar" ≠ "TechRadar Pro".
// Loose (strict=false): strips trailing "pro" — used as fallback when strict finds nothing.
function pubsEqual(a, b, strict = true) {
  const n = s => normalise(s);
  const stripPro = s => n(s).replace(/\s+pro$/, '');
  return strict ? n(a) === n(b) : stripPro(a) === stripPro(b);
}

// Searches tab rows for a matching article number + publication name.
// Tries strict match first; falls back to loose (Pro-suffix tolerance) only if needed.
export function findCandidates(csvRow, tab) {
  for (const strict of [true, false]) {
    const hits = [];
    for (let i = 0; i < tab.rows.length; i++) {
      const cell = (tab.rows[i][tab.pubColIdx] ?? '').trim();
      if (!cell) continue;
      const parsed = parseSheetPub(cell);
      if (!parsed || parsed.articleNum !== csvRow.articleNum) continue;
      if (pubsEqual(csvRow.publication, parsed.publication, strict)) {
        hits.push({ rowIdx: i, absoluteRow: tab.headerRowIndex + i + 2, sheetText: cell });
      }
    }
    if (hits.length > 0) return { hits, fuzzy: !strict };
  }
  return { hits: [], fuzzy: false };
}

// Rebuilds state.matches from state.csvRows + state.sheetData.
// Callers are responsible for calling renderPreview() afterwards.
export function buildMatches() {
  state.matches = state.csvRows.map(csvRow => {
    if (!csvRow.tab) {
      return { kind: 'unmatched', csvRow, reason: `Unknown country "${csvRow.country}"` };
    }
    const tab = state.sheetData[csvRow.tab];
    if (!tab) {
      return { kind: 'unmatched', csvRow, reason: `No sheet tab loaded for ${csvRow.tab}` };
    }
    const { hits, fuzzy } = findCandidates(csvRow, tab);
    if (hits.length === 0) {
      return { kind: 'unmatched', csvRow, reason: `No row in "${tab.tabName}" matches "${csvRow.publication} article ${csvRow.articleNum}"` };
    }
    if (hits.length > 1) {
      return { kind: 'ambiguous', csvRow, tab: csvRow.tab, candidates: hits, fuzzy, selected: false };
    }
    return { kind: 'match', csvRow, tab: csvRow.tab, target: hits[0], fuzzy, selected: true };
  });
}
