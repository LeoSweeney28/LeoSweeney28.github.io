Google Sheets Integration (Apps Script webhook)

Overview

This project includes a small UI where you can paste a Google Apps Script Web App URL (webhook) and push all saved entries (the `DB` array) to that endpoint. The easiest integration is to deploy a simple Apps Script that accepts POSTed JSON and appends rows to a spreadsheet.

Sample Apps Script (Code.gs)

Paste this into a new Apps Script project (Extensions → Apps Script) and replace SPREADSHEET_ID with your sheet's ID or use openByUrl.

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const entries = data.entries || [];
    const ss = SpreadsheetApp.openById('SPREADSHEET_ID'); // or openByUrl
    let sheet = ss.getSheetByName('Sheet1');
    if (!sheet) sheet = ss.insertSheet('Sheet1');

    const cols = ['id','team','match','alliance','scout','autoFuel','autoMissed','autoTower','leftLine','preload','trench','teleFuel','teleMissed','pickups','defense','crossedBump','disabled','climb','fell','failedClimb','parked','foul','driver','reliability','accuracy','estPts','notes'];

    Google Sheets Integration (Apps Script webhook)

    Overview

    This repo includes a small UI where you can paste a Google Apps Script Web App URL (webhook) and push saved entries (the `DB` array) to that endpoint. Below is an improved Apps Script example which supports an optional secret token and deduplicates by entry `id` to avoid duplicate rows.

    Sample Apps Script (Code.gs) — token check + dedupe by `id`

    Paste this into a new Apps Script project (Extensions → Apps Script). Replace SPREADSHEET_ID with your sheet's ID and set EXPECTED_TOKEN to the secret you use in the client (or set it to an empty string to disable token checking).

    ```javascript
    // CONFIG — set these before deploying
    const SPREADSHEET_ID = 'SPREADSHEET_ID';
    const EXPECTED_TOKEN = 'REPLACE_WITH_YOUR_TOKEN'; // set to '' to disable token checking

    function doPost(e) {
      try {
        const data = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
        const token = data.token || '';
        if (EXPECTED_TOKEN && token !== EXPECTED_TOKEN) {
          return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'invalid token' }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        const entries = data.entries || (data.entry ? [data.entry] : []);
        if (!entries.length) {
          return ContentService.createTextOutput(JSON.stringify({ status: 'ok', count: 0 }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName('Sheet1');
        if (!sheet) sheet = ss.insertSheet('Sheet1');

        const cols = ['id','team','match','alliance','scout','autoFuel','autoMissed','autoTower','leftLine','preload','trench','teleFuel','teleMissed','pickups','defense','crossedBump','disabled','climb','fell','failedClimb','parked','foul','driver','reliability','accuracy','estPts','notes'];

        // write header if sheet empty
        if (sheet.getLastRow() === 0) sheet.appendRow(cols);

        // read existing IDs in first column (skip header)
        const lastRow = sheet.getLastRow();
        let existing = new Set();
        if (lastRow > 1) {
          const idRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
          idRange.forEach(r => { if (r && r[0] !== '') existing.add(String(r[0])); });
        }

        let added = 0;
        Google Sheets Integration (Apps Script webhook)

        Overview

        This repo includes a small UI where you can paste a Google Apps Script Web App URL (webhook) and push saved entries (the `DB` array) to that endpoint. Below is an improved Apps Script example which supports an optional secret token and deduplicates by entry `id` to avoid duplicate rows.

        Sample Apps Script (Code.gs) — token check + dedupe by `id`

        Paste this into a new Apps Script project (Extensions → Apps Script). Replace SPREADSHEET_ID with your sheet's ID and set EXPECTED_TOKEN to the secret you use in the client (or set it to an empty string to disable token checking).

        ```javascript
        // CONFIG — set these before deploying
        const SPREADSHEET_ID = 'SPREADSHEET_ID';
        const EXPECTED_TOKEN = 'REPLACE_WITH_YOUR_TOKEN'; // set to '' to disable token checking

        function doPost(e) {
          try {
            const data = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
            const token = data.token || '';
            if (EXPECTED_TOKEN && token !== EXPECTED_TOKEN) {
              return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'invalid token' }))
                .setMimeType(ContentService.MimeType.JSON);
            }

            const entries = data.entries || (data.entry ? [data.entry] : []);
            if (!entries.length) {
              return ContentService.createTextOutput(JSON.stringify({ status: 'ok', count: 0 }))
                .setMimeType(ContentService.MimeType.JSON);
            }

            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            let sheet = ss.getSheetByName('Sheet1');
            if (!sheet) sheet = ss.insertSheet('Sheet1');

            const cols = ['id','team','match','alliance','scout','autoFuel','autoMissed','autoTower','leftLine','preload','trench','teleFuel','teleMissed','pickups','defense','crossedBump','disabled','climb','fell','failedClimb','parked','foul','driver','reliability','accuracy','estPts','notes'];

            // write header if sheet empty
            if (sheet.getLastRow() === 0) sheet.appendRow(cols);

            // read existing IDs in first column (skip header)
            const lastRow = sheet.getLastRow();
            let existing = new Set();
            if (lastRow > 1) {
              const idRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
              idRange.forEach(r => { if (r && r[0] !== '') existing.add(String(r[0])); });
            }

            let added = 0;
            entries.forEach(ent => {
              const id = ent && ent.id ? String(ent.id) : '';
              if (id && existing.has(id)) return; // skip duplicate
              const row = cols.map(c => {
                const v = ent[c];
                if (Array.isArray(v)) return v.join('|');
                if (typeof v === 'boolean') return v ? 1 : 0;
                return v === undefined || v === null ? '' : String(v);
              });
              sheet.appendRow(row);
              if (id) existing.add(id);
              added++;
            });

            return ContentService.createTextOutput(JSON.stringify({ status: 'ok', count: added }))
              .setMimeType(ContentService.MimeType.JSON);
          } catch (err) {
            return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
        ```

        Deployment steps

        1. In the Apps Script editor, go to Deploy → New deployment.
        2. Choose "Web app".
        3. For "Execute as" choose "Me" (your account). For "Who has access" choose "Anyone" or "Anyone, even anonymous" depending on your needs and Apps Script account settings. If you set EXPECTED_TOKEN, you can safely choose a more open access setting because the script enforces the token.
        4. Deploy and copy the Web app URL.
        5. Paste that URL into the `Google Sheets webhook URL` field in the app UI and (optionally) paste the same token into the `Optional Sheets token` field. Use the "Push all" or "Push latest" buttons.

        Troubleshooting & common fixes

        - 400/405/CORS or network errors when calling the web app:
          - Make sure you deployed the script as a Web App and copied the Web App URL (not the project editor URL).
          - If you get CORS/preflight errors, confirm the Web App deployment allows access to anyone (or that your authentication flow is correct). The sample uses a POST with Content-Type: application/json which triggers a preflight; Apps Script web apps normally handle this.
          - Check the browser DevTools Network tab to see the response body and status — the script returns JSON with `message` on errors.

        - "Invalid token" message:
          - Ensure EXPECTED_TOKEN in the Apps Script matches the token you pasted into the `Optional Sheets token` input in the app. If you don't want a token, set EXPECTED_TOKEN to '' in the script and leave the input blank.

        - Empty or missing SPREADSHEET_ID error:
          - Replace SPREADSHEET_ID in the script with the value from your sheet URL (the long ID string). Example: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit

        - The web app returns 403 or requires OAuth consent:
          - In Deploy → New deployment, set "Who has access" appropriately. If you don't want to manage OAuth, choose "Anyone, even anonymous" (note the security tradeoff) or use the token approach.

        - Script errors / logs:
          - In the Apps Script editor, open Executions (left sidebar) to see runtime errors and stack traces.

        If you'd like, I can:
        -+- Add a `sheetsToken` field to the UI that defaults to a random secret and show instructions to set EXPECTED_TOKEN.
        -+- Add dedupe-by-id logic on the client too (to avoid sending duplicates). Currently dedupe is handled server-side in the sample script.
        -+- Add a "last pushed ID" indicator so the client can push only new entries reliably.

