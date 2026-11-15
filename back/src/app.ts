import express, {
  type Request,
  type Response,
  type NextFunction
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { verifyPassword } from "./database.js";
import { canonicalSlot } from "./appointments/scheduling.js";
import { HttpError } from "./errors/http-error.js";
import {
  appointmentSchema,
  dateSchema,
  idSchema
} from "./validation/schemas.js";
import { createReportRoutes } from "./routes/reports.js";

type User = {
  id: number;
  name: string;
  email: string;
  role: "clinic" | "patient";
};
type Appointment = { id: number; patient_id: number; status: string };
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function createApp(
  db: DatabaseSync,
  options: { staticDir?: string; secureCookies?: boolean } = {}
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "upgrade-insecure-requests": options.secureCookies ? [] : null
        }
      }
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, _res, next) => {
    const origin = req.get("origin");
    if (origin && new URL(origin).host !== req.get("host"))
      return next(new HttpError(403, "Origem não autorizada."));
    next();
  });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: options.secureCookies ?? false,
    path: "/"
  };
  function token(req: Request) {
    return (
      req.headers.cookie
        ?.split(";")
        .map((x) => x.trim())
        .find((x) => x.startsWith("session="))
        ?.slice(8) ?? ""
    );
  }
  app.post(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { message: "Muitas tentativas. Tente novamente mais tarde." }
    }),
    (req, res) => {
      const { email, password } = z
        .object({
          email: z.string().email().max(254),
          password: z.string().min(1).max(256)
        })
        .parse(req.body);
      const user = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(email.toLowerCase()) as
        | (User & { password_hash: string })
        | undefined;
      if (!user || !verifyPassword(password, user.password_hash))
        throw new HttpError(401, "E-mail ou senha inválidos.");
      const raw = randomBytes(32).toString("hex");
      db.prepare(
        "DELETE FROM sessions WHERE expires_at <= ? OR token_hash=?"
      ).run(Date.now(), digest(token(req)));
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
        digest(raw),
        user.id,
        Date.now() + 8 * 3600000
      );
      res.cookie("session", raw, { ...cookieOptions, maxAge: 8 * 3600000 });
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    }
  );
  app.use("/api", (req, res, next) => {
    const user = db
      .prepare(
        "SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?"
      )
      .get(digest(token(req)), Date.now()) as User | undefined;
    if (!user)
      return next(new HttpError(401, "Entre na sua conta para continuar."));
    res.locals.user = user;
    next();
  });
  const clinic = (_req: Request, res: Response, next: NextFunction) =>
    res.locals.user.role === "clinic"
      ? next()
      : next(new HttpError(403, "Acesso exclusivo da equipe da clínica."));
  function appointment(req: Request, res: Response) {
    const row = db
      .prepare("SELECT * FROM appointments WHERE id=?")
      .get(idSchema.parse(req.params.id)) as Appointment | undefined;
    if (
      !row ||
      (res.locals.user.role === "patient" &&
        row.patient_id !== res.locals.user.id)
    )
      throw new HttpError(404, "Agendamento não encontrado.");
    return row;
  }
  function transaction<T>(operation: () => T): T {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  app.get("/api/auth/me", (_req, res) => res.json(res.locals.user));
  app.post("/api/auth/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
      digest(token(req))
    );
    res.clearCookie("session", cookieOptions).status(204).end();
  });
  app.get("/api/patients", clinic, (_req, res) =>
    res.json(
      db
        .prepare("SELECT id,name FROM users WHERE role='patient' ORDER BY name")
        .all()
    )
  );
  app.get("/api/exam-types", (_req, res) =>
    res.json(db.prepare("SELECT * FROM exam_types ORDER BY id").all())
  );
  app.get("/api/appointments", (req, res) => {
    const where: string[] = [];
    const values: (string | number)[] = [];
    if (res.locals.user.role === "patient") {
      where.push("a.patient_id=?");
      values.push(res.locals.user.id);
    } else if (req.query.patientId) {
      where.push("a.patient_id=?");
      values.push(idSchema.parse(req.query.patientId));
    }
    if (req.query.date) {
      const date = dateSchema.parse(req.query.date);
      where.push("date(a.starts_at,'-3 hours')=?");
      values.push(date);
    }
    res.json(
      db
        .prepare(
          `SELECT a.id,a.patient_id AS patientId,u.name AS patientName,e.name AS examName,
      a.starts_at AS startsAt,a.status,
      CASE WHEN r.status='published' THEN 'published' WHEN ?='clinic' THEN r.status ELSE NULL END AS reportStatus
      FROM appointments a JOIN users u ON u.id=a.patient_id JOIN exam_types e ON e.id=a.exam_type_id
      LEFT JOIN reports r ON r.appointment_id=a.id ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY a.starts_at,a.id`
        )
        .all(res.locals.user.role, ...values)
    );
  });
  app.post("/api/appointments", clinic, (req, res) => {
    const input = appointmentSchema.parse(req.body);
    const startsAt = canonicalSlot(input.startsAt);
    if (
      !db
        .prepare("SELECT id FROM users WHERE id=? AND role='patient'")
        .get(input.patientId)
    )
      throw new HttpError(400, "Paciente inválido.");
    if (
      !db.prepare("SELECT id FROM exam_types WHERE id=?").get(input.examTypeId)
    )
      throw new HttpError(400, "Tipo de exame inválido.");
    const result = db
      .prepare(
        "INSERT INTO appointments(patient_id,exam_type_id,starts_at) VALUES(?,?,?)"
      )
      .run(input.patientId, input.examTypeId, startsAt);
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });
  app.post("/api/appointments/:id/cancel", clinic, (req, res) => {
    transaction(() => {
      const row = appointment(req, res);
      if (
        db
          .prepare(
            "SELECT id FROM reports WHERE appointment_id=? AND status='published'"
          )
          .get(row.id)
      )
        throw new HttpError(
          409,
          "Exames com laudo publicado não podem ser cancelados."
        );
      db.prepare("UPDATE appointments SET status='cancelled' WHERE id=?").run(
        row.id
      );
    });
    res.status(204).end();
  });
  app.use(
    "/api/appointments",
    createReportRoutes({ db, clinic, appointment, transaction })
  );
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "Recurso não encontrado."))
  );
  if (options.staticDir && existsSync(options.staticDir)) {
    app.use(express.static(options.staticDir));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(options.staticDir!, "index.html"))
    );
  }
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({
            message: "Confira os campos informados.",
            fields: error.flatten().fieldErrors
          });
        return;
      }
      if (error instanceof HttpError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ message: "Requisição inválida." });
        return;
      }
      if (
        error instanceof Error &&
        error.message.includes(
          "UNIQUE constraint failed: appointments.starts_at"
        )
      ) {
        res
          .status(409)
          .json({ message: "Esse horário já foi reservado. Escolha outro." });
        return;
      }
      console.error(error);
      res
        .status(500)
        .json({ message: "Não foi possível concluir a operação." });
    }
  );
  return app;
}
