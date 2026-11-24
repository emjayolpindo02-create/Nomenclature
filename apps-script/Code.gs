/**
 * I-LAB Chemical Nomenclature — Google Apps Script Backend
 *
 * SETUP:
 * 1. Create or open a Google Sheet and go to Extensions -> Apps Script.
 * 2. Paste this entire file into Code.gs.
 * 3. Replace 'PASTE_YOUR_SECRET_HERE' on line 14 with a secret string,
 *    matching VITE_APPS_SCRIPT_SECRET in Vercel.
 * 4. Click Save, reload your Google Sheet, and run "I-LAB Results -> Setup Results Sheet".
 * 5. In Apps Script: Deploy -> New deployment -> Web app
 *    (Execute as: Me | Who has access: Anyone).
 * 6. Copy the /exec Web App URL into VITE_APPS_SCRIPT_URL in Vercel and redeploy.
 */

const APP_SECRET = 'PASTE_YOUR_SECRET_HERE';
const RESULTS_SHEET_NAME = 'Results';

function normalizeSecret_(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\r\n]+/g, '').trim();
}

function normalizeKeyPart_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function makeRowKey_(name, section, topic) {
  return [
    normalizeKeyPart_(name),
    normalizeKeyPart_(section),
    normalizeKeyPart_(topic),
  ].join('|');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('I-LAB Results')
    .addItem('Setup Results Sheet', 'setupResultsSheet')
    .addItem('Export Results CSV', 'exportResultsCsvDialog')
    .addToUi();
}

