import type {
  Appointment,
  AppointmentFilters,
  CreateAppointment,
  ExamType,
  Patient,
} from "../types/appointments";
import { requestJson } from "./http";

export async function getAppointments(
  filters: AppointmentFilters,
): Promise<Appointment[]> {
  const parameters = new URLSearchParams();
  if (filters.date) parameters.set("date", filters.date);
  if (filters.patientId) parameters.set("patientId", filters.patientId);
  const query = parameters.toString();
  return requestJson<Appointment[]>(
    `/api/appointments${query ? `?${query}` : ""}`,
  );
}

export async function getPatients(): Promise<Patient[]> {
  return requestJson<Patient[]>("/api/patients");
}

export async function getExamTypes(): Promise<ExamType[]> {
  return requestJson<ExamType[]>("/api/exam-types");
}

export async function createAppointment(
  appointment: CreateAppointment,
): Promise<void> {
  await requestJson<{ id: number }>("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appointment),
  });
}

export async function cancelAppointment(id: number): Promise<void> {
  await requestJson<void>(`/api/appointments/${id}/cancel`, { method: "POST" });
}
