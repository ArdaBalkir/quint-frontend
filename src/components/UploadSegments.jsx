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
import DownloadIcon from "@mui/icons-material/Download";
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
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  const segmentationPath = `${project?.name}/${brain?.name}/segmentations/`;

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

  const handleDownloadBackup = async () => {
    const collabName = localStorage.getItem("bucketName");
    if (!collabName || !project?.name || !brain?.name) {
      setInfoMessage({
        open: true,
        message: "Unable to determine the segmentation folder.",
        severity: "error",
      });
      return;
    }

    const baseUrl = "https://data-proxy-zipper.ebrains.eu/zip?container=";
    const containerUrl = `https%3A%2F%2Fdata-proxy.ebrains.eu%2Fapi%2Fv1%2Fbuckets%2F${encodeURIComponent(
      collabName,
    )}%3Fprefix%3D${encodeURIComponent(segmentationPath)}`;
    const zipperUrl = baseUrl + containerUrl;

    setIsDownloadingBackup(true);
    logger.info("Downloading segmentation backup", { zipperUrl });

    try {
      const response = await fetch(zipperUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`,
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.style.display = "none";
      anchor.href = url;
      anchor.download = `${brain.name}-segmentations-backup.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } catch (error) {
      logger.error("Error downloading segmentation backup", error);
      window.open(zipperUrl, "_blank");
    } finally {
      setIsDownloadingBackup(false);
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
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" component="div" sx={{ mb: 0.5 }}>
              Before uploading custom segmentations
            </Typography>
            <Typography variant="body2" component="div">
              For best results, make sure filenames use the section suffix format
              <strong> _s0000</strong> and that this folder contains only your
              custom segmentations, <strong>no webilastik generated segmentations.</strong> 
         
               <br/>Download a backup of your current segmentations before making changes.
               

            </Typography>
            <Button
              color="warning"
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadBackup}
              disabled={isDownloadingBackup || !token}
              sx={{ mt: 1.5 }}
            >
              {isDownloadingBackup
                ? "Preparing backup…"
                : "Download current segmentations"}
            </Button>
          </Alert>
          <DialogContentText sx={{ marginBottom: "12px" }}>
            Upload segmentation files to:
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
            {segmentationPath}
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
          <Button
            onClick={handleSubmit}
            disabled={isUploading || filesToUpload.length === 0}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
