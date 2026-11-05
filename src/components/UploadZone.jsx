import React, { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  IconButton,
  Alert,
} from "@mui/material";
import { CloudUpload, Delete, InsertDriveFile } from "@mui/icons-material";
import { formatFileSize } from "../utils/fileUtils";

const FileList = ({ files, errors, onRemove, disabled }) => (
  <List sx={{ p: 0 }}>
    {files.map((file, index) => (
      <ListItem
        key={index}
        sx={{
          py: 1,
          px: 2,
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: "action.hover",
          },
          borderBottom: "1px solid",
          borderColor: "divider",
          "&:last-child": {
            borderBottom: "none",
          },
        }}
        secondaryAction={
          <IconButton
            edge="end"
            onClick={() => onRemove(index)}
            disabled={disabled}
            aria-label={`Remove ${file.name}`}
            sx={{
              color: "grey.500",
              "&:hover": {
                color: "error.main",
                backgroundColor: "error.lighter",
              },
            }}
          >
            <Delete />
          </IconButton>
        }
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            gap: 2,
          }}
        >
          <InsertDriveFile
            sx={{
              color: "primary.main",
              opacity: 0.7,
            }}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0, // Enables text truncation
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {file.path || file.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                mt: 0.5,
              }}
            >
              {formatFileSize(file.size)}
            </Typography>
            {errors[index] && (
              <Typography variant="caption" color="error" role="alert">
                {errors[index]}
              </Typography>
            )}
          </Box>
        </Box>
      </ListItem>
    ))}
  </List>
);

const UploadZone = ({
  onFilesSelected,
  acceptedFileTypes = {
    "image/*": [".tif", ".tiff", ".jpg", ".jpeg", ".png", ".dzip"],
  },
  isUploading = false,
  files: selectedFiles,
  fileErrors = [],
}) => {
  const [localFiles, setLocalFiles] = useState([]);
  const [rejections, setRejections] = useState([]);
  const files = selectedFiles ?? localFiles;

  const updateFiles = useCallback((nextFiles) => {
    setLocalFiles(nextFiles);
    onFilesSelected(nextFiles);
  }, [onFilesSelected]);

  const handleRemove = (index) => {
    updateFiles(files.filter((_, fileIndex) => fileIndex !== index));
  };

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      setRejections(rejectedFiles);
      updateFiles([...files, ...acceptedFiles]);
    },
    [files, updateFiles]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    disabled: isUploading,
  });

  const dropzoneStyle = useMemo(
    () => ({
      padding: 3,
      textAlign: "center",
      cursor: "pointer",
      border: "2px dashed",
      borderColor: isDragReject
        ? "error.main"
        : isDragActive
        ? "primary.main"
        : "grey.400",
      borderRadius: 2,
      backgroundColor: isDragActive ? "action.hover" : "transparent",
      transition: "all 0.2s ease",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      "&:hover": {
        borderColor: "primary.main",
        backgroundColor: "action.hover",
      },
    }),
    [isDragActive, isDragReject]
  );

  return (
    <Box sx={{ width: "100%" }}>
      <Box {...getRootProps()} sx={dropzoneStyle}>
        <input {...getInputProps()} />
        <CloudUpload
          sx={{
            fontSize: 40,
            color: isDragActive ? "primary.main" : "action.active",
            transition: "color 0.2s ease",
          }}
        />
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            transition: "color 0.2s ease",
            color: isDragActive ? "primary.main" : "text.secondary",
          }}
        >
          {isDragActive
            ? "Drop the files here..."
            : "Drag 'n' drop brain image files or click to browse"}
        </Typography>
      </Box>

      {rejections.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Some files were not added: {rejections.map(({ file }) => file.name).join(", ")}.
          Please select a supported image format.
        </Alert>
      )}

      {isUploading && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mt: 2,
            p: 1.5,
            backgroundColor: "primary.lighter",
            borderRadius: 1,
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2">Uploading files...</Typography>
        </Box>
      )}

      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.primary",
              fontWeight: 600,
            }}
          >
            Selected Files ({files.length})
          </Typography>
          <Paper
            elevation={0}
            sx={{
              maxHeight: "30vh",
              overflow: "auto",
              backgroundColor: "grey.50",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              "&:hover": {
                borderColor: "grey.300",
              },
            }}
          >
            <FileList files={files} errors={fileErrors} onRemove={handleRemove} disabled={isUploading} />
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default UploadZone;
