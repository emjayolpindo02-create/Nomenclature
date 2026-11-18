/**
 * I-LAB Google Apps Script Backend
 * 1. Open Google Sheet -> Extensions -> Apps Script, paste this file into Code.gs.
 * 2. Set APP_SECRET on line 14 to match VITE_APPS_SCRIPT_SECRET, then Save.
 * 3. Reload the Sheet -> Teacher Tools -> Setup / Repair Sheets.
 * 4. Add students to Roster -> Teacher Tools -> Hash new PINs.
 * 5. Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone).
 * 6. Set VITE_APPS_SCRIPT_URL to your /exec URL and deploy New version after edits.
 */

// Replace PASTE_YOUR_SECRET_HERE on line 14 and keep it identical to VITE_APPS_SCRIPT_SECRET.
// No Script Properties secret is read; line 14 is the single source of truth in Code.gs.

const APP_SECRET = 'SnlpOzKu8JRizDahIgcn7oUF7';

const TOPICS = [
  { id: 'writing-chemical-formulas', title: 'Writing Chemical Formulas' },
  { id: 'metal-one-oxidation-nonmetal', title: 'Metal with One Oxidation Number + Nonmetal' },
  { id: 'metal-variable-oxidation-nonmetal', title: 'Metal with Variable Oxidation Number + Nonmetal' },
  { id: 'nonmetal-nonmetal', title: 'Nonmetal + Nonmetal' },
  { id: 'hydrogen-halogen-binary-acids', title: 'Hydrogen + Halogen (Binary Acids)' },
  { id: 'metal-one-oxidation-polyatomic', title: 'Metal with One Oxidation Number + Polyatomic Ion' },
  { id: 'metal-variable-oxidation-polyatomic', title: 'Metal with Variable Oxidation Number + Polyatomic Ion' },
  { id: 'hydrogen-polyatomic-ternary-acids', title: 'Hydrogen + Polyatomic Ion (Ternary Acids)' },
  { id: 'final-mixed-review', title: 'Final Mixed Review' },
];

const SHEET_ROSTER = 'Roster';
const SHEET_ATTEMPTS = 'Attempts';
const SHEET_SUMMARY = 'Summary';
const SHEET_ITEMS = 'Item Analysis';
const SHEET_SETTINGS = 'Settings';

function normalizeSecret_(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\r\n]+/g, '').trim();
}

function getAppSecret_() {
  return normalizeSecret_(APP_SECRET);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Teacher Tools')
    .addItem('Setup / Repair Sheets', 'setupSheets')
    .addSeparator()
    .addItem('Hash new PINs', 'hashNewPins')
    .addItem("Reset a student's PIN", 'resetStudentPinPrompt')
    .addItem('Unlock a topic for a student now', 'unlockTopicForStudentPrompt')
    .addItem('Sign out all students', 'signOutAllStudents')
    .addSeparator()
    .addItem('Export CSV', 'exportSummaryCsvDialog')
    .addToUi();
}

function doGet() {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload = JSON.parse(rawBody);

    var action = payload && payload.action ? String(payload.action).trim() : '';
    var receivedSecret = normalizeSecret_(payload ? payload.appSecret : '');
    var expectedSecret = getAppSecret_();
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
        error: 'Unauthorized app key',
        receivedLength: receivedSecret.length,
        expectedLength: expectedSecret.length,
      });
    }

    if (action === 'login') {
      return jsonResponse_(handleLogin_(payload));
    }
    if (action === 'changePin') {
      return jsonResponse_(handleChangePin_(payload));
    }
    if (action === 'saveAttempt') {
      return jsonResponse_(handleSaveAttempt_(payload));
    }
    if (action === 'sync') {
      return jsonResponse_(handleSync_(payload));
    }
    if (action === 'logout') {
      return jsonResponse_(handleLogout_(payload));
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
      // ignore
    }
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function sha256Hex_(input) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
    Utilities.Charset.UTF_8
  );
  return bytes
    .map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    })
    .join('');
}

function generateSalt_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function generateToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function getOfficialDateKey_(dateObj) {
  var tz = Session.getScriptTimeZone() || 'UTC';
  return Utilities.formatDate(dateObj, tz, 'yyyy-MM-dd');
}

