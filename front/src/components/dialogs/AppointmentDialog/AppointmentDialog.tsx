import { useState, type FormEvent } from "react";
import type { Dayjs } from "dayjs";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { clinicTimeZone } from "../../../config/date";
import { createAppointment } from "../../../services/appointments";
import type { ExamType, Patient } from "../../../types/appointments";
import "./AppointmentDialog.css";

type AppointmentDialogProps = {
  open: boolean;
  patients: Patient[];
  examTypes: ExamType[];
  catalogError: string;
  onClose: () => void;
  onCreated: () => void;
};

export function AppointmentDialog({
  open,
  patients,
  examTypes,
  catalogError,
  onClose,
  onCreated,
}: AppointmentDialogProps) {
  const [patientId, setPatientId] = useState("");
  const [examTypeId, setExamTypeId] = useState("");
  const [date, setDate] = useState<Dayjs | null>(null);
  const [time, setTime] = useState<Dayjs | null>(null);
  const [dateInvalid, setDateInvalid] = useState(false);
  const [timeInvalid, setTimeInvalid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm(): void {
    setPatientId("");
    setExamTypeId("");
    setDate(null);
    setTime(null);
    setError("");
    setDateInvalid(false);
    setTimeInvalid(false);
  }

  function handleClose(): void {
    if (isSaving) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError("");
    if (
      !patientId ||
      !examTypeId ||
      !date?.isValid() ||
      !time?.isValid() ||
      dateInvalid ||
      timeInvalid ||
      time.minute() % 30 !== 0
    ) {
      setError(
        "Preencha os campos com uma data válida e um horário de 30 em 30 minutos.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await createAppointment({
        patientId: Number(patientId),
        examTypeId: Number(examTypeId),
        startsAt: `${date.format("YYYY-MM-DD")}T${time.format("HH:mm")}:00-03:00`,
      });
      resetForm();
      onCreated();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível criar o agendamento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : handleClose}
      aria-labelledby="appointment-dialog-title"
      fullWidth
      maxWidth="sm"
      sx={{
        "& .MuiDialog-container": {
          alignItems: { xs: "flex-end", sm: "center" },
        },
        "& .MuiDialog-paper": {
          margin: { xs: 0, sm: 4 },
          width: "100%",
          borderRadius: { xs: "18px 18px 0 0", sm: "12px" },
        },
      }}
    >
      <DialogTitle id="appointment-dialog-title">Novo agendamento</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Preencha os dados para reservar um horário.
        </DialogContentText>
        {(error || catalogError) && (
          <p className="appointment-dialog-error" role="alert">
            {error || catalogError}
          </p>
        )}
        <form
          id="appointment-form"
          className="appointment-dialog-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <TextField
            select
            label="Paciente"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            required
          >
            {patients.map((patient) => (
              <MenuItem key={patient.id} value={String(patient.id)}>
                {patient.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Tipo de exame"
            value={examTypeId}
            onChange={(event) => setExamTypeId(event.target.value)}
            required
          >
            {examTypes.map((exam) => (
              <MenuItem key={exam.id} value={String(exam.id)}>
                {exam.name}
              </MenuItem>
            ))}
          </TextField>
          <DatePicker
            label="Data"
            value={date}
            onChange={setDate}
            onError={(reason) => setDateInvalid(reason !== null)}
            timezone={clinicTimeZone}
            disablePast
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
                required: true,
                helperText: dateInvalid
                  ? "Informe uma data válida a partir de hoje."
                  : undefined,
              },
            }}
          />
          <TimePicker
            label="Horário"
            value={time}
            onChange={setTime}
            onError={(reason) => setTimeInvalid(reason !== null)}
            timezone={clinicTimeZone}
            ampm={false}
            minutesStep={30}
            timeSteps={{ minutes: 30 }}
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
                required: true,
                helperText: timeInvalid
                  ? "Selecione um horário de 30 em 30 minutos."
                  : undefined,
              },
            }}
          />
          <p className="appointment-dialog-hint">
            Horários de 30 em 30 minutos · Fuso de São Paulo
          </p>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Voltar
        </Button>
        <Button
          form="appointment-form"
          type="submit"
          variant="contained"
          disabled={isSaving || !!catalogError}
        >
          {isSaving ? "Salvando..." : "Confirmar agendamento"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
