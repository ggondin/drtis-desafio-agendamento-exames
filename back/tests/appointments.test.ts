import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../src/app.js';
import { openDatabase, seed } from '../src/database.js';

let db: DatabaseSync;
let app: ReturnType<typeof createApp>;
let clinic: ReturnType<typeof request.agent>;
let patient: ReturnType<typeof request.agent>;
// Far-future dates make the tests independent of the day they run.
const slot = '2099-02-20T09:00:00-03:00';
const appointment = { patientId: 2, examTypeId: 1, startsAt: slot };

beforeEach(async () => {
  db = openDatabase(':memory:');
  seed(db);
  app = createApp(db);
  clinic = request.agent(app);
  patient = request.agent(app);
  await clinic.post('/api/auth/login').send({ email: 'clinica@demo.com', password: 'Clinica@123' }).expect(200);
  await patient.post('/api/auth/login').send({ email: 'mariana@demo.com', password: 'Paciente@123' }).expect(200);
});

afterEach(() => db.close());

test('equipe agenda um exame e consulta os três tipos disponíveis', async () => {
  const exams = await clinic.get('/api/exam-types').expect(200);
  assert.deepEqual(exams.body.map((exam: { name: string }) => exam.name), ['Raio-X', 'Ultrassom', 'Ressonância magnética']);
  const created = await clinic.post('/api/appointments').send(appointment).expect(201);
  const list = await clinic.get('/api/appointments').expect(200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].id, created.body.id);
  assert.equal(list.body[0].startsAt, '2099-02-20T12:00:00.000Z');
  assert.equal(list.body[0].status, 'scheduled');
});

test('duas requisições simultâneas para o mesmo horário aceitam apenas uma', async () => {
  const results = await Promise.all([
    clinic.post('/api/appointments').send(appointment),
    clinic.post('/api/appointments').send({ ...appointment, patientId: 3, examTypeId: 2 })
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  const list = await clinic.get('/api/appointments').expect(200);
  assert.equal(list.body.length, 1);
});

test('um horário cancelado pode ser reutilizado', async () => {
  const created = await clinic.post('/api/appointments').send(appointment).expect(201);
  await clinic.post(`/api/appointments/${created.body.id}/cancel`).expect(204);
  await clinic.post('/api/appointments').send({ ...appointment, patientId: 3 }).expect(201);
  const list = await clinic.get('/api/appointments').expect(200);
  assert.deepEqual(list.body.map((row: { status: string }) => row.status), ['cancelled', 'scheduled']);
});

test('rejeita datas passadas, inválidas e horários fora dos intervalos de 30 minutos', async () => {
  for (const startsAt of ['2000-01-01T09:00:00-03:00', '2099-99-01T09:00:00-03:00', '2099-02-30T09:00:00-03:00', '2099-02-20T09:15:00-03:00']) {
    const result = await clinic.post('/api/appointments').send({ ...appointment, startsAt }).expect(400);
    assert.ok(result.body.message);
  }
  const list = await clinic.get('/api/appointments').expect(200);
  assert.equal(list.body.length, 0);
});

test('filtra agendamentos por paciente e pela data local da clínica', async () => {
  await clinic.post('/api/appointments').send({ ...appointment, startsAt: '2099-02-20T23:30:00-03:00' }).expect(201);
  await clinic.post('/api/appointments').send({ ...appointment, patientId: 3, startsAt: '2099-02-21T00:00:00-03:00' }).expect(201);
  const results = await clinic.get('/api/appointments').query({ date: '2099-02-20', patientId: 2 }).expect(200);
  assert.equal(results.body.length, 1);
  assert.equal(results.body[0].patientId, 2);
  assert.equal(results.body[0].startsAt, '2099-02-21T02:30:00.000Z');
  const none = await clinic.get('/api/appointments').query({ date: '2099-02-20', patientId: 3 }).expect(200);
  assert.equal(none.body.length, 0);
});

test('paciente não agenda nem cancela e só lista seus próprios exames', async () => {
  const own = await clinic.post('/api/appointments').send(appointment).expect(201);
  await clinic.post('/api/appointments').send({ ...appointment, patientId: 3, startsAt: '2099-02-20T09:30:00-03:00' }).expect(201);
  await patient.post('/api/appointments').send(appointment).expect(403);
  await patient.post(`/api/appointments/${own.body.id}/cancel`).expect(403);
  const list = await patient.get('/api/appointments').expect(200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].patientId, 2);
  await request(app).get('/api/appointments').expect(401);
});

test('rejeita pacientes e tipos de exame inexistentes', async () => {
  await clinic.post('/api/appointments').send({ ...appointment, patientId: 1 }).expect(400);
  await clinic.post('/api/appointments').send({ ...appointment, examTypeId: 99 }).expect(400);
});
