import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { COOKIE_NAME } from '../server/middleware/session';

function getCookieStr(res: any): string {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  const first = Array.isArray(raw) ? raw[0] : String(raw);
  return first.split(';')[0];
}

describe('Anonymous Guest Session & Zero-Admin Architecture Tests', () => {
  it('1. Automatically provisions anonymous guest session and sets HttpOnly cookie on first access', async () => {
    const res = await request(app).get('/api/session/current');
    expect(res.status).toBe(200);
    expect(res.body.guest).toBeDefined();
    expect(res.body.guest.id).toBeDefined();
    expect(res.body.guest.isAnonymous).toBe(true);
    expect(res.body.guest.displayName).toBe('Guest User');

    // Confirm healthmate_session HttpOnly cookie is set
    const rawCookies = res.headers['set-cookie'];
    expect(rawCookies).toBeDefined();
    const cookieList = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
    const sessionCookie = cookieList.find((c: string) => c.startsWith(`${COOKIE_NAME}=`));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Path=/');
  });

  it('2. Preserves guest continuity on subsequent requests using the session cookie', async () => {
    // 1st request to establish session
    const firstRes = await request(app).get('/api/session/current');
    const guestId = firstRes.body.guest.id;
    const cookieHeader = getCookieStr(firstRes);

    // 2nd request sending the session cookie
    const secondRes = await request(app)
      .get('/api/session/current')
      .set('Cookie', cookieHeader);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.guest.id).toBe(guestId);
  });

  it('3. Automatically loads guest profile from health_profiles', async () => {
    const sessionRes = await request(app).get('/api/session/current');
    const cookieHeader = getCookieStr(sessionRes);

    const profileRes = await request(app)
      .get('/api/user/profile')
      .set('Cookie', cookieHeader);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.profile).toBeDefined();
    expect(profileRes.body.profile.uid).toBe(sessionRes.body.guest.id);
    expect(profileRes.body.profile.isAnonymous).toBe(true);
  });

  it('4. Updates guest profile and persists in PostgreSQL', async () => {
    const sessionRes = await request(app).get('/api/session/current');
    const cookieHeader = getCookieStr(sessionRes);

    const updateRes = await request(app)
      .post('/api/user/profile')
      .set('Cookie', cookieHeader)
      .send({
        displayName: 'HealthMate Explorer',
        age: 26,
        gender: 'female',
        heightCm: 168,
        weightKg: 62,
        bloodGroup: 'B+',
        dietaryPreference: 'vegetarian'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.profile.displayName).toBe('HealthMate Explorer');
    expect(updateRes.body.profile.heightCm).toBe(168);

    // Verify fetched profile reflects updates
    const verifyRes = await request(app)
      .get('/api/user/profile')
      .set('Cookie', cookieHeader);
    expect(verifyRes.body.profile.displayName).toBe('HealthMate Explorer');
    expect(verifyRes.body.profile.bloodGroup).toBe('B+');
  });

  it('5. Strictly confirms complete removal of admin routes (returns 404)', async () => {
    const sessionRes = await request(app).get('/api/session/current');
    const cookieHeader = getCookieStr(sessionRes);

    // Confirm all former admin routes fail with 404 (removed from codebase)
    const adminCheck1 = await request(app)
      .get('/api/user/admin/status')
      .set('Cookie', cookieHeader);
    expect(adminCheck1.status).toBe(404);

    const adminCheck2 = await request(app)
      .get('/api/admin')
      .set('Cookie', cookieHeader);
    expect(adminCheck2.status).toBe(404);

    const adminCheck3 = await request(app)
      .get('/api/admin/users')
      .set('Cookie', cookieHeader);
    expect(adminCheck3.status).toBe(404);
  });

  it('6. Health check reports PostgreSQL (JSONB embeddings, no pgvector) and Login-Free Guest status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(JSON.stringify(res.body.database)).toContain('PostgreSQL');
    expect(res.body.architecture.vectorExtension).toContain('None required');
    expect(res.body.architecture.authentication).toContain('anonymous guest');
  });
});