function getSettings_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SETTINGS);
  var defaults = {
    passingScore: 70,
    waitingTimeHours: 0,
    inactivityDays: 7,
    cooldownMinutes: 15,
    sessionExpiryDays: 60,
  };
  if (!sheet || sheet.getLastRow() < 2) {
    return defaults;
  }
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < values.length; i++) {
    var key = String(values[i][0] || '').trim();
    var num = Number(values[i][1]);
    if (!isNaN(num) && Object.prototype.hasOwnProperty.call(defaults, key)) {
      defaults[key] = num;
    }
  }
  defaults.passingScore = Math.min(100, Math.max(50, defaults.passingScore));
  defaults.waitingTimeHours = Math.max(0, defaults.waitingTimeHours);
  defaults.inactivityDays = Math.max(1, defaults.inactivityDays);
  defaults.cooldownMinutes = Math.max(1, defaults.cooldownMinutes);
  defaults.sessionExpiryDays = Math.max(1, defaults.sessionExpiryDays);
  return defaults;
}

function findRosterRowByUsername_(sheet, username) {
  var target = String(username || '').trim().toLowerCase();
  if (!target || sheet.getLastRow() < 2) return -1;
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim().toLowerCase() === target) {
      return i + 2;
    }
  }
  return -1;
}

function findRosterRowByToken_(sheet, rawToken) {
  var token = String(rawToken || '').trim();
  if (!token || sheet.getLastRow() < 2) return -1;
  var tokenHash = sha256Hex_(token);
  var vals = sheet.getRange(2, 9, sheet.getLastRow() - 1, 2).getValues();
  var nowMs = Date.now();
  for (var i = 0; i < vals.length; i++) {
    var storedHash = String(vals[i][0] || '').trim();
    var expiresAt = vals[i][1];
    if (storedHash && storedHash === tokenHash) {
      var expMs = expiresAt ? new Date(expiresAt).getTime() : 0;
      if (!expMs || expMs < nowMs) {
        return -2; // expired
      }
      return i + 2;
    }
  }
  return -1;
}

