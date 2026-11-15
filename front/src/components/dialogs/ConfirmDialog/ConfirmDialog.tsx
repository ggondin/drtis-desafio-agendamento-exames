import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isProcessing?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isProcessing = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : onClose}
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-description"
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id="confirmation-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-description">
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isProcessing}>
          Voltar
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={isProcessing}>
          {isProcessing ? "Aguarde..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
