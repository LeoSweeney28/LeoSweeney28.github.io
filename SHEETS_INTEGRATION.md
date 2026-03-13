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

    // Write header if empty
    if (sheet.getLastRow() === 0) sheet.appendRow(cols);

    entries.forEach(ent => {
      const row = cols.map(c => {
        const v = ent[c];
        if (Array.isArray(v)) return v.join('|');
        if (typeof v === 'boolean') return v ? 1 : 0;
        return v === undefined || v === null ? '' : String(v);
      });
      sheet.appendRow(row);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', count: entries.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

Deployment steps

1. In the Apps Script editor, go to Deploy → New deployment.
2. Choose "Web app".
3. For "Execute as" choose "Me" (your account). For "Who has access" choose "Anyone" or "Anyone, even anonymous" depending on your needs and Apps Script account settings.
4. Deploy and copy the Web app URL.
5. Paste that URL into the `Google Sheets webhook URL` field in the app UI and click "Push to Sheet".

Notes & Security

- Allowing "Anyone, even anonymous" makes the endpoint public. If you want more security, you can:
  - Deploy with access limited to your Google account and use an Apps Script client-side OAuth flow (more complex).
  - Add a simple secret key: have the web app check a token in the POST body before accepting writes.
- The sample script appends rows and does not deduplicate entries. If you push the same DB multiple times you'll get duplicates.

If you want, I can:
- Add a small UI field for a secret token and send it with the POST body.
- Add a "Push latest entry" button rather than sending all entries.
- Add deduplication logic to the Apps Script sample.

