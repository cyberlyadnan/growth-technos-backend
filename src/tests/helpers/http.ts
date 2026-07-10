import request from 'supertest';
import { createApp } from '../../app';
import { TEST_ADMIN } from './constants';

export const app = createApp();

export async function loginAsAdmin(agent = request.agent(app)) {
  await agent
    .post('/api/v1/auth/login')
    .send({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    })
    .expect(200);

  return agent;
}
