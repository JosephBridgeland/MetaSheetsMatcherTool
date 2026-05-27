import { GEO, COUNTRY_TO_TAB } from './config.js';
import { normalise } from './utils.js';

// Returns the geo key (e.g. "FR") for a sheet tab name, or null if not a geo tab.
// Uses whole-word boundary matching so "FR" won't fire inside "REFRESH", etc.
export function tabKeyForName(tabName) {
  const upper = tabName.toUpperCase();
  for (const [key, { tabNames }] of Object.entries(GEO)) {
    for (const candidate of tabNames) {
      if (new RegExp(`(?:^|[^A-Z])${candidate}(?:[^A-Z]|$)`).test(upper)) return key;
    }
  }
  return null;
}

// Parses a Meta ad-set name into { publication, articleNum, country }.
// Format: "Brand | Publication - Article N - Topic - Country"
// Handles en/em-dash and pipe as country separators, and strips | V1 suffixes.
export function parseAdSetName(raw) {
  if (!raw) return null;
  let s = raw.replace(/['']/g, "'").replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*\|\s*v\d+\s*$/i, '');        // strip trailing | V1
  s = s.replace(/\s+[–—]\s+/g, ' - ');            // en/em-dash → hyphen-dash
  // The first pipe separates Brand from Publication — preserve it.
  // Any subsequent pipes are country separators — convert to hyphen-dash.
  const firstPipe = s.indexOf('|');
  if (firstPipe !== -1) {
    s = s.slice(0, firstPipe + 1) + s.slice(firstPipe + 1).replace(/\s+\|\s+/g, ' - ');
  }

  const parts = s.split(' - ').map(p => p.trim());
  if (parts.length < 3) return null;

  const pubParts = parts[0].split('|').map(p => p.trim());
  if (pubParts.length < 2) return null;

  let articleNum = null;
  for (const p of parts) {
    const m = p.match(/^article\s+(\d+)$/i);
    if (m) { articleNum = +m[1]; break; }
  }
  if (articleNum === null) return null;

  return { publication: pubParts[1], articleNum, country: parts[parts.length - 1] };
}

// Parses a sheet Publication cell like "TechRadar Pro article 14" or
// "Tom's Guide standard article 9" into { publication, articleNum }.
export function parseSheetPub(raw) {
  const m = normalise(raw).match(/^(.+?)\s+(?:standard\s+)?article\s+(\d+)$/);
  return m ? { publication: m[1].trim(), articleNum: +m[2] } : null;
}

export { COUNTRY_TO_TAB };
