import React, { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, CircularProgress, List, ListItem, IconButton } from '@mui/material';
import { CloudUpload, Delete } from '@mui/icons-material';
import { formatFileSize } from '../utils/fileUtils';

const FileList = ({ files, onRemove }) => (
    <List>
        {files.map((file) => (
            <ListItem
                key={file.path}
                secondaryAction={
                    <IconButton edge="end" onClick={() => onRemove(file)}>
                        <Delete />
                    </IconButton>
                }
            >
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2">{file.path}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                    </Typography>
                </Box>
            </ListItem>
        ))}
    </List>
);

const UploadZone = ({
    onFilesSelected,
    acceptedFileTypes = {
        'image/*': ['.tif', '.tiff']
    },
    isUploading = false
}) => {
    const onDrop = useCallback((acceptedFiles) => {
        onFilesSelected(acceptedFiles);
    }, [onFilesSelected]);

    const {
        acceptedFiles,
        getRootProps,
        getInputProps,
        isDragActive,
        isDragReject
    } = useDropzone({
        onDrop,
        accept: acceptedFileTypes
    });

    const dropzoneStyle = useMemo(() => ({
        padding: 3,
        textAlign: 'center',
        cursor: 'pointer',
        border: '2px dashed',
        borderColor: isDragReject ? 'error.main' : isDragActive ? 'primary.main' : 'grey.400',
        borderRadius: 2,
        backgroundColor: isDragActive ? 'action.hover' : 'transparent',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1
    }), [isDragActive, isDragReject]);

    const handleRemoveFile = useCallback((fileToRemove) => {
        const newFiles = acceptedFiles.filter(file => file !== fileToRemove);
        onFilesSelected(newFiles);
    }, [acceptedFiles, onFilesSelected]);

    return (
        <Box sx={{ width: '100%' }}>
            <Box {...getRootProps()} sx={dropzoneStyle}>
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 40, color: 'action.active' }} />
                <Typography variant="body1" color="text.secondary">
                    {isDragActive
                        ? "Drop the files here..."
                        : "Drag 'n' drop brain image files or click to browse"}
                </Typography>
            </Box>

            {isUploading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Uploading files...</Typography>
                </Box>
            )}

            {acceptedFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Selected Files ({acceptedFiles.length})
                    </Typography>
                    <Paper
                        sx={{
                            maxHeight: '30vh',
                            overflow: 'auto',
                            backgroundColor: 'grey.50'
                        }}
                    >
                        <FileList
                            files={acceptedFiles}
                            onRemove={handleRemoveFile}
                        />
                    </Paper>
                </Box>
            )}
        </Box>
    );
};

export default UploadZone;
