const request = require('supertest');
const { app } = require('../../dist/app');

describe('e2e: app routes', () => {
  test('GET /api/health should return 200', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('서버 연결 성공');
  });

  test('GET /api/unknown should return 404', async () => {
    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('요청한 리소스를 찾을 수 없습니다');
  });

  test('POST /api/auth/logout without auth should return 401', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('로그인이 필요합니다');
  });
});

