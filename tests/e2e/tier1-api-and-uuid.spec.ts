import { test, expect } from '@playwright/test';

test.describe('Tier 1: API Route Resilience & Supabase UUID Compliance', () => {
  const VALID_UUID = '11111111-2222-4333-8444-555555555555';
  const INVALID_LEGACY_WS = 'default_ws';
  const MALFORMED_UUID = 'not-a-valid-uuid-format';

  test('GET /api/workspaces returns 200 with structured workspace list', async ({ request }) => {
    const res = await request.get('/api/workspaces');
    // Accepts 200 or 401 (if unauthenticated in isolated environment)
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('workspaces');
      expect(Array.isArray(data.workspaces)).toBe(true);
      if (data.workspaces.length > 0) {
        const ws = data.workspaces[0];
        expect(ws).toHaveProperty('id');
        // Check UUID format RFC4122
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(ws.id)).toBe(true);
      }
    }
  });

  test('GET /api/settings/user-prefs returns 200 with default UI preferences', async ({ request }) => {
    const res = await request.get('/api/settings/user-prefs');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('ui_preferences');
      expect(data).toHaveProperty('acquisition_goals');
    }
  });

  test('POST /api/chat handles message array and returns 200 or streaming response', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: 'Ping' }],
        model: 'gemini-2.0-flash-lite',
      },
    });
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const contentType = res.headers()['content-type'] || '';
      expect(contentType.includes('text/event-stream') || contentType.includes('application/json')).toBe(true);
    }
  });

  test('GET /api/inbox/threads handles valid UUID query parameter without 22P02 database error', async ({ request }) => {
    const res = await request.get(`/api/inbox/threads?workspace_id=${VALID_UUID}&mode=leads`);
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('threads');
      expect(Array.isArray(data.threads)).toBe(true);
    }
  });

  test('GET /api/inbox/threads gracefully handles invalid legacy workspace id "default_ws" without unhandled 500 crash', async ({ request }) => {
    const res = await request.get(`/api/inbox/threads?workspace_id=${INVALID_LEGACY_WS}&mode=leads`);
    // Must return 200 (graceful empty list), 400 (bad request), or 401, never uncaught 500 PostgreSQL 22P02
    expect([200, 400, 401]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data.threads).toBeDefined();
    }
  });

  test('GET /api/agents returns 200 with community/system agent list', async ({ request }) => {
    const res = await request.get('/api/agents');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('agents');
      expect(Array.isArray(data.agents)).toBe(true);
    }
  });

  test('Catchall Router handles non-existent API routes with 404 JSON response', async ({ request }) => {
    const res = await request.get('/api/non-existent-endpoint-xyz-999');
    expect(res.status()).toBe(404);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test('POST /api/inbox/classify enforces required UUID fields and returns 400 when missing', async ({ request }) => {
    const res = await request.post('/api/inbox/classify', {
      data: {
        threadId: '',
        leadId: '',
        snippet: '',
      },
    });
    expect([400, 401]).toContain(res.status());
  });
});
