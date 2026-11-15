import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canonicalSlot } from "../../src/appointments/scheduling.js";
import { HttpError } from "../../src/errors/http-error.js";

const fixedNow = Date.parse("2026-11-15T15:00:00.000Z");

function assertInvalidSlot(value: string, expectedMessage: string): void {
  assert.throws(
    () => canonicalSlot(value, fixedNow),
    (error: unknown) =>
      error instanceof HttpError &&
      error.status === 400 &&
      error.message.includes(expectedMessage),
  );
}

describe("Horários de agendamento", () => {
  it("converte horários de São Paulo para UTC, inclusive na virada do dia", () => {
    assert.equal(
      canonicalSlot("2026-11-15T12:30:00-03:00", fixedNow),
      "2026-11-15T15:30:00.000Z",
    );
    assert.equal(
      canonicalSlot("2026-11-15T23:30:00-03:00", fixedNow),
      "2026-11-16T02:30:00.000Z",
    );
  });

  it("rejeita o instante atual e horários anteriores", () => {
    assertInvalidSlot("2026-11-15T12:00:00-03:00", "passado");
    assertInvalidSlot("2026-11-15T11:30:00-03:00", "passado");
  });

  it("aceita somente horas cheias ou intervalos de 30 minutos", () => {
    assert.equal(
      canonicalSlot("2026-11-15T13:00:00-03:00", fixedNow),
      "2026-11-15T16:00:00.000Z",
    );
    for (const value of [
      "2026-11-15T13:15:00-03:00",
      "2026-11-15T13:30:01-03:00",
    ]) {
      assertInvalidSlot(value, "30 minutos");
    }
  });

  it("exige o formato e o deslocamento de fuso adotados", () => {
    for (const value of [
      "2026-11-15T16:00:00Z",
      "2026-11-15T13:00:00-02:00",
      "2026-11-15T13:00:00",
      "15/11/2026 13:00",
    ]) {
      assertInvalidSlot(value, "fuso");
    }
  });

  it("rejeita datas e horas impossíveis sem lançar erro de conversão", () => {
    for (const value of [
      "2026-02-29T13:00:00-03:00",
      "2026-13-01T13:00:00-03:00",
      "2026-11-15T25:00:00-03:00",
    ]) {
      assertInvalidSlot(value, "Data inválida");
    }
  });

  it("aceita dia 29 de fevereiro em ano bissexto", () => {
    assert.equal(
      canonicalSlot("2028-02-29T13:30:00-03:00", fixedNow),
      "2028-02-29T16:30:00.000Z",
    );
  });
});
