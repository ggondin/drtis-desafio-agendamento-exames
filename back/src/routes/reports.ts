import { Router, type Request, type RequestHandler, type Response } from "express";
import type { DatabaseSync } from "node:sqlite";
import { HttpError } from "../errors/http-error.js";
import { reportSchema } from "../validation/schemas.js";

type Appointment = {
  id: number;
  patient_id: number;
  status: string;
};

type ReportRoutesDependencies = {
  db: DatabaseSync;
  clinic: RequestHandler;
  appointment: (request: Request, response: Response) => Appointment;
  transaction: <T>(operation: () => T) => T;
};

export function createReportRoutes({
  db,
  clinic,
  appointment,
  transaction
}: ReportRoutesDependencies) {
  const router = Router();

  function getReport(request: Request, response: Response) {
    const scheduledExam = appointment(request, response);
    const report = db.prepare(`
      SELECT id, title, content, professional, status, published_at AS publishedAt
      FROM reports
      WHERE appointment_id = ?
    `).get(scheduledExam.id);

    if (!report || (response.locals.user.role === "patient" && report.status !== "published")) {
      throw new HttpError(404, "Laudo não disponível.");
    }

    response.json(report);
  }

  function saveReportDraft(request: Request, response: Response) {
    const input = reportSchema.parse(request.body);

    transaction(() => {
      const scheduledExam = appointment(request, response);
      if (scheduledExam.status === "cancelled") {
        throw new HttpError(409, "Agendamentos cancelados não podem receber laudos.");
      }

      const report = db.prepare("SELECT status FROM reports WHERE appointment_id = ?")
        .get(scheduledExam.id);
      if (report?.status === "published") {
        throw new HttpError(409, "Laudos publicados não podem ser editados.");
      }

      db.prepare(`
        INSERT INTO reports (appointment_id, title, content, professional, status)
        VALUES (?, ?, ?, ?, 'draft')
        ON CONFLICT (appointment_id) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          professional = excluded.professional
      `).run(scheduledExam.id, input.title, input.content, input.professional);
    });

    response.status(200).json({ message: "Rascunho salvo." });
  }

  function publishReport(request: Request, response: Response) {
    transaction(() => {
      const scheduledExam = appointment(request, response);
      if (scheduledExam.status === "cancelled") {
        throw new HttpError(409, "Agendamento cancelado.");
      }

      const report = db.prepare("SELECT status FROM reports WHERE appointment_id = ?")
        .get(scheduledExam.id);
      if (!report) {
        throw new HttpError(404, "Salve o rascunho antes de publicar.");
      }
      if (report.status === "published") {
        throw new HttpError(409, "Este laudo já foi publicado.");
      }

      db.prepare(`
        UPDATE reports
        SET status = 'published', published_at = ?
        WHERE appointment_id = ?
      `).run(new Date().toISOString(), scheduledExam.id);
    });

    response.json({ message: "Laudo publicado." });
  }

  router.get("/:id/report", getReport);
  router.put("/:id/report", clinic, saveReportDraft);
  router.post("/:id/report/publish", clinic, publishReport);

  return router;
}
