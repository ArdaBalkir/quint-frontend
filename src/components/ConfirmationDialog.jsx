import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

/**
 * Reusable confirmation dialog with optional text verification
 * @param {boolean} open - Whether the dialog is open
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message/description
 * @param {string} confirmText - Text that must be typed to confirm (optional)
 * @param {string} confirmInput - Current value of confirmation input
 * @param {function} onConfirmInputChange - Handler for confirmation input change
 * @param {function} onConfirm - Handler for confirm action
 * @param {function} onCancel - Handler for cancel action
 * @param {string} confirmLabel - Label for confirm button (default: "Delete")
 * @param {string} cancelLabel - Label for cancel button (default: "Cancel")
 * @param {string} confirmColor - Color of confirm button (default: "error")
 * @param {boolean} loading - Whether the action is in progress (default: false)
 */
const ConfirmationDialog = ({
  open,
  title,
  message,
  confirmText = null,
  confirmInput = "",
  onConfirmInputChange,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmColor = "error",
  loading = false,
}) => {
  const isConfirmDisabled = confirmText ? confirmInput !== confirmText : false;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{message}</DialogContentText>
        {confirmText && (
          <TextField
            autoFocus
            fullWidth
            label={`Type "${confirmText}" to confirm`}
            value={confirmInput}
            onChange={(e) => onConfirmInputChange(e.target.value)}
            variant="outlined"
            disabled={loading}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          disabled={isConfirmDisabled || loading}
        >
          {loading ? "Processing..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