function parseOverrides_(raw) {
  if (!raw) return [];
  var str = String(raw).trim();
  if (!str) return [];
  if (str.charAt(0) === '[') {
    try {
      var arr = JSON.parse(str);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  return str
    .split(',')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

function getStudentProgressFromSummary_(ss, username) {
  var summary = ss.getSheetByName(SHEET_SUMMARY);
  var progressMap = {};
  if (!summary || summary.getLastRow() < 2) return progressMap;

  var rows = summary.getRange(2, 1, summary.getLastRow() - 1, 18).getValues();
  var target = String(username || '').trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim().toLowerCase() === target) {
      var passDates = {};
      try {
        passDates = rows[i][16] ? JSON.parse(String(rows[i][16])) : {};
      } catch (e) {
        passDates = {};
      }
      for (var t = 0; t < TOPICS.length; t++) {
        var topic = TOPICS[t];
        var cellVal = rows[i][3 + t];
        var score = typeof cellVal === 'number' ? cellVal : Number(cellVal);
        var meta = passDates[topic.id] || {};
        if (!isNaN(score) && cellVal !== '' && score >= 0) {
          progressMap[topic.id] = {
            libraryId: topic.id,
            bestScore: score,
            passed: Boolean(meta.passed),
            submitted: true,
            attempts: Number(meta.attempts || 1),
            passedDate: meta.officialPassDate || '',
            officialPassDate: meta.officialPassDate || '',
            passedAt: meta.passedAt || null,
            completedAt: meta.lastSubmittedAt || undefined,
          };
        }
      }
      break;
    }
  }
  return progressMap;
}

function ensureSummaryRow_(ss, username, fullName, section) {
  var summary = ss.getSheetByName(SHEET_SUMMARY);
  var target = String(username || '').trim().toLowerCase();
  if (summary.getLastRow() >= 2) {
    var usernames = summary.getRange(2, 1, summary.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < usernames.length; i++) {
      if (String(usernames[i][0] || '').trim().toLowerCase() === target) {
        return i + 2;
      }
    }
  }
  var newRow = new Array(18).fill('');
  newRow[0] = username;
  newRow[1] = fullName;
  newRow[2] = section;
  newRow[12] = 0;
  newRow[13] = 0;
  newRow[14] = new Date();
  newRow[15] = 'Active';
  newRow[16] = '{}';
  newRow[17] = '';
  summary.appendRow(newRow);
  return summary.getLastRow();
}

function handleLogin_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  if (!roster) {
    return { ok: false, error: 'Sheet is not initialized. Ask teacher to run Setup Sheets.' };
  }

  var username = String(payload.username || '').trim();
  var pin = String(payload.pin || '').trim();
  if (!username || !pin) {
    return { ok: false, error: 'Username and PIN are required.' };
  }

  var rowIdx = findRosterRowByUsername_(roster, username);
  if (rowIdx < 2) {
    return { ok: false, error: 'Invalid username or PIN.' };
  }

  var settings = getSettings_();
  var row = roster.getRange(rowIdx, 1, 1, 13).getValues()[0];
  var actualUsername = String(row[0] || '').trim();
  var fullName = String(row[1] || actualUsername).trim();
  var section = String(row[2] || '').trim();
  var storedHash = String(row[3] || '').trim();
  var salt = String(row[4] || '').trim();
  var mustChangePin = row[5] === true || String(row[5]).toUpperCase() === 'TRUE';
  var failedAttempts = Number(row[6] || 0);
  var lockedUntilVal = row[7];

  var now = new Date();
  var nowMs = now.getTime();
  if (lockedUntilVal) {
    var lockMs = new Date(lockedUntilVal).getTime();
    if (!isNaN(lockMs) && lockMs > nowMs) {
      var remainingMins = Math.ceil((lockMs - nowMs) / 60000);
      return {
        ok: false,
        locked: true,
        remainingMinutes: remainingMins,
        error: 'Too many wrong PIN attempts. Try again in ' + remainingMins + ' minute(s).',
      };
    }
  }

  // Verify hashed PIN (or plaintext if teacher forgot to run Hash new PINs? No: require hash or hash lazily? Require SHA-256 hash when salt exists)
  var pinMatches = false;
  if (salt && /^[a-f0-9]{64}$/i.test(storedHash)) {
    pinMatches = sha256Hex_(salt + ':' + pin) === storedHash;
  } else if (!salt && storedHash && storedHash === pin) {
    // Auto-upgrade unhashed plaintext PIN cleanly on first verified login
    var newSalt = generateSalt_();
    storedHash = sha256Hex_(newSalt + ':' + pin);
    roster.getRange(rowIdx, 4, 1, 2).setValues([[storedHash, newSalt]]);
    pinMatches = true;
  }

  if (!pinMatches) {
    failedAttempts += 1;
    if (failedAttempts >= 5) {
      var lockUntilDate = new Date(nowMs + settings.cooldownMinutes * 60000);
      roster.getRange(rowIdx, 7, 1, 2).setValues([[failedAttempts, lockUntilDate]]);
      roster.getRange(rowIdx, 13).setValue('Locked Out');
      return {
        ok: false,
        locked: true,
        remainingMinutes: settings.cooldownMinutes,
        error:
          'Too many wrong PIN attempts. Account paused for ' +
          settings.cooldownMinutes +
          ' minutes.',
      };
    }
    roster.getRange(rowIdx, 7).setValue(failedAttempts);
    return {
      ok: false,
      remainingTries: 5 - failedAttempts,
      error: 'Incorrect username or PIN (' + (5 - failedAttempts) + ' attempt(s) left).',
    };
  }

  var rawToken = generateToken_();
  var tokenHash = sha256Hex_(rawToken);
  var expiresAt = new Date(nowMs + settings.sessionExpiryDays * 86400000);

  roster.getRange(rowIdx, 7, 1, 4).setValues([[0, '', tokenHash, expiresAt]]);
  roster.getRange(rowIdx, 12, 1, 2).setValues([[now, 'Active']]);

  var summaryRow = ensureSummaryRow_(ss, actualUsername, fullName, section);
  var summarySheet = ss.getSheetByName(SHEET_SUMMARY);
  summarySheet.getRange(summaryRow, 15, 1, 2).setValues([[now, 'Active']]);

  var unlockOverrides = parseOverrides_(row[10]);
  var progressMap = getStudentProgressFromSummary_(ss, actualUsername);

  return {
    ok: true,
    sessionToken: rawToken,
    tokenExpiresAt: expiresAt.toISOString(),
    user: {
      username: actualUsername,
      fullName: fullName,
      section: section,
      mustChangePin: mustChangePin,
    },
    progressMap: progressMap,
    unlockOverrides: unlockOverrides,
    settings: settings,
    serverNowIso: now.toISOString(),
    serverDateKey: getOfficialDateKey_(now),
  };
}

