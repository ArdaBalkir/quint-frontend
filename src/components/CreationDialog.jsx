import { trackUsage } from "../utils/analytics.js";
import logger from "../utils/logger.js";
import React, { useEffect, useState } from "react";
import { useNotification } from "../contexts/NotificationContext";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Box,
  Autocomplete,
  LinearProgress,
  Alert,
} from "@mui/material";
import { fetchBrainStatsNormalized, uploadToPathWithProgress } from "../actions/handleCollabs";
import UploadZone from "./UploadZone";
import { SECTION_NAMING_HELP, validateSectionNames } from "../utils/sectionNames.js";

async function fetchSeriesImageNames(token, collabName, projectName, seriesName, signal) {
  const prefix = `${projectName}/${seriesName}/`.replace(/\/+/g, "/");
  const stats = await fetchBrainStatsNormalized(token, collabName, prefix, "raw_images", { signal });
  return (stats.rawImages?.tiffs || []).map((file) => file.name);
}

export default function CreationDialog({
  open,
  onClose,
  project,
  token,
  brainEntries,
  onUploadComplete,
}) {
  const { showError, showWarning, showSuccess } = useNotification();

  const [name, setName] = useState("");
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [editBrainsList, setEditBrainsList] = useState([]);

  // For upload feedback of images to series
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [existingImages, setExistingImages] = useState({ key: null, names: [], error: null });
  const [validationAttempt, setValidationAttempt] = useState(0);
  const seriesName = name.trim();
  const projectName = project?.name;
  const collabName = localStorage.getItem("bucketName");
  const seriesKey = JSON.stringify([collabName, projectName, seriesName]);
  const inventoryReady = existingImages.key === seriesKey && !existingImages.error;
  const fileErrors = validateSectionNames(
    filesToUpload.map((file) => file.name),
    inventoryReady ? existingImages.names : [],
  );
  const hasNamingErrors = fileErrors.some(Boolean);

  useEffect(() => {
    if (!open || !seriesName || !projectName) {
      setExistingImages({ key: null, names: [], error: null });
      return;
    }
    const controller = new AbortController();
    setExistingImages({ key: null, names: [], error: null });
    const timeout = setTimeout(async () => {
      try {
        const names = await fetchSeriesImageNames(
          token, collabName, projectName, seriesName, controller.signal,
        );
        if (!controller.signal.aborted) {
          setExistingImages({ key: seriesKey, names, error: null });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setExistingImages({ key: seriesKey, names: [], error: "Could not check existing section numbers. Retry before uploading." });
        }
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, token, collabName, projectName, seriesName, seriesKey, validationAttempt]);

  useEffect(() => {
    if (brainEntries) {
      const editBrains = brainEntries.map((entry) => entry.name);
      setEditBrainsList(editBrains);
      logger.debug("Edit brains list", { count: editBrains?.length });
    }
  }, [brainEntries]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes fully otherwise stuck with the old uploads
      setFilesToUpload([]);
      setName("");
      setUploadProgress(0);
    }
  }, [open]);

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  // Allow user to unselect files
  const handleFilesSelected = (files) => {
    setFilesToUpload(files);
  };

  const uploadFiles = async () => {
    const collabName = localStorage.getItem("bucketName");
    setIsUploading(true);
    setUploadProgress(0);

    if (filesToUpload.length > 0) {
      trackUsage("images", "started", filesToUpload.length);
      try {
        // Calculate total size for granular progress
        const totalBytes = filesToUpload.reduce(
          (sum, file) => sum + file.size,
          0
        );
        // Track bytes uploaded per file
        const uploadedBytes = new Array(filesToUpload.length).fill(0);

        const updateTotalProgress = () => {
          const totalUploaded = uploadedBytes.reduce(
            (sum, bytes) => sum + bytes,
            0
          );
          const percentage =
            totalBytes > 0 ? (totalUploaded / totalBytes) * 100 : 0;
          setUploadProgress(percentage);
        };

        // Upload all files in parallel with granular progress tracking
        const uploadPromises = filesToUpload.map((file, index) => {
          return uploadToPathWithProgress(
            token,
            collabName,
            project.name,
            seriesName + "/raw_images/",
            file,
            (loaded, total) => {
              // Update this file's uploaded bytes and recalculate total
              uploadedBytes[index] = loaded;
              updateTotalProgress();
            }
          ).then((result) => ({ ...result, originalFile: file }));
        });

        const allResults = await Promise.all(uploadPromises);

        setIsUploading(false);
        trackUsage("images", "succeeded", filesToUpload.length);
        showSuccess("Files uploaded successfully");
        return allResults;
      } catch (error) {
        setIsUploading(false);
        trackUsage("images", "failed", filesToUpload.length);
        logger.error("Error uploading files", error);
        throw error;
      }
    }
    setIsUploading(false);
    return [];
  };

  const handleSubmit = async () => {
    if (isUploading) return;
    if (!name || name.trim() === "") {
      showError("An image series name is required");
      return;
    }

    if (filesToUpload.length === 0) {
      showWarning("Please select files to upload");
      return;
    }

    if (!inventoryReady || hasNamingErrors) {
      showError("Resolve filename errors and check existing section numbers before uploading.");
      return;
    }

    setIsUploading(true);
    try {
      // Recheck immediately before writing in case the series changed while open.
      const names = await fetchSeriesImageNames(token, collabName, projectName, seriesName);
      setExistingImages({ key: seriesKey, names, error: null });
      if (validateSectionNames(filesToUpload.map((file) => file.name), names).some(Boolean)) {
        showError("These section numbers are already in use. Resolve the highlighted conflicts.");
        return;
      }
      await uploadFiles();
      onUploadComplete?.();
      onClose();
    } catch (error) {
      logger.error("Error in handleSubmit", error);
      showError("Could not verify section numbers or upload files. Please retry.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={isUploading ? undefined : onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { minHeight: "80vh" } }}
      >
        <DialogTitle>
          Upload an image series in {project?.name || ""}
        </DialogTitle>
        <DialogContent sx={{ padding: "20px" }}>
          <DialogContentText sx={{ marginBottom: "20px" }}>
            Enter the name of the series, or select an existing series, upload
            files and click submit.
          </DialogContentText>
          <Autocomplete
            disabled={isUploading}
            freeSolo
            id="brain-name-combo"
            options={editBrainsList}
            value={name}
            onChange={(event, newValue) => {
              // Agnostic replace to handle both selection from dropdown and manual entry
              if (newValue) {
                handleNameChange({ target: { value: newValue } });
              }
            }}
            onInputChange={(event, newValue) => {
              handleNameChange({ target: { value: newValue } });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                margin="dense"
                label="Name"
                variant="outlined"
                fullWidth
                sx={{ marginBottom: "20px" }}
              />
            )}
            sx={{
              "& .MuiAutocomplete-listbox": {
                "&::-webkit-scrollbar": {
                  height: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "#bbb",
                  borderRadius: "4px",
                },
              },
            }}
          />

          <Alert severity="info" sx={{ mb: 2 }}>{SECTION_NAMING_HELP}</Alert>
          {seriesName && !inventoryReady && (
            <Alert severity={existingImages.key === seriesKey && existingImages.error ? "error" : "info"} sx={{ mb: 2 }}
              action={existingImages.key === seriesKey && existingImages.error ? (
                <Button onClick={() => {
                  setExistingImages({ key: null, names: [], error: null });
                  setValidationAttempt((attempt) => attempt + 1);
                }}>Retry</Button>
              ) : undefined}
            >
              {existingImages.key === seriesKey && existingImages.error
                ? existingImages.error
                : "Checking existing section numbers..."}
            </Alert>
          )}
          {hasNamingErrors && (
            <Alert severity="error" sx={{ mb: 2 }}>Fix or remove files with invalid or overlapping section numbers before submitting.</Alert>
          )}
          <UploadZone files={filesToUpload} fileErrors={fileErrors} onFilesSelected={handleFilesSelected} isUploading={isUploading} />
          {isUploading && (
            <Box sx={{ width: "100%", mt: 2 }}>
              <DialogContentText>
                Uploading: {Math.round(uploadProgress)}%
              </DialogContentText>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: "20px" }}>
          <Button onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || !seriesName || !filesToUpload.length || !inventoryReady || hasNamingErrors}>
            {isUploading ? "Uploading..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
