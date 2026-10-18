import request from 'supertest';
import { app } from './helpers/http';

describe('CORS and Security Headers', () => {
  it('allows requests from apex growthtechnos.com origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://growthtechnos.com')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe('https://growthtechnos.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('allows requests from www.growthtechnos.com origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://www.growthtechnos.com')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe('https://www.growthtechnos.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('allows requests from Vercel preview deployments', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://growth-technos-smart.vercel.app')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe('https://growth-technos-smart.vercel.app');
  });

  it('handles OPTIONS preflight requests properly with 204 status', async () => {
    const res = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'https://growthtechnos.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization,X-Request-Id,Cache-Control')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('https://growthtechnos.com');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });

  it('sets Cross-Origin-Resource-Policy to cross-origin', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('does not set access-control-allow-origin for unauthorized origins', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://unauthorized-domain.com')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