function handleChangePin_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  var rowIdx = findRosterRowByToken_(roster, payload.sessionToken);
  if (rowIdx === -2) {
    return { ok: false, sessionExpired: true, error: 'Session expired. Please sign in again.' };
  }
  if (rowIdx < 2) {
    return { ok: false, sessionExpired: true, error: 'Invalid session. Please sign in again.' };
  }

  var currentPin = String(payload.currentPin || '').trim();
  var newPin = String(payload.newPin || '').trim();
  if (!/^\d{4,8}$/.test(newPin)) {
    return { ok: false, error: 'New PIN must be 4 to 8 digits.' };
  }

  var row = roster.getRange(rowIdx, 1, 1, 6).getValues()[0];
  var storedHash = String(row[3] || '').trim();
  var salt = String(row[4] || '').trim();
  if (!salt || sha256Hex_(salt + ':' + currentPin) !== storedHash) {
    return { ok: false, error: 'Current PIN is incorrect.' };
  }

  var settings = getSettings_();
  var now = new Date();
  var nextSalt = generateSalt_();
  var nextHash = sha256Hex_(nextSalt + ':' + newPin);
  var newToken = generateToken_();
  var newTokenHash = sha256Hex_(newToken);
  var expiresAt = new Date(now.getTime() + settings.sessionExpiryDays * 86400000);

  roster.getRange(rowIdx, 4, 1, 3).setValues([[nextHash, nextSalt, false]]);
  roster.getRange(rowIdx, 9, 1, 2).setValues([[newTokenHash, expiresAt]]);
  roster.getRange(rowIdx, 12).setValue(now);

  return {
    ok: true,
    sessionToken: newToken,
    tokenExpiresAt: expiresAt.toISOString(),
    mustChangePin: false,
    serverNowIso: now.toISOString(),
    serverDateKey: getOfficialDateKey_(now),
  };
}

