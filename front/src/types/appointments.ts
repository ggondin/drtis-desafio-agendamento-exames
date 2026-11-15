export type AppointmentStatus = "scheduled" | "cancelled";
export type ReportStatus = "draft" | "published" | null;

export type Appointment = {
  id: number;
  patientId: number;
  patientName: string;
  examName: string;
  startsAt: string;
  status: AppointmentStatus;
  reportStatus: ReportStatus;
};

export type Patient = { id: number; name: string };
export type ExamType = { id: number; name: string };
export type AppointmentFilters = { date: string; patientId: string };
export type CreateAppointment = {
  patientId: number;
  examTypeId: number;
  startsAt: string;
};
