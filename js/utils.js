export const $ = id => document.getElementById(id);

export function escHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function fmtNum(n) {
  return (n == null || isNaN(n))
    ? '<span style="color:var(--err)">—</span>'
    : Number(n).toLocaleString();
}

// Converts 0-based column index to spreadsheet letter (A, B, … Z, AA, …).
export function colLetter(idx) {
  let s = '', n = idx;
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

export function normalise(s) {
  return (s ?? '').replace(/['']/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
}

export function logMsg(msg, kind = '') {
  const el = $('log');
  const t  = new Date().toTimeString().slice(0, 8);
  el.innerHTML += `<br><span class="ts">[${t}]</span><span${kind ? ` class="${kind}"` : ''}>${msg}</span>`;
  el.scrollTop  = el.scrollHeight;
}