function handleSaveAttempt_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  var attemptsSheet = ss.getSheetByName(SHEET_ATTEMPTS);
  var summarySheet = ss.getSheetByName(SHEET_SUMMARY);
  var itemsSheet = ss.getSheetByName(SHEET_ITEMS);

  var rowIdx = findRosterRowByToken_(roster, payload.sessionToken);
  if (rowIdx === -2) {
    return { ok: false, sessionExpired: true, error: 'Session expired. Please sign in again.' };
  }
  if (rowIdx < 2) {
    return { ok: false, sessionExpired: true, error: 'Invalid session. Please sign in again.' };
  }

  var attempt = payload.attempt || {};
  var attemptId = String(attempt.attemptId || '').trim();
  var libraryId = String(attempt.libraryId || '').trim();
  var topicObj = null;
  for (var t = 0; t < TOPICS.length; t++) {
    if (TOPICS[t].id === libraryId) {
      topicObj = TOPICS[t];
      break;
    }
  }
  if (!attemptId || !topicObj) {
    return { ok: false, error: 'Invalid practice topic or attempt ID.' };
  }

  var row = roster.getRange(rowIdx, 1, 1, 13).getValues()[0];
  var username = String(row[0] || '').trim();
  var fullName = String(row[1] || username).trim();
  var section = String(row[2] || '').trim();
  var unlockOverrides = parseOverrides_(row[10]);
  var settings = getSettings_();
  var now = new Date();
  var officialDateKey = getOfficialDateKey_(now);

  // Deduplicate by Attempt ID
  if (attemptsSheet.getLastRow() >= 2) {
    var existingRows = attemptsSheet
      .getRange(2, 1, attemptsSheet.getLastRow() - 1, 3)
      .getValues();
    for (var i = 0; i < existingRows.length; i++) {
      if (String(existingRows[i][0] || '').trim() === attemptId) {
        var existingProgress = getStudentProgressFromSummary_(ss, username);
        var existingTopicProg = existingProgress[libraryId];
        return {
          ok: true,
          duplicate: true,
          attemptId: attemptId,
          officialPassDate:
            (existingTopicProg && existingTopicProg.officialPassDate) ||
            String(existingRows[i][2] || officialDateKey),
          serverNowIso: now.toISOString(),
          serverDateKey: officialDateKey,
          progressMap: existingProgress,
          unlockOverrides: unlockOverrides,
          settings: settings,
        };
      }
    }
  }

  var scorePercent = Math.min(100, Math.max(0, Math.round(Number(attempt.scorePercent || 0))));
  var correctCount = Math.max(0, Math.round(Number(attempt.correctCount || 0)));
  var totalQuestions = Math.max(1, Math.round(Number(attempt.totalQuestions || 10)));
  var passed = scorePercent >= settings.passingScore;
  var missedIds = Array.isArray(attempt.missedQuestionIds) ? attempt.missedQuestionIds : [];
  var sourceLabel = attempt.wasQueuedOffline ? 'Offline Queue' : 'Live';

  attemptsSheet.appendRow([
    attemptId,
    now,
    officialDateKey,
    username,
    fullName,
    section,
    topicObj.id,
    topicObj.title,
    scorePercent,
    correctCount,
    totalQuestions,
    passed ? 'YES' : 'NO',
    missedIds.join(', '),
    sourceLabel,
  ]);

  // Update Summary row
  var summaryRow = ensureSummaryRow_(ss, username, fullName, section);
  var summaryVals = summarySheet.getRange(summaryRow, 1, 1, 18).getValues()[0];
  var passDates = {};
  try {
    passDates = summaryVals[16] ? JSON.parse(String(summaryVals[16])) : {};
  } catch (e) {
    passDates = {};
  }

  var topicIdx = -1;
  for (var idx = 0; idx < TOPICS.length; idx++) {
    if (TOPICS[idx].id === libraryId) {
      topicIdx = idx;
      break;
    }
  }

  var prevTopicMeta = passDates[libraryId] || {};
  var alreadyPassed = Boolean(prevTopicMeta.passed);
  var officialPassDate = alreadyPassed
    ? prevTopicMeta.officialPassDate || officialDateKey
    : passed
    ? officialDateKey
    : '';
  var passedAtIso = alreadyPassed
    ? prevTopicMeta.passedAt || now.toISOString()
    : passed
    ? now.toISOString()
    : null;

  var prevBestCell = Number(summaryVals[3 + topicIdx]);
  var prevBest = isNaN(prevBestCell) || summaryVals[3 + topicIdx] === '' ? 0 : prevBestCell;
  var nextBest = Math.max(prevBest, scorePercent);

  summaryVals[3 + topicIdx] = nextBest;
  passDates[libraryId] = {
    passed: alreadyPassed || passed,
    attempts: Number(prevTopicMeta.attempts || 0) + 1,
    officialPassDate: officialPassDate,
    passedAt: passedAtIso,
    lastSubmittedAt: now.toISOString(),
  };

  // Recompute Topics Passed & Average Best Score
  var passedCount = 0;
  var scoreSum = 0;
  var attemptedTopics = 0;
  for (var k = 0; k < TOPICS.length; k++) {
    var tid = TOPICS[k].id;
    var val = summaryVals[3 + k];
    var numVal = typeof val === 'number' ? val : Number(val);
    if (val !== '' && !isNaN(numVal)) {
      attemptedTopics += 1;
      scoreSum += numVal;
    }
    if (passDates[tid] && passDates[tid].passed) {
      passedCount += 1;
    }
  }

  var avgScore = attemptedTopics > 0 ? Math.round(scoreSum / attemptedTopics) : 0;
  var statusLabel = passedCount >= TOPICS.length ? 'Mastered' : 'Active';

  summaryVals[1] = fullName;
  summaryVals[2] = section;
  summaryVals[12] = passedCount;
  summaryVals[13] = avgScore;
  summaryVals[14] = now;
  summaryVals[15] = statusLabel;
  summaryVals[16] = JSON.stringify(passDates);
  summaryVals[17] = unlockOverrides.join(', ');

  summarySheet.getRange(summaryRow, 1, 1, 18).setValues([summaryVals]);
  roster.getRange(rowIdx, 12, 1, 2).setValues([[now, statusLabel]]);

  // Update Item Analysis for attempted questions
  var allQuestionIds = Array.isArray(attempt.questionIds) ? attempt.questionIds : missedIds;
  updateItemAnalysis_(itemsSheet, topicObj, allQuestionIds, missedIds, now);

  var updatedProgress = getStudentProgressFromSummary_(ss, username);

  return {
    ok: true,
    attemptId: attemptId,
    officialPassDate: officialPassDate,
    serverNowIso: now.toISOString(),
    serverDateKey: officialDateKey,
    progressMap: updatedProgress,
    unlockOverrides: unlockOverrides,
    settings: settings,
  };
}

