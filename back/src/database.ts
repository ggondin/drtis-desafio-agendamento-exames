import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function openDatabase(
  path = process.env.DATABASE_PATH ?? "./data/clinic.sqlite"
) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('clinic','patient'))
    );
    CREATE TABLE IF NOT EXISTS exam_types (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES users(id),
      exam_type_id INTEGER NOT NULL REFERENCES exam_types(id), starts_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','cancelled')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS active_slot ON appointments(starts_at) WHERE status = 'scheduled';
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY, appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id),
      title TEXT NOT NULL, content TEXT NOT NULL, professional TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft','published')), published_at TEXT,
      CHECK((status='draft' AND published_at IS NULL) OR (status='published' AND published_at IS NOT NULL))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
    );
    CREATE TRIGGER IF NOT EXISTS immutable_published_report BEFORE UPDATE ON reports
      WHEN OLD.status = 'published' BEGIN SELECT RAISE(ABORT, 'published_report_immutable'); END;
    CREATE TRIGGER IF NOT EXISTS no_report_on_cancelled_insert BEFORE INSERT ON reports
      WHEN (SELECT status FROM appointments WHERE id=NEW.appointment_id)='cancelled'
      BEGIN SELECT RAISE(ABORT, 'cancelled_appointment'); END;
    CREATE TRIGGER IF NOT EXISTS no_report_on_cancelled_update BEFORE UPDATE ON reports
      WHEN (SELECT status FROM appointments WHERE id=NEW.appointment_id)='cancelled'
      BEGIN SELECT RAISE(ABORT, 'cancelled_appointment'); END;
    CREATE TRIGGER IF NOT EXISTS no_cancel_published BEFORE UPDATE OF status ON appointments
      WHEN NEW.status='cancelled' AND EXISTS(SELECT 1 FROM reports WHERE appointment_id=OLD.id AND status='published')
      BEGIN SELECT RAISE(ABORT, 'published_report'); END;
  `);
  return db;
}
export function seed(db: DatabaseSync) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const user = db.prepare(
      "INSERT OR IGNORE INTO users(id,name,email,password_hash,role) VALUES(?,?,?,?,?)"
    );
    user.run(
      1,
      "Equipe Aurora",
      "clinica@demo.com",
      hashPassword("Clinica@123"),
      "clinic"
    );
    user.run(
      2,
      "Mariana Costa",
      "mariana@demo.com",
      hashPassword("Paciente@123"),
      "patient"
    );
    user.run(
      3,
      "Rafael Almeida",
      "rafael@demo.com",
      hashPassword("Paciente@123"),
      "patient"
    );
    const exam = db.prepare(
      "INSERT OR IGNORE INTO exam_types(id,name) VALUES(?,?)"
    );
    ["Raio-X", "Ultrassom", "Ressonância magnética"].forEach((name, index) =>
      exam.run(index + 1, name)
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
