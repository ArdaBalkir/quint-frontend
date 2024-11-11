import React, { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, CircularProgress, List, ListItem, IconButton } from '@mui/material';
import { CloudUpload, Delete, InsertDriveFile } from '@mui/icons-material';
import { formatFileSize } from '../utils/fileUtils';

const FileList = ({ files, onRemove }) => (
    <List sx={{ p: 0 }}>
        {files.map((file) => (
            <ListItem
                key={file.path}
                sx={{
                    py: 1,
                    px: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        backgroundColor: 'action.hover',
                    },
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': {
                        borderBottom: 'none',
                    }
                }}
                secondaryAction={
                    <IconButton
                        edge="end"
                        onClick={() => onRemove(file)}
                        sx={{
                            color: 'grey.500',
                            '&:hover': {
                                color: 'error.main',
                                backgroundColor: 'error.lighter',
                            }
                        }}
                    >
                        <Delete />
                    </IconButton>
                }
            >
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    gap: 2
                }}>
                    <InsertDriveFile sx={{
                        color: 'primary.main',
                        opacity: 0.7
                    }} />
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0 // Enables text truncation
                    }}>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {file.path}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                display: 'block',
                                mt: 0.5
                            }}
                        >
                            {formatFileSize(file.size)}
                        </Typography>
                    </Box>
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
        gap: 1,
        '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
        }
    }), [isDragActive, isDragReject]);

    const handleRemoveFile = useCallback((fileToRemove) => {
        const newFiles = acceptedFiles.filter(file => file !== fileToRemove);
        onFilesSelected(newFiles);
    }, [acceptedFiles, onFilesSelected]);

    return (
        <Box sx={{ width: '100%' }}>
            <Box {...getRootProps()} sx={dropzoneStyle}>
                <input {...getInputProps()} />
                <CloudUpload sx={{
                    fontSize: 40,
                    color: isDragActive ? 'primary.main' : 'action.active',
                    transition: 'color 0.2s ease'
                }} />
                <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                        transition: 'color 0.2s ease',
                        color: isDragActive ? 'primary.main' : 'text.secondary'
                    }}
                >
                    {isDragActive
                        ? "Drop the files here..."
                        : "Drag 'n' drop brain image files or click to browse"}
                </Typography>
            </Box>

            {isUploading && (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mt: 2,
                    p: 1.5,
                    backgroundColor: 'primary.lighter',
                    borderRadius: 1
                }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Uploading files...</Typography>
                </Box>
            )}

            {acceptedFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography
                        variant="subtitle2"
                        gutterBottom
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: 'text.primary',
                            fontWeight: 600
                        }}
                    >
                        Selected Files ({acceptedFiles.length})
                    </Typography>
                    <Paper
                        elevation={0}
                        sx={{
                            maxHeight: '30vh',
                            overflow: 'auto',
                            backgroundColor: 'grey.50',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            '&:hover': {
                                borderColor: 'grey.300'
                            }
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