function updateItemAnalysis_(itemsSheet, topicObj, allQuestionIds, missedIds, now) {
  if (!itemsSheet || !allQuestionIds || allQuestionIds.length === 0) return;

  var missedSet = {};
  for (var m = 0; m < missedIds.length; m++) {
    missedSet[String(missedIds[m]).trim()] = true;
  }

  var existingMap = {};
  var lastRow = itemsSheet.getLastRow();
  var rows = lastRow >= 2 ? itemsSheet.getRange(2, 1, lastRow - 1, 7).getValues() : [];
  for (var r = 0; r < rows.length; r++) {
    var qid = String(rows[r][0] || '').trim();
    if (qid) existingMap[qid] = r;
  }

  for (var q = 0; q < allQuestionIds.length; q++) {
    var id = String(allQuestionIds[q] || '').trim();
    if (!id) continue;
    var wasMissed = Boolean(missedSet[id]);
    if (Object.prototype.hasOwnProperty.call(existingMap, id)) {
      var idx = existingMap[id];
      var totalAtt = Number(rows[idx][3] || 0) + 1;
      var timesMissed = Number(rows[idx][4] || 0) + (wasMissed ? 1 : 0);
      var missRate = Math.round((timesMissed / totalAtt) * 100);
      rows[idx][1] = topicObj.id;
      rows[idx][2] = topicObj.title;
      rows[idx][3] = totalAtt;
      rows[idx][4] = timesMissed;
      rows[idx][5] = missRate;
      if (wasMissed) rows[idx][6] = now;
    } else {
      var initialMissed = wasMissed ? 1 : 0;
      rows.push([
        id,
        topicObj.id,
        topicObj.title,
        1,
        initialMissed,
        wasMissed ? 100 : 0,
        wasMissed ? now : '',
      ]);
      existingMap[id] = rows.length - 1;
    }
  }

  // Sort most-missed questions to the top
  rows.sort(function (a, b) {
    return Number(b[4] || 0) - Number(a[4] || 0) || Number(b[5] || 0) - Number(a[5] || 0);
  });

  if (rows.length > 0) {
    itemsSheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }
}

function handleSync_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  var rowIdx = findRosterRowByToken_(roster, payload.sessionToken);
  if (rowIdx === -2) {
    return { ok: false, sessionExpired: true, error: 'Session expired. Please sign in again.' };
  }
  if (rowIdx < 2) {
    return { ok: false, sessionExpired: true, error: 'Invalid session. Please sign in again.' };
  }

  var row = roster.getRange(rowIdx, 1, 1, 13).getValues()[0];
  var username = String(row[0] || '').trim();
  var fullName = String(row[1] || username).trim();
  var section = String(row[2] || '').trim();
  var mustChangePin = row[5] === true || String(row[5]).toUpperCase() === 'TRUE';
  var unlockOverrides = parseOverrides_(row[10]);
  var settings = getSettings_();
  var now = new Date();

  roster.getRange(rowIdx, 12).setValue(now);

  return {
    ok: true,
    user: {
      username: username,
      fullName: fullName,
      section: section,
      mustChangePin: mustChangePin,
    },
    progressMap: getStudentProgressFromSummary_(ss, username),
    unlockOverrides: unlockOverrides,
    settings: settings,
    serverNowIso: now.toISOString(),
    serverDateKey: getOfficialDateKey_(now),
  };
}

function handleLogout_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  var rowIdx = findRosterRowByToken_(roster, payload.sessionToken);
  if (rowIdx >= 2) {
    roster.getRange(rowIdx, 9, 1, 2).setValues([['', '']]);
  }
  return { ok: true };
}

