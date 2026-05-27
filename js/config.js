// Geo keys, their CSV country name variants, and sheet tab name fragments.
export const GEO = {
  US: { csv: ['united states', 'united states | v1', 'usa', 'us'], tabNames: ['USA', 'UNITED STATES', 'US'] },
  UK: { csv: ['uk', 'united kingdom'],                              tabNames: ['UK', 'UNITED KINGDOM'] },
  CA: { csv: ['canada', 'ca'],                                      tabNames: ['CANADA', 'CA'] },
  AU: { csv: ['australia', 'au'],                                   tabNames: ['AUSTRALIA', 'AU'] },
  DE: { csv: ['germany', 'de'],                                     tabNames: ['GERMANY', 'DE'] },
  FR: { csv: ['france', 'fr'],                                      tabNames: ['FRANCE', 'FR'] },
};

// "united states" → "US", "canada" → "CA", etc.
export const COUNTRY_TO_TAB = Object.fromEntries(
  Object.entries(GEO).flatMap(([key, { csv }]) => csv.map(v => [v, key]))
);

// Header names we look for in the sheet (lowercased for comparison).
export const REACH_COL_NAMES  = ['social traffic driver reach'];
export const CLICKS_COL_NAMES = ['social traffic driver clicks'];

// localStorage keys for persisting credentials between sessions.
export const LS_CLIENT_KEY = 'mmatcher_client_id';
export const LS_SHEET_KEY  = 'mmatcher_sheet_id';
