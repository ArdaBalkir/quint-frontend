import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, List, ListItem, Paper, Button } from '@mui/material';

function UploadZone({ onFilesSelected }) {
    const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
        onDrop: (acceptedFiles) => {
            onFilesSelected(acceptedFiles);
        }
    });

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const files = acceptedFiles.map(file => (
        <ListItem key={file.path}>
            <Typography variant="body2">
                {file.path} - {formatFileSize(file.size)}
            </Typography>
        </ListItem>
    ));

    return (
        <Box sx={{ width: '100%', maxWidth: 500, margin: 'auto' }}>
            <Box
                {...getRootProps()}
                sx={{
                    padding: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '2px dashed gray',
                    backgroundColor: 'transparent',
                    '&:hover': {
                        backgroundColor: 'action.hover',
                    },
                }}
            >
                <input {...getInputProps()} />
                <Typography color='gray'>Drag 'n' drop brain image files or click to browse</Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Selected Files</Typography>
                <Paper sx={{ maxHeight: 200, elevation: 0, boxShadow: 0, overflow: 'auto' }}>
                    <List>{files}</List>
                </Paper>
            </Box>
        </Box>
    );
}

export default UploadZone;