/* ==================== TEACHER TOOLS MENU ACTIONS ==================== */

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var roster = ensureSheetHeaders_(ss, SHEET_ROSTER, [
    'Username',
    'Full Name',
    'Section',
    'PIN Hash',
    'PIN Salt',
    'Must Change PIN',
    'Failed Attempts',
    'Locked Until',
    'Session Token',
    'Token Expires At',
    'Unlocked Topics',
    'Last Active',
    'Status',
  ]);
  roster.setFrozenRows(1);

  var attempts = ensureSheetHeaders_(ss, SHEET_ATTEMPTS, [
    'Attempt ID',
    'Official Timestamp',
    'Official Date',
    'Username',
    'Full Name',
    'Section',
    'Topic ID',
    'Topic Title',
    'Score %',
    'Correct',
    'Total',
    'Passed',
    'Missed Question IDs',
    'Synced From',
  ]);
  attempts.setFrozenRows(1);

  var summaryHeaders = [
    'Username',
    'Full Name',
    'Section',
  ]
    .concat(
      TOPICS.map(function (t) {
        return t.title;
      })
    )
    .concat([
      'Topics Passed',
      'Average Best Score %',
      'Last Active',
      'Status',
      'Pass Dates JSON',
      'Unlocked Overrides',
    ]);
  var summary = ensureSheetHeaders_(ss, SHEET_SUMMARY, summaryHeaders);
  summary.setFrozenRows(1);

  var items = ensureSheetHeaders_(ss, SHEET_ITEMS, [
    'Question ID',
    'Topic ID',
    'Topic Title',
    'Total Attempts',
    'Times Missed',
    'Miss Rate %',
    'Last Missed At',
  ]);
  items.setFrozenRows(1);

  var settingsSheet = ensureSheetHeaders_(ss, SHEET_SETTINGS, [
    'Setting',
    'Value',
    'Description',
  ]);
  settingsSheet.setFrozenRows(1);

  if (settingsSheet.getLastRow() < 2) {
    settingsSheet.getRange(2, 1, 5, 3).setValues([
      ['passingScore', 70, 'Minimum percentage score required to pass each practice (50-100)'],
      ['waitingTimeHours', 0, 'Minimum hours wait after passing (0 = opens next calendar day at 00:00)'],
      ['inactivityDays', 7, 'Days without activity before flagging inactivity'],
      ['cooldownMinutes', 15, 'Cooldown minutes after 5 incorrect PIN attempts'],
      ['sessionExpiryDays', 60, 'Days before saved student session tokens expire'],
    ]);
  }

  applyConditionalFormatting_(summary, items);
  SpreadsheetApp.getUi().alert('I-LAB sheets, headers, and conditional colors are ready.');
}

function ensureSheetHeaders_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  return sheet;
}

