// Single shared mutable state object. All modules read/write this directly.
export const state = {
  csvRows:     [],    // parsed ad-set objects from the Meta CSV
  sheetData:   {},    // { tabKey → tabData } loaded from Google Sheets
  matches:     [],    // proposed match objects built by matcher.js
  accessToken: null,  // Google OAuth access token
  sheetId:     '',    // Google Spreadsheet ID
  filter:      'all', // active filter chip in the preview table
};
