import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appointmentSchema,
  dateSchema,
  idSchema,
  reportSchema,
} from "../../src/validation/schemas.js";

describe("Dados do agendamento e filtros", () => {
  it("aceita identificadores inteiros positivos e converte valores numéricos em texto", () => {
    assert.equal(idSchema.parse(1), 1);
    assert.equal(idSchema.parse("42"), 42);
    for (const value of [0, -1, 1.5, "", "abc"]) {
      assert.equal(idSchema.safeParse(value).success, false);
    }
  });

  it("exige paciente, exame e data ao validar os dados do agendamento", () => {
    assert.deepEqual(
      appointmentSchema.parse({
        patientId: "2",
        examTypeId: 1,
        startsAt: "2028-02-29T13:30:00-03:00",
      }),
      { patientId: 2, examTypeId: 1, startsAt: "2028-02-29T13:30:00-03:00" },
    );
    for (const value of [
      { examTypeId: 1, startsAt: "data" },
      { patientId: 2, startsAt: "data" },
      { patientId: 2, examTypeId: 1 },
      { patientId: 2, examTypeId: 1, startsAt: 2028 },
    ]) {
      assert.equal(appointmentSchema.safeParse(value).success, false);
    }
  });

  it("aceita apenas datas reais no formato ISO para o filtro", () => {
    for (const value of ["2028-02-29", "2026-11-15"]) {
      assert.equal(dateSchema.safeParse(value).success, true);
    }
    for (const value of [
      "2026-02-29",
      "2026-13-01",
      "15/11/2026",
      "2026-1-01",
    ]) {
      assert.equal(dateSchema.safeParse(value).success, false);
    }
  });
});

describe("Dados do laudo", () => {
  const validReport = {
    title: "Resultado do exame",
    content: "Conteúdo fictício.",
    professional: "Dra. Exemplo",
  };

  it("remove espaços nas extremidades dos campos", () => {
    assert.deepEqual(
      reportSchema.parse({
        title: "  Resultado do exame  ",
        content: "  Conteúdo fictício.  ",
        professional: "  Dra. Exemplo  ",
      }),
      validReport,
    );
  });

  it("exige título, conteúdo e profissional preenchidos", () => {
    for (const field of ["title", "content", "professional"] as const) {
      assert.equal(
        reportSchema.safeParse({ ...validReport, [field]: "   " }).success,
        false,
      );
      const incomplete = { ...validReport };
      delete (incomplete as Partial<typeof validReport>)[field];
      assert.equal(reportSchema.safeParse(incomplete).success, false);
    }
  });

  it("respeita os limites máximos dos campos", () => {
    assert.equal(
      reportSchema.safeParse({
        title: "a".repeat(150),
        professional: "b".repeat(150),
        content: "c".repeat(20000),
      }).success,
      true,
    );
    for (const [field, length] of [
      ["title", 151],
      ["professional", 151],
      ["content", 20001],
    ] as const) {
      assert.equal(
        reportSchema.safeParse({ ...validReport, [field]: "x".repeat(length) })
          .success,
        false,
      );
    }
  });
});
