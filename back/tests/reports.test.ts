import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
import request from "supertest";
import { createApp } from "../src/app.js";
import { openDatabase, seed } from "../src/database.js";

let database: DatabaseSync;
let app: ReturnType<typeof createApp>;
let clinic: ReturnType<typeof request.agent>;
let patient: ReturnType<typeof request.agent>;
let otherPatient: ReturnType<typeof request.agent>;
let appointmentId: number;

const report = {
  title: "Laudo de raio-X",
  content: "Conteúdo fictício para teste.",
  professional: "Dra. Ana Silva"
};

beforeEach(async () => {
  database = openDatabase(":memory:");
  seed(database);
  app = createApp(database);
  clinic = request.agent(app);
  patient = request.agent(app);
  otherPatient = request.agent(app);

  await clinic.post("/api/auth/login")
    .send({ email: "clinica@demo.com", password: "Clinica@123" })
    .expect(200);
  await patient.post("/api/auth/login")
    .send({ email: "mariana@demo.com", password: "Paciente@123" })
    .expect(200);
  await otherPatient.post("/api/auth/login")
    .send({ email: "rafael@demo.com", password: "Paciente@123" })
    .expect(200);

  const created = await clinic.post("/api/appointments")
    .send({ patientId: 2, examTypeId: 1, startsAt: "2099-02-20T09:00:00-03:00" })
    .expect(201);
  appointmentId = created.body.id;
});

afterEach(() => database.close());

test("a clínica salva e edita um único rascunho por agendamento", async () => {
  await clinic.put(`/api/appointments/${appointmentId}/report`).send(report).expect(200);
  const initial = await clinic.get(`/api/appointments/${appointmentId}/report`).expect(200);
  assert.equal(initial.body.status, "draft");
  assert.equal(initial.body.publishedAt, null);

  await clinic.put(`/api/appointments/${appointmentId}/report`)
    .send({ ...report, content: "Conteúdo atualizado." })
    .expect(200);
  const updated = await clinic.get(`/api/appointments/${appointmentId}/report`).expect(200);
  assert.equal(updated.body.id, initial.body.id);
  assert.equal(updated.body.content, "Conteúdo atualizado.");
  assert.equal(updated.body.title, report.title);
  assert.equal(updated.body.professional, report.professional);
});

test("rascunho não fica visível para o paciente, nem como indicador na lista", async () => {
  await clinic.put(`/api/appointments/${appointmentId}/report`).send(report).expect(200);
  const response = await patient.get(`/api/appointments/${appointmentId}/report`).expect(404);
  assert.equal(JSON.stringify(response.body).includes(report.content), false);

  const patientAppointments = await patient.get("/api/appointments").expect(200);
  assert.equal(patientAppointments.body[0].reportStatus, null);
  const clinicAppointments = await clinic.get("/api/appointments").expect(200);
  assert.equal(clinicAppointments.body[0].reportStatus, "draft");
});

test("publicação disponibiliza laudo e data de publicação para o paciente correto", async () => {
  await clinic.put(`/api/appointments/${appointmentId}/report`).send(report).expect(200);
  const beforePublication = Date.now();
  await clinic.post(`/api/appointments/${appointmentId}/report/publish`).expect(200);
  const afterPublication = Date.now();

  const published = await patient.get(`/api/appointments/${appointmentId}/report`).expect(200);
  assert.equal(published.body.status, "published");
  assert.equal(published.body.title, report.title);
  assert.equal(published.body.content, report.content);
  assert.equal(published.body.professional, report.professional);
  const publicationTime = Date.parse(published.body.publishedAt);
  assert.ok(publicationTime >= beforePublication && publicationTime <= afterPublication);

  const appointments = await patient.get("/api/appointments").expect(200);
  assert.equal(appointments.body[0].reportStatus, "published");
});

test("outro paciente não pode consultar o laudo publicado", async () => {
  await clinic.put(`/api/appointments/${appointmentId}/report`).send(report).expect(200);
  await clinic.post(`/api/appointments/${appointmentId}/report/publish`).expect(200);
  const response = await otherPatient.get(`/api/appointments/${appointmentId}/report`).expect(404);
  assert.equal(JSON.stringify(response.body).includes(report.content), false);
  const appointments = await otherPatient.get("/api/appointments").expect(200);
  assert.equal(appointments.body.length, 0);
});

test("laudo publicado não pode ser alterado ou publicado novamente e impede cancelamento", async () => {
  await clinic.put(`/api/appointments/${appointmentId}/report`).send(report).expect(200);
  await clinic.post(`/api/appointments/${appointmentId}/report/publish`).expect(200);
  await clinic.put(`/api/appointments/${appointmentId}/report`)
    .send({ ...report, content: "Tentativa de alteração" }).expect(409);
  await clinic.post(`/api/appointments/${appointmentId}/report/publish`).expect(409);
  await clinic.post(`/api/appointments/${appointmentId}/cancel`).expect(409);

  const unchanged = await patient.get(`/api/appointments/${appointmentId}/report`).expect(200);
  assert.equal(unchanged.body.content, report.content);
  const appointments = await clinic.get("/api/appointments").expect(200);
  assert.equal(appointments.body[0].status, "scheduled");
});

test("agendamento cancelado não recebe laudo nem permite publicar rascunho existente", async () => {
  await clinic.put(`/api/appointments/${appointmentId}/report`).send(report).expect(200);
  await clinic.post(`/api/appointments/${appointmentId}/cancel`).expect(204);
  await clinic.put(`/api/appointments/${appointmentId}/report`).send(report).expect(409);
  await clinic.post(`/api/appointments/${appointmentId}/report/publish`).expect(409);

  const cancelled = await clinic.post("/api/appointments")
    .send({ patientId: 3, examTypeId: 1, startsAt: "2099-02-20T09:30:00-03:00" })
    .expect(201);
  await clinic.post(`/api/appointments/${cancelled.body.id}/cancel`).expect(204);
  await clinic.put(`/api/appointments/${cancelled.body.id}/report`).send(report).expect(409);
});

test("somente a clínica pode cadastrar ou publicar e os campos são obrigatórios", async () => {
  await patient.put(`/api/appointments/${appointmentId}/report`).send(report).expect(403);
  await patient.post(`/api/appointments/${appointmentId}/report/publish`).expect(403);
  await request(app).get(`/api/appointments/${appointmentId}/report`).expect(401);
  await clinic.post(`/api/appointments/${appointmentId}/report/publish`).expect(404);

  for (const field of ["title", "content", "professional"] as const) {
    await clinic.put(`/api/appointments/${appointmentId}/report`)
      .send({ ...report, [field]: "   " }).expect(400);
  }
  await clinic.get(`/api/appointments/${appointmentId}/report`).expect(404);
});
