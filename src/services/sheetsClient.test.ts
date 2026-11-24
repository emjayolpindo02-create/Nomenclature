import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkSheetsConnection,
  computeRetryDelayMs,
  formatResultDateTimeParts,
  formatSecretCharsLabel,
  isSheetsConfigured,
  isValidAppsScriptExecUrl,
  sendResult,
  sendResultsBatch,
} from './sheetsClient';

describe('sheetsClient (Google Sheets sync without Firebase)', () => {
  it('formats secret length labels without exposing the secret', () => {
    assert.equal(formatSecretCharsLabel(''), 'Not set');
    assert.equal(formatSecretCharsLabel('PASTE_YOUR_SECRET_HERE'), 'Not set');
    assert.equal(formatSecretCharsLabel('abc'), '3 chars');
    assert.equal(formatSecretCharsLabel('SnlpOzKu8JRizDahIgcn7oUF7'), '25 chars (S...7)');
  });

  it('handles empty VITE_APPS_SCRIPT_URL and VITE_APPS_SCRIPT_SECRET gracefully without crashing', async () => {
    assert.equal(isSheetsConfigured('', ''), false);
    const conn = await checkSheetsConnection('', '');
    assert.equal(conn.ok, false);
    assert.equal(conn.configured, false);
    assert.equal(conn.status, 'unconfigured');

    const res = await sendResult(
      {
        resultId: 'r1',
        name: 'Maria Santos',
        section: '3F',
        topicId: 'ionic-compounds',
        topic: 'Ionic Compounds',
        score: 85,
        correctCount: 10,
        totalQuestions: 12,
        passed: 'yes',
        date: '2026-11-24',
        time: '10:00:00',
        dateTime: '2026-11-24 10:00:00',
      },
      { url: '', secret: '' }
    );
    assert.equal(res.ok, false);
    assert.equal(res.unconfigured, true);
  });

  it('validates /exec URLs and pings Apps Script with text/plain JSON', async () => {
    assert.equal(
      isValidAppsScriptExecUrl('https://script.google.com/macros/s/abc123/exec'),
      true
    );
    assert.equal(isValidAppsScriptExecUrl('https://example.com/test'), false);

    let capturedContentType = '';
    let capturedBody = '';
    const mockFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      capturedContentType = headers['Content-Type'];
      capturedBody = String(init?.body || '');
      return new Response(JSON.stringify({ ok: true, secretMatches: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const conn = await checkSheetsConnection(
      'https://script.google.com/macros/s/abc123/exec',
      'secret1234',
      mockFetch
    );
    assert.equal(conn.ok, true);
    assert.equal(conn.status, 'connected');
    assert.equal(capturedContentType, 'text/plain;charset=utf-8');
    assert.equal(JSON.parse(capturedBody).action, 'ping');
  });

  it('sends topic completion result payload and handles failures safely', async () => {
    let sentPayload: Record<string, unknown> = {};
    const okFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      sentPayload = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      return new Response(JSON.stringify({ ok: true, updated: true }), { status: 200 });
    }) as typeof fetch;

    const okRes = await sendResult(
      {
        resultId: 'r-2',
        name: 'Juan Cruz',
        section: '3F',
        topicId: 'ionic-compounds',
        topic: 'Ionic Compounds',
        score: 90,
        correctCount: 9,
        totalQuestions: 10,
        passed: 'yes',
        date: '2026-11-24',
        time: '14:15:00',
        dateTime: '2026-11-24 14:15:00',
      },
      {
        url: 'https://script.google.com/macros/s/abc123/exec',
        secret: 'secret1234',
        fetchImpl: okFetch,
      }
    );

    assert.equal(okRes.ok, true);
    assert.equal(okRes.updated, true);
    assert.equal(sentPayload.action, 'saveResult');
    assert.equal((sentPayload.result as Record<string, unknown>).passed, 'yes');

    const failFetch = (async () => {
      throw new Error('Network down');
    }) as unknown as typeof fetch;

    const failRes = await sendResultsBatch(
      [
        {
          queueId: 'q-1',
          name: 'Juan Cruz',
          section: '3F',
          topicId: 'ionic-compounds',
          topic: 'Ionic Compounds',
          score: 90,
          correctCount: 9,
          totalQuestions: 10,
          passed: 'yes',
          date: '2026-11-24',
          time: '14:15:00',
          dateTime: '2026-11-24 14:15:00',
          retryCount: 0,
          nextRetryAtMs: 0,
        },
      ],
      {
        url: 'https://script.google.com/macros/s/abc123/exec',
        secret: 'secret1234',
        fetchImpl: failFetch,
      }
    );
    assert.equal(failRes.ok, false);
    assert.match(failRes.error || '', /Network down/);
  });

  it('computes exponential backoff with jitter and formats Asia/Manila date/time parts', () => {
    const low = computeRetryDelayMs(0, () => 0);
    const high = computeRetryDelayMs(0, () => 0.99);
    assert.equal(low, 3000);
    assert.ok(high > low);
    assert.ok(computeRetryDelayMs(3, () => 0.5) > computeRetryDelayMs(1, () => 0.5));

    // 2026-11-24 06:05:09 UTC = 2026-11-24 14:05:09 Asia/Manila
    const parts = formatResultDateTimeParts(Date.UTC(2026, 10, 24, 6, 5, 9));
    assert.equal(parts.date, '2026-11-24');
    assert.equal(parts.time, '14:05:09');
    assert.equal(parts.dateTime, '2026-11-24 14:05:09');
  });
});