function applyConditionalFormatting_(summary, items) {
  var scoreRange = summary.getRange('D2:L500');
  var statusRange = summary.getRange('P2:P500');

  summary.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(70)
      .setBackground('#d1fae5')
      .setFontColor('#065f46')
      .setRanges([scoreRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(1, 69)
      .setBackground('#fef3c7')
      .setFontColor('#92400e')
      .setRanges([scoreRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Mastered')
      .setBackground('#d1fae5')
      .setFontColor('#065f46')
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Active')
      .setBackground('#e0f2fe')
      .setFontColor('#075985')
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Locked Out')
      .setBackground('#fee2e2')
      .setFontColor('#991b1b')
      .setRanges([statusRange])
      .build(),
  ]);

  var missRange = items.getRange('F2:F500');
  items.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(50)
      .setBackground('#fee2e2')
      .setFontColor('#991b1b')
      .setRanges([missRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(25, 49)
      .setBackground('#fef3c7')
      .setFontColor('#92400e')
      .setRanges([missRange])
      .build(),
  ]);
}

function hashNewPins() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  if (!roster || roster.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No student rows found in Roster.');
    return;
  }

  var range = roster.getRange(2, 1, roster.getLastRow() - 1, 5);
  var values = range.getValues();
  var updatedCount = 0;

  for (var i = 0; i < values.length; i++) {
    var username = String(values[i][0] || '').trim();
    var rawPin = String(values[i][3] || '').trim();
    var existingSalt = String(values[i][4] || '').trim();
    var alreadyHashed = existingSalt && /^[a-f0-9]{64}$/i.test(rawPin);

    if (username && rawPin && !alreadyHashed) {
      var salt = generateSalt_();
      values[i][3] = sha256Hex_(salt + ':' + rawPin);
      values[i][4] = salt;
      updatedCount += 1;
    }
  }

  if (updatedCount > 0) {
    range.setValues(values);
  }
  SpreadsheetApp.getUi().alert('Hashed ' + updatedCount + ' new plaintext PIN(s).');
}

function resetStudentPinPrompt() {
  var ui = SpreadsheetApp.getUi();
  var userResp = ui.prompt("Reset Student PIN", 'Enter the student Username:', ui.ButtonSet.OK_CANCEL);
  if (userResp.getSelectedButton() !== ui.Button.OK) return;
  var username = userResp.getResponseText().trim();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  var rowIdx = findRosterRowByUsername_(roster, username);
  if (rowIdx < 2) {
    ui.alert('Student "' + username + '" not found in Roster.');
    return;
  }

  var pinResp = ui.prompt(
    'Temporary PIN',
    'Enter a new temporary 4-8 digit PIN for ' + username + ':',
    ui.ButtonSet.OK_CANCEL
  );
  if (pinResp.getSelectedButton() !== ui.Button.OK) return;
  var tempPin = pinResp.getResponseText().trim();
  if (!/^\d{4,8}$/.test(tempPin)) {
    ui.alert('PIN must be 4 to 8 digits.');
    return;
  }

  var salt = generateSalt_();
  var hash = sha256Hex_(salt + ':' + tempPin);
  roster.getRange(rowIdx, 4, 1, 7).setValues([[hash, salt, true, 0, '', '', '']]);
  roster.getRange(rowIdx, 13).setValue('PIN Reset');
  ui.alert('Temporary PIN set for ' + username + '. They will be prompted to pick a new PIN on login.');
}

function unlockTopicForStudentPrompt() {
  var ui = SpreadsheetApp.getUi();
  var userResp = ui.prompt(
    'Unlock Topic Now',
    'Enter student Username:',
    ui.ButtonSet.OK_CANCEL
  );
  if (userResp.getSelectedButton() !== ui.Button.OK) return;
  var username = userResp.getResponseText().trim();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  var rowIdx = findRosterRowByUsername_(roster, username);
  if (rowIdx < 2) {
    ui.alert('Student "' + username + '" not found in Roster.');
    return;
  }

  var listText = TOPICS.map(function (t, i) {
    return i + 1 + '. ' + t.title;
  }).join('\n');

  var topicResp = ui.prompt(
    'Choose Topic Number (1-' + TOPICS.length + ')',
    listText,
    ui.ButtonSet.OK_CANCEL
  );
  if (topicResp.getSelectedButton() !== ui.Button.OK) return;
  var num = Number(topicResp.getResponseText().trim());
  if (isNaN(num) || num < 1 || num > TOPICS.length) {
    ui.alert('Invalid topic number.');
    return;
  }

  var chosen = TOPICS[num - 1];
  var existingOverrides = parseOverrides_(roster.getRange(rowIdx, 11).getValue());
  if (existingOverrides.indexOf(chosen.id) === -1) {
    existingOverrides.push(chosen.id);
  }
  roster.getRange(rowIdx, 11).setValue(existingOverrides.join(', '));

  var summary = ss.getSheetByName(SHEET_SUMMARY);
  var fullName = String(roster.getRange(rowIdx, 2).getValue() || username);
  var section = String(roster.getRange(rowIdx, 3).getValue() || '');
  var summaryRow = ensureSummaryRow_(ss, username, fullName, section);
  summary.getRange(summaryRow, 18).setValue(existingOverrides.join(', '));

  ui.alert('Unlocked "' + chosen.title + '" immediately for ' + username + '.');
}

function signOutAllStudents() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = ss.getSheetByName(SHEET_ROSTER);
  if (!roster || roster.getLastRow() < 2) return;
  var count = roster.getLastRow() - 1;
  var blanks = [];
  for (var i = 0; i < count; i++) {
    blanks.push(['', '']);
  }
  roster.getRange(2, 9, count, 2).setValues(blanks);
  SpreadsheetApp.getUi().alert('Signed out all ' + count + ' student sessions.');
}

function exportSummaryCsvDialog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summary = ss.getSheetByName(SHEET_SUMMARY);
  if (!summary || summary.getLastRow() < 1) {
    SpreadsheetApp.getUi().alert('Summary sheet is empty.');
    return;
  }

  var data = summary.getRange(1, 1, summary.getLastRow(), 16).getValues();
  var csvLines = data.map(function (row) {
    return row
      .map(function (cell) {
        var str = cell instanceof Date ? Utilities.formatDate(cell, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd HH:mm') : String(cell);
        if (/[",\n\r]/.test(str)) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      })
      .join(',');
  });

  var csvText = csvLines.join('\n');
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:8px;">' +
      '<p style="font-size:13px;margin-top:0;">Click below to download the class summary CSV:</p>' +
      '<a id="dl" download="ilab-class-summary.csv" style="display:inline-block;padding:8px 14px;background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Download CSV</a>' +
      '<script>var csv=' +
      JSON.stringify(csvText) +
      ';var blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});document.getElementById("dl").href=URL.createObjectURL(blob);</script>' +
      '</div>'
  )
    .setWidth(320)
    .setHeight(120);
  SpreadsheetApp.getUi().showModalDialog(html, 'Export Class Summary CSV');
}
