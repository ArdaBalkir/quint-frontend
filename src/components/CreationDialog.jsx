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
} from "@mui/material";
import { uploadToPathWithProgress } from "../actions/handleCollabs";
import UploadZone from "./UploadZone";

export default function CreationDialog({
  open,
  onClose,
  project,
  token,
  brainEntries,
  onUploadComplete,
}) {
  const { showError, showWarning, showSuccess, showInfo } = useNotification();

  const [name, setName] = useState("");
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [editBrainsList, setEditBrainsList] = useState([]);

  // For upload feedback of images to series
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

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
      try {
        // Calculate total size for granular progress
        const totalBytes = filesToUpload.reduce(
          (sum, file) => sum + file.size,
          0
        );
        // Track bytes uploaded per file
        const uploadedBytes = new Map();

        const updateTotalProgress = () => {
          const totalUploaded = Array.from(uploadedBytes.values()).reduce(
            (sum, bytes) => sum + bytes,
            0
          );
          const percentage =
            totalBytes > 0 ? (totalUploaded / totalBytes) * 100 : 0;
          setUploadProgress(percentage);
        };

        // Upload all files in parallel with granular progress tracking
        const uploadPromises = filesToUpload.map((file, index) => {
          // Initialize this file's progress
          uploadedBytes.set(index, 0);

          return uploadToPathWithProgress(
            token,
            collabName,
            project.name,
            name + "/raw_images/",
            file,
            (loaded, total) => {
              // Update this file's uploaded bytes and recalculate total
              uploadedBytes.set(index, loaded);
              updateTotalProgress();
            }
          ).then((result) => ({ ...result, originalFile: file }));
        });

        const allResults = await Promise.all(uploadPromises);

        setIsUploading(false);
        showSuccess("Files uploaded successfully");
        return allResults;
      } catch (error) {
        setIsUploading(false);
        logger.error("Error uploading files", error);
        showError("Error uploading files");
        throw error;
      }
    }
    setIsUploading(false);
    return [];
  };

  const handleSubmit = async () => {
    if (!name || name.trim() === "") {
      showError("An image series name is required");
      return;
    }

    if (filesToUpload.length === 0) {
      showWarning("Please select files to upload");
      return;
    }

    try {
      await uploadFiles();
      onUploadComplete?.();
      onClose();
    } catch (error) {
      logger.error("Error in handleSubmit", error);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
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

          <UploadZone onFilesSelected={handleFilesSelected} />
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
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
