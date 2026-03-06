const request = require('supertest');
const { app } = require('../../dist/app');

describe('e2e: auth routes', () => {
  test('POST /api/auth/refresh without cookie should return 401', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('리프레시 토큰이 제공되지 않았습니다');
  });

  test('POST /api/auth/login with invalid payload should return 400', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: '',
      password: '1234',
    });

    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
  });

  test('POST /api/auth/signup with invalid payload should return 400', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      username: '',
      password: '1234',
      email: 'not-email',
    });

    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
  });
});

