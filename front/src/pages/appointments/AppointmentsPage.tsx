import { useEffect, useState } from "react";
import type { Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { clinicTimeZone } from "../../config/date";
import { Link } from "react-router";
import { CalendarDays, FileText, Plus, X } from "lucide-react";
import { MenuItem, TextField } from "@mui/material";
import { AppointmentDialog } from "../../components/dialogs/AppointmentDialog/AppointmentDialog";
import { ConfirmDialog } from "../../components/dialogs/ConfirmDialog/ConfirmDialog";
import { useAuth } from "../../context/authContext";
import {
  cancelAppointment,
  getAppointments,
  getExamTypes,
  getPatients,
} from "../../services/appointments";
import type { Appointment, ExamType, Patient } from "../../types/appointments";
import "./AppointmentsPage.css";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: clinicTimeZone,
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: clinicTimeZone,
  hour: "2-digit",
  minute: "2-digit",
});

export function AppointmentsPage() {
  const { user } = useAuth();
  const isClinic = user?.role === "clinic";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null);
  const [filterPatient, setFilterPatient] = useState("");
  const [revision, setRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<Appointment | null>(null);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(""), 10_000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    let active = true;
    async function loadAppointments(): Promise<void> {
      setIsLoading(true);
      setListError("");
      if (filterDate && !filterDate.isValid()) {
        setListError("Informe uma data válida para filtrar.");
        setIsLoading(false);
        return;
      }
      try {
        const data = await getAppointments({
          date: filterDate?.format("YYYY-MM-DD") ?? "",
          patientId: isClinic ? filterPatient : "",
        });
        if (active) setAppointments(data);
      } catch (caughtError) {
        if (active)
          setListError(
            caughtError instanceof Error
              ? caughtError.message
              : "Não foi possível carregar os agendamentos.",
          );
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadAppointments();
    return () => {
      active = false;
    };
  }, [filterDate, filterPatient, isClinic, revision]);

  useEffect(() => {
    if (!isClinic) return;
    let active = true;
    async function loadOptions(): Promise<void> {
      try {
        const [patientList, examList] = await Promise.all([
          getPatients(),
          getExamTypes(),
        ]);
        if (active) {
          setPatients(patientList);
          setExamTypes(examList);
        }
      } catch {
        if (active)
          setCatalogError(
            "Não foi possível carregar pacientes e exames. Atualize a página para tentar novamente.",
          );
      }
    }
    void loadOptions();
    return () => {
      active = false;
    };
  }, [isClinic]);

  async function handleCancel(appointment: Appointment): Promise<void> {
    setError("");
    setNotice("");
    setCancellingId(appointment.id);
    try {
      await cancelAppointment(appointment.id);
      setNotice("Agendamento cancelado.");
      setRevision((previous) => previous + 1);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível cancelar o agendamento.",
      );
    } finally {
      setCancellingId(null);
      setAppointmentToCancel(null);
    }
  }

  return (
    <div className="appointments-page">
      <div className="page-intro">
        <div>
          <p className="overline">
            PORTAL DE EXAMES <span> / </span> AGENDAMENTOS
          </p>
          <h1>{isClinic ? "Agendamentos" : "Meus agendamentos"}</h1>
          <p>
            {isClinic
              ? "Organize e acompanhe os exames da clínica."
              : "Acompanhe seus exames e a disponibilidade dos seus laudos."}
          </p>
        </div>
        {isClinic && (
          <button
            className="appointment-primary"
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setNotice("");
            }}
          >
            <Plus size={17} aria-hidden="true" /> Novo agendamento
          </button>
        )}
      </div>
      {catalogError && (
        <p className="appointment-alert error" role="alert">
          {catalogError}
        </p>
      )}
      {error && !showForm && (
        <p className="appointment-alert error" role="alert">
          {error}
        </p>
      )}
      {listError && (
        <p className="appointment-alert error" role="alert">
          {listError}
        </p>
      )}
      {notice && (
        <div className="appointment-alert success" role="status">
          <span>{notice}</span>
          <button
            className="dismiss-notice"
            type="button"
            aria-label="Fechar mensagem"
            onClick={() => setNotice("")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {isClinic && (
        <AppointmentDialog
          open={showForm}
          patients={patients}
          examTypes={examTypes}
          catalogError={catalogError}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            setFilterDate(null);
            setFilterPatient("");
            setNotice("Agendamento criado com sucesso.");
            setRevision((previous) => previous + 1);
          }}
        />
      )}
      <section
        className="appointment-card list-card"
        aria-labelledby="appointments-title"
      >
        <div className="card-heading">
          <div>
            <h2 id="appointments-title">
              {isClinic ? "Lista de agendamentos" : "Seus exames"}
            </h2>
            <p>
              {isClinic
                ? "Consulte os exames agendados e cancelados."
                : "Veja a data, o horário e a situação dos seus exames."}
            </p>
          </div>
          <span className="card-icon" aria-hidden="true">
            <CalendarDays size={20} aria-hidden="true" />
          </span>
        </div>
        <div className="appointment-filters">
          <DatePicker
            label="Filtrar por data"
            value={filterDate}
            onChange={setFilterDate}
            timezone={clinicTimeZone}
            slotProps={{ textField: { className: "date-filter", size: "small", fullWidth: true } }}
          />
          {isClinic && (
            <TextField
              className="patient-filter"
              select
              label="Filtrar por paciente"
              value={filterPatient}
              onChange={(event) => setFilterPatient(event.target.value)}
            >
              <MenuItem value="">Todos os pacientes</MenuItem>
              {patients.map((patient) => (
                <MenuItem key={patient.id} value={String(patient.id)}>
                  {patient.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <button
            className="clear-filters"
            type="button"
            onClick={() => {
              setFilterDate(null);
              setFilterPatient("");
            }}
            disabled={!filterDate && !filterPatient}
          >
            Limpar filtros
          </button>
        </div>
        {isLoading ? (
          <p className="table-message" role="status">
            Carregando agendamentos...
          </p>
        ) : listError ? (
          <p className="table-message">Não foi possível atualizar a lista.</p>
        ) : appointments.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">
              <CalendarDays size={24} aria-hidden="true" />
            </span>
            <h3>Nenhum agendamento encontrado</h3>
            <p>
              {filterDate || filterPatient
                ? "Tente alterar os filtros para ver outros resultados."
                : isClinic
                  ? "Quando um exame for agendado, ele aparecerá aqui."
                  : "Seus exames agendados aparecerão aqui."}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>EXAME</th>
                  {isClinic && <th>PACIENTE</th>}
                  <th>DATA E HORÁRIO</th>
                  <th>SITUAÇÃO</th>
                  <th>LAUDO</th>
                  <th>
                    <span className="visually-hidden">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <strong>{appointment.examName}</strong>
                      <small>Exame</small>
                    </td>
                    {isClinic && <td>{appointment.patientName}</td>}
                    <td>
                      <strong>
                        {dateFormatter.format(new Date(appointment.startsAt))}
                      </strong>
                      <small>
                        {timeFormatter.format(new Date(appointment.startsAt))} ·
                        São Paulo
                      </small>
                    </td>
                    <td>
                      <span className={`status-badge ${appointment.status}`}>
                        {appointment.status === "scheduled"
                          ? "Agendado"
                          : "Cancelado"}
                      </span>
                    </td>
                    <td>
                      <span className="report-status">
                        {appointment.reportStatus === "published"
                          ? "Publicado"
                          : isClinic && appointment.reportStatus === "draft"
                            ? "Rascunho"
                            : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="appointment-actions">
                        {(isClinic
                          ? appointment.status === "scheduled" ||
                            appointment.reportStatus !== null
                          : appointment.reportStatus === "published") && (
                          <Link
                            className="report-link"
                            to={`/agendamentos/${appointment.id}/laudo`}
                          >
                            <FileText size={15} aria-hidden="true" />
                            {appointment.reportStatus === null
                              ? "Cadastrar laudo"
                              : "Ver laudo"}
                          </Link>
                        )}
                        {isClinic &&
                          appointment.status === "scheduled" &&
                          appointment.reportStatus !== "published" && (
                            <button
                              className="cancel-button"
                              type="button"
                              disabled={cancellingId !== null}
                              onClick={() =>
                                setAppointmentToCancel(appointment)
                              }
                            >
                              {cancellingId === appointment.id
                                ? "Cancelando..."
                                : "Cancelar"}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="list-footer">
          <span>
            {isLoading
              ? ""
              : `${appointments.length} ${appointments.length === 1 ? "agendamento" : "agendamentos"}`}
          </span>
          <span>Horários de Brasília</span>
        </div>
      </section>
      <ConfirmDialog
        open={appointmentToCancel !== null}
        title="Cancelar agendamento?"
        description={`O exame de ${appointmentToCancel?.patientName ?? ""} será cancelado e o horário ficará disponível novamente.`}
        confirmLabel="Cancelar agendamento"
        isProcessing={cancellingId !== null}
        onClose={() => setAppointmentToCancel(null)}
        onConfirm={() => {
          if (appointmentToCancel) void handleCancel(appointmentToCancel);
        }}
      />
    </div>
  );
}
