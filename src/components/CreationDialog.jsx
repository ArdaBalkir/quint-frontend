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
import { uploadToPath } from "../actions/handleCollabs";
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
        let completedUploads = 0;
        const batchSize = 4; // Process 4 files at a time
        const allResults = [];

        // Process files in batches of 4
        for (let i = 0; i < filesToUpload.length; i += batchSize) {
          // Get the current batch of files
          const batch = filesToUpload.slice(i, i + batchSize);

          // Upload this batch in parallel
          const batchPromises = batch.map((file) =>
            uploadToPath(
              token,
              collabName,
              project.name,
              name + "/raw_images/",
              file
            ).then((result) => {
              // Increment completed count and update progress
              completedUploads++;
              setUploadProgress(
                (completedUploads / filesToUpload.length) * 100
              );
              return { ...result, originalFile: file };
            })
          );

          // Wait for current batch to complete before moving to next batch
          const batchResults = await Promise.all(batchPromises);
          allResults.push(...batchResults);
        }

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
            Enter the name of the series, or click on already created serie,
            upload files, choose and click submit.
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
