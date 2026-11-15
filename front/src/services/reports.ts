import type { Report, ReportContent } from "../types/reports";
import { requestJson } from "./http";

export function getReport(appointmentId: number): Promise<Report> {
  return requestJson<Report>(`/api/appointments/${appointmentId}/report`);
}

export async function saveReportDraft(
  appointmentId: number,
  report: ReportContent,
): Promise<void> {
  await requestJson(`/api/appointments/${appointmentId}/report`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
}

export async function publishReport(appointmentId: number): Promise<void> {
  await requestJson(`/api/appointments/${appointmentId}/report/publish`, {
    method: "POST",
  });
}