function doGet() {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function ensureResultsSheet_(ss) {
  var sheet = ss.getSheetByName(RESULTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(RESULTS_SHEET_NAME);
  }
  var headers = [
    'Name',
    'Section',
    'Topic',
    'Score %',
    'Passed',
    'Date',
    'Time',
    'Attempts',
    'Best Score %',
  ];
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  var existingHeader = String(sheet.getRange(1, 1).getValue() || '').trim();
  if (existingHeader !== 'Name' || sheet.getLastRow() === 0) {
    headerRange.setValues([headers]);
    headerRange
      .setFontWeight('bold')
      .setBackground('#0f172a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    applyResultFormatting_(sheet);
  }
  return sheet;
}

function applyResultFormatting_(sheet) {
  var passedRange = sheet.getRange('E2:E1000');
  var scoreRange = sheet.getRange('D2:D1000');
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('yes')
      .setBackground('#d1fae5')
      .setFontColor('#065f46')
      .setRanges([passedRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('no')
      .setBackground('#fef3c7')
      .setFontColor('#92400e')
      .setRanges([passedRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(75)
      .setBackground('#d1fae5')
      .setFontColor('#065f46')
      .setRanges([scoreRange])
      .build(),
  ]);
}

function setupResultsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureResultsSheet_(ss);
  SpreadsheetApp.getUi().alert('I-LAB "Results" sheet is ready.');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload = JSON.parse(rawBody);
    var action = payload && payload.action ? String(payload.action).trim() : '';

    var receivedSecret = normalizeSecret_(payload ? payload.appSecret : '');
    var expectedSecret = normalizeSecret_(APP_SECRET);
    var isPlaceholderSecret = expectedSecret === 'PASTE_YOUR_SECRET_HERE';
    var secretMatches =
      !isPlaceholderSecret &&
      expectedSecret.length > 0 &&
      receivedSecret.length > 0 &&
      receivedSecret === expectedSecret;

    if (action === 'ping') {
      return jsonResponse_({
        ok: true,
        secretMatches: secretMatches,
        receivedLength: receivedSecret.length,
        expectedLength: expectedSecret.length,
      });
    }

    if (!secretMatches) {
      return jsonResponse_({
        ok: false,
        error: 'Unauthorized app key.',
        receivedLength: receivedSecret.length,
        expectedLength: expectedSecret.length,
      });
    }

    if (action === 'saveResult') {
      return jsonResponse_(handleSaveResult_(payload));
    }

    return jsonResponse_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : 'Server error processing request.',
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseErr) {
      // ignore lock release failure
    }
  }
}

function handleSaveResult_(payload) {
  var items = [];
  if (Array.isArray(payload.results)) {
    items = payload.results;
  } else if (payload.result && typeof payload.result === 'object') {
    items = [payload.result];
  }

  if (items.length === 0) {
    return { ok: false, error: 'No topic result provided.' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ensureResultsSheet_(ss);

  var lastRow = sheet.getLastRow();
  var colCount = 9;
  var rows =
    lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, colCount).getValues() : [];

  var keyToIndex = {};
  for (var r = 0; r < rows.length; r++) {
    var existingKey = makeRowKey_(rows[r][0], rows[r][1], rows[r][2]);
    if (existingKey !== '||') {
      keyToIndex[existingKey] = r;
    }
  }

  var updatedCount = 0;
  var addedCount = 0;

  for (var i = 0; i < items.length; i++) {
    var item = items[i] || {};
    var name = String(item.name || '').trim();
    var section = String(item.section || '').trim();
    var topic = String(item.topic || '').trim();
    if (!name || !topic) {
      continue;
    }

    var score = Math.min(100, Math.max(0, Math.round(Number(item.score || 0))));
    var passedStr =
      String(item.passed || '').toLowerCase() === 'yes' || score >= 75
        ? 'yes'
        : 'no';
    var dateStr = String(item.date || '').trim();
    var timeStr = String(item.time || '').trim();

    if (!dateStr || !timeStr) {
      var now = new Date();
      var tz = Session.getScriptTimeZone() || 'Asia/Manila';
      if (!dateStr) dateStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
      if (!timeStr) timeStr = Utilities.formatDate(now, tz, 'HH:mm:ss');
    }

    var key = makeRowKey_(name, section, topic);
    if (Object.prototype.hasOwnProperty.call(keyToIndex, key)) {
      var idx = keyToIndex[key];
      var row = rows[idx];
      var prevBest = Number(row[8] !== '' ? row[8] : row[3] || 0);
      var bestScore = isNaN(prevBest) ? score : Math.max(prevBest, score);
      var prevAttempts = Number(row[7] || 1);
      var attempts = isNaN(prevAttempts) ? 1 : prevAttempts + 1;
      var alreadyPassed = String(row[4] || '').toLowerCase() === 'yes';

      row[0] = name;
      row[1] = section;
      row[2] = topic;
      row[3] = score;
      row[4] = alreadyPassed || passedStr === 'yes' ? 'yes' : 'no';
      row[5] = dateStr;
      row[6] = timeStr;
      row[7] = attempts;
      row[8] = bestScore;
      updatedCount += 1;
    } else {
      rows.push([
        name,
        section,
        topic,
        score,
        passedStr,
        dateStr,
        timeStr,
        1,
        score,
      ]);
      keyToIndex[key] = rows.length - 1;
      addedCount += 1;
    }
  }

  // Write all rows back in a single batch call
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, colCount).setValues(rows);
  }

  return {
    ok: true,
    updated: updatedCount > 0,
    added: addedCount > 0,
    updatedCount: updatedCount,
    addedCount: addedCount,
  };
}

function exportResultsCsvDialog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RESULTS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 1) {
    SpreadsheetApp.getUi().alert('Results sheet is empty.');
    return;
  }

  var data = sheet.getRange(1, 1, sheet.getLastRow(), 9).getValues();
  var tz = Session.getScriptTimeZone() || 'Asia/Manila';
  var csvLines = data.map(function (row) {
    return row
      .map(function (cell) {
        var str =
          cell instanceof Date
            ? Utilities.formatDate(cell, tz, 'yyyy-MM-dd HH:mm:ss')
            : String(cell);
        if (/[",\n\r]/.test(str)) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      })
      .join(',');
  });

  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:8px;">' +
      '<p style="font-size:13px;margin-top:0;">Click below to download the Results CSV:</p>' +
      '<a id="dl" download="ilab-results.csv" style="display:inline-block;padding:8px 14px;background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Download CSV</a>' +
      '<script>var csv=' +
      JSON.stringify(csvLines.join('\n')) +
      ';var blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});document.getElementById("dl").href=URL.createObjectURL(blob);</script>' +
      '</div>'
  )
    .setWidth(320)
    .setHeight(120);
  SpreadsheetApp.getUi().showModalDialog(html, 'Export Results CSV');
}
