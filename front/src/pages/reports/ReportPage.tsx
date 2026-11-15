import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { TextField } from "@mui/material";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FilePenLine,
  LockKeyhole,
  Save,
  Send,
} from "lucide-react";
import { useAuth } from "../../context/authContext";
import { ConfirmDialog } from "../../components/dialogs/ConfirmDialog/ConfirmDialog";
import { getAppointments } from "../../services/appointments";
import { ApiError } from "../../services/http";
import {
  getReport,
  publishReport,
  saveReportDraft,
} from "../../services/reports";
import type { Appointment } from "../../types/appointments";
import type { Report, ReportContent } from "../../types/reports";
import "./ReportPage.css";

const emptyReport: ReportContent = { title: "", content: "", professional: "" };
const clinicDateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ReportPage() {
  const { appointmentId: appointmentIdParam } = useParams();
  const appointmentId = Number(appointmentIdParam);
  const { user } = useAuth();
  const isClinic = user?.role === "clinic";
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [form, setForm] = useState<ReportContent>(emptyReport);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReport(): Promise<void> {
      setIsLoading(true);
      setLoadFailed(false);
      setError("");
      setAppointment(null);
      setReport(null);
      setForm(emptyReport);
      if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) {
        setError("Agendamento não encontrado.");
        setIsLoading(false);
        return;
      }
      try {
        const appointments = await getAppointments({ date: "", patientId: "" });
        const selected = appointments.find((item) => item.id === appointmentId);
        if (!selected) throw new Error("Agendamento não encontrado.");
        if (active) setAppointment(selected);

        try {
          const currentReport = await getReport(appointmentId);
          if (active) {
            setReport(currentReport);
            setForm({
              title: currentReport.title,
              content: currentReport.content,
              professional: currentReport.professional,
            });
          }
        } catch (caughtError) {
          if (!(caughtError instanceof ApiError && caughtError.status === 404))
            throw caughtError;
        }
      } catch (caughtError) {
        if (active) {
          setLoadFailed(true);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Não foi possível carregar o laudo.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadReport();
    return () => {
      active = false;
    };
  }, [appointmentId]);

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const shouldPublish = submitter?.value === "publish";
    if (shouldPublish) {
      setShowPublishConfirmation(true);
      return;
    }
    await executeSave(false);
  }

  async function executeSave(shouldPublish: boolean): Promise<void> {
    setIsSaving(true);
    setError("");
    setNotice("");
    let draftSaved = false;
    let publicationCompleted = false;
    try {
      await saveReportDraft(appointmentId, form);
      draftSaved = true;
      if (shouldPublish) {
        await publishReport(appointmentId);
        publicationCompleted = true;
      }
      const currentReport = await getReport(appointmentId);
      setReport(currentReport);
      setForm({
        title: currentReport.title,
        content: currentReport.content,
        professional: currentReport.professional,
      });
      setNotice(
        shouldPublish
          ? "Laudo publicado com sucesso."
          : "Rascunho salvo com sucesso.",
      );
      setShowPublishConfirmation(false);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Tente novamente.";
      if (publicationCompleted) {
        setReport({
          ...form,
          id: report?.id ?? 0,
          status: "published",
          publishedAt: null,
        });
        setError(
          "O laudo foi publicado, mas não foi possível atualizar a tela. Recarregue a página para consultar os dados.",
        );
      } else if (draftSaved && shouldPublish) {
        setError(`Rascunho salvo, mas não foi possível publicar. ${message}`);
      } else if (draftSaved) {
        setError(
          "O rascunho foi salvo, mas não foi possível atualizar a tela. Recarregue a página para consultá-lo.",
        );
      } else {
        setError(message);
      }
    } finally {
      setIsSaving(false);
      setShowPublishConfirmation(false);
    }
  }

  const canEdit =
    isClinic &&
    appointment?.status === "scheduled" &&
    report?.status !== "published";
  const showPublishedReport = report?.status === "published";
  const showCancelledDraft =
    isClinic &&
    appointment?.status === "cancelled" &&
    report?.status === "draft";

  return (
    <div className="report-page">
      <Link className="report-back-link" to="/agendamentos">
        <ArrowLeft size={16} aria-hidden="true" /> Voltar aos agendamentos
      </Link>
      <div className="report-heading">
        <div>
          <p className="report-overline">
            PORTAL DE EXAMES <span>/</span> LAUDOS
          </p>
          <h1>{isClinic ? "Laudo do exame" : "Meu laudo"}</h1>
          <p>
            {isClinic
              ? "Cadastre e acompanhe as informações do laudo."
              : "Consulte as informações do seu exame."}
          </p>
        </div>
        <div className="report-heading-icon">
          <FileCheck2 size={24} aria-hidden="true" />
        </div>
      </div>
      {error && (
        <p className="report-alert error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="report-alert success" role="status">
          <CheckCircle2 size={17} aria-hidden="true" /> {notice}
        </p>
      )}
      {isLoading ? (
        <p className="report-loading" role="status">
          Carregando laudo...
        </p>
      ) : (
        appointment &&
        !loadFailed && (
          <>
            <section
              className="report-card report-summary"
              aria-labelledby="exam-details-title"
            >
              <div className="report-card-heading">
                <div>
                  <p className="report-card-eyebrow">DADOS DO EXAME</p>
                  <h2 id="exam-details-title">{appointment.examName}</h2>
                </div>
                <span className={`report-exam-status ${appointment.status}`}>
                  {appointment.status === "scheduled"
                    ? "Agendado"
                    : "Cancelado"}
                </span>
              </div>
              <div className="report-details">
                <div>
                  <span>{isClinic ? "Paciente" : "Exame"}</span>
                  <strong>
                    {isClinic ? appointment.patientName : appointment.examName}
                  </strong>
                </div>
                <div>
                  <span>Data e horário</span>
                  <strong>
                    <CalendarDays size={16} aria-hidden="true" />{" "}
                    {clinicDateTime.format(new Date(appointment.startsAt))}
                  </strong>
                </div>
                <div>
                  <span>Laudo</span>
                  <strong>
                    {report?.status === "published"
                      ? "Publicado"
                      : report?.status === "draft" && isClinic
                        ? "Rascunho"
                        : "Não disponível"}
                  </strong>
                </div>
              </div>
            </section>
            {canEdit && (
              <section
                className="report-card report-document"
                aria-labelledby="report-form-title"
              >
                <div className="report-card-heading">
                  <div>
                    <p className="report-card-eyebrow">DOCUMENTO DO EXAME</p>
                    <h2 id="report-form-title">
                      {report ? "Editar rascunho" : "Cadastrar laudo"}
                    </h2>
                    <p>
                      Preencha os campos abaixo para salvar ou publicar o laudo.
                    </p>
                  </div>
                  <span className="report-card-icon">
                    <FilePenLine size={20} aria-hidden="true" />
                  </span>
                </div>
                <form
                  className="report-form"
                  onSubmit={(event) => void handleSave(event)}
                >
                  <TextField
                    id="report-title"
                    label="Título do laudo"
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    slotProps={{ htmlInput: { maxLength: 150 } }}
                    placeholder="Ex.: Laudo de raio-X"
                    required
                  />
                  <TextField
                    id="report-professional"
                    label="Profissional responsável"
                    value={form.professional}
                    onChange={(event) =>
                      setForm({ ...form, professional: event.target.value })
                    }
                    slotProps={{ htmlInput: { maxLength: 150 } }}
                    placeholder="Nome do profissional"
                    required
                  />
                  <TextField
                    id="report-content"
                    label="Texto do laudo"
                    value={form.content}
                    onChange={(event) =>
                      setForm({ ...form, content: event.target.value })
                    }
                    slotProps={{ htmlInput: { maxLength: 20000 } }}
                    multiline
                    rows={9}
                    placeholder="Digite o conteúdo do laudo"
                    required
                  />
                  <div className="report-form-footer">
                    <p>
                      <LockKeyhole size={15} aria-hidden="true" /> Rascunhos são
                      visíveis somente para a clínica.
                    </p>
                    <div className="report-actions">
                      <button
                        className="report-button secondary"
                        type="submit"
                        value="draft"
                        disabled={isSaving}
                      >
                        <Save size={16} aria-hidden="true" /> Salvar rascunho
                      </button>
                      <button
                        className="report-button primary"
                        type="submit"
                        value="publish"
                        disabled={isSaving}
                      >
                        <Send size={16} aria-hidden="true" />{" "}
                        {isSaving ? "Processando..." : "Publicar laudo"}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            )}
            {(showPublishedReport || showCancelledDraft) && report && (
              <section
                className="report-card report-document"
                aria-labelledby="report-content-title"
              >
                <div className="report-card-heading">
                  <div>
                    <p className="report-card-eyebrow">
                      {showPublishedReport ? "LAUDO PUBLICADO" : "RASCUNHO"}
                    </p>
                    <h2 id="report-content-title">{report.title}</h2>
                    <p>
                      {showPublishedReport && report.publishedAt
                        ? `Publicado em ${clinicDateTime.format(new Date(report.publishedAt))} · São Paulo`
                        : "Agendamento cancelado: este rascunho não pode ser editado ou publicado."}
                    </p>
                  </div>
                  <span className="report-card-icon">
                    <FileCheck2 size={20} aria-hidden="true" />
                  </span>
                </div>
                <div className="report-reading">
                  <div>
                    <span>Profissional responsável</span>
                    <strong>{report.professional}</strong>
                  </div>
                  <div>
                    <span>Texto do laudo</span>
                    <p>{report.content}</p>
                  </div>
                </div>
              </section>
            )}
            {!canEdit && !report && (
              <section className="report-card report-unavailable">
                <LockKeyhole size={24} aria-hidden="true" />
                <h2>Laudo não disponível</h2>
                <p>
                  {isClinic && appointment.status === "cancelled"
                    ? "Agendamentos cancelados não podem receber laudos."
                    : "O laudo ainda não está disponível para consulta."}
                </p>
              </section>
            )}
          </>
        )
      )}
      <ConfirmDialog
        open={showPublishConfirmation}
        title="Publicar laudo?"
        description="Após a publicação, o laudo não poderá ser editado e o agendamento não poderá ser cancelado."
        confirmLabel="Publicar laudo"
        isProcessing={isSaving}
        onClose={() => setShowPublishConfirmation(false)}
        onConfirm={() => void executeSave(true)}
      />
    </div>
  );
}
