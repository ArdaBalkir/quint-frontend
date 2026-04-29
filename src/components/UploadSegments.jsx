import logger from "../utils/logger.js";
import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Box,
  Alert,
  LinearProgress,
  Typography,
} from "@mui/material";
import { uploadToPath } from "../actions/handleCollabs";
import UploadZone from "./UploadZone";

export default function UploadSegments({
  open,
  onClose,
  project,
  token,
  brain,
  onUploadComplete,
}) {
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [infoMessage, setInfoMessage] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadPath = `${project?.name}/${brain?.name}/segments/`;

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
        const uploadedFiles = await Promise.all(
          filesToUpload.map((file) =>
            uploadToPath(
              token,
              collabName,
              project.name,
              `${brain.name}/segmentations/`,
              file,
            ).then((result) => {
              completedUploads += 1;
              setUploadProgress(
                (completedUploads / filesToUpload.length) * 100,
              );
              return { ...result, originalFile: file };
            })
          )
        );
        setIsUploading(false);
        setInfoMessage({
          open: true,
          message: "Segmentations uploaded successfully!",
          severity: "success",
        });
        return uploadedFiles;
      } catch (error) {
        setIsUploading(false);
        logger.error("Error uploading segmentations", error);
        setInfoMessage({
          open: true,
          message: "Error uploading segmentations",
          severity: "error",
        });
        throw error;
      }
    }
    setIsUploading(false);
    return [];
  };

  const handleSubmit = async () => {
    try {
      await uploadFiles();
      onUploadComplete?.();
      onClose();
    } catch (error) {
      logger.error("Error in handleSubmit (segments)", error);
    }
  };

  return (
    <>
      <Snackbar
        open={infoMessage.open}
        autoHideDuration={6000}
        onClose={() => setInfoMessage({ ...infoMessage, open: false })}
      >
        <Alert
          onClose={() => setInfoMessage({ ...infoMessage, open: false })}
          severity={infoMessage.severity}
          sx={{ width: "100%" }}
        >
          {infoMessage.message}
        </Alert>
      </Snackbar>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { minHeight: "60vh" } }}
      >
        <DialogTitle>Upload your own segmentations</DialogTitle>
        <DialogContent sx={{ padding: "20px" }}>
          <DialogContentText sx={{ marginBottom: "20px" }}>
            upload segmentation files...
          </DialogContentText>
          <Typography
            variant="body2"
            sx={{
              backgroundColor: "grey.100",
              p: 2,
              borderRadius: 1,
              fontFamily: "monospace",
              mb: 3,
            }}
          >
            {uploadPath}
          </Typography>

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
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Upload</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
