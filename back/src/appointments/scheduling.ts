import { HttpError } from "../errors/http-error.js";

const SLOT_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00-03:00$/;
const SAO_PAULO_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

export function canonicalSlot(value: string, now = Date.now()): string {
  if (!SLOT_FORMAT.test(value)) {
    throw new HttpError(
      400,
      "Use horários de 30 minutos no fuso de São Paulo (UTC-03:00).",
    );
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new HttpError(400, "Data inválida.");
  }

  const localDateTime = new Date(timestamp - SAO_PAULO_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 19);
  if (localDateTime !== value.slice(0, 19)) {
    throw new HttpError(400, "Data inválida.");
  }

  if (timestamp <= now) {
    throw new HttpError(400, "Não é possível agendar no passado.");
  }

  return new Date(timestamp).toISOString();
}
