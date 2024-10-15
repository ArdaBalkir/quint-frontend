import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, List, ListItem, Paper, Button } from '@mui/material';
import { uploadToPath } from '../actions/handleCollabs';



export default function UploadZone({ brainname, onUploadComplete }) {
    const [filesToUpload, setFilesToUpload] = useState([]);
    const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
        onDrop: (acceptedFiles) => {
            setFilesToUpload(acceptedFiles);
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

    const handleUpload = async () => {

        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const userName = userInfo.username;
        const collabName = `${userName}-rwb`

        if (filesToUpload.length > 0) {
            try {
                const uploadedFiles = await Promise.all(
                    filesToUpload.map(async (file) => {
                        const path = `${collabName}/${file.name}`;
                        const result = await uploadToPath(path, file, brainname);
                        return { ...result, originalFile: file };
                    })
                );
                console.log(uploadedFiles);
                onUploadComplete(uploadedFiles);
                setFilesToUpload([]);
            } catch (error) {
                console.error('Error uploading files:', error);
            }
        }
    };
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
                <Typography variant="h6">Files</Typography>
                <Paper sx={{ maxHeight: 200, elevation: 0, boxShadow: 0, overflow: 'auto' }}>
                    <List>{files}</List>
                </Paper>
            </Box>
            <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={filesToUpload.length === 0}
                sx={{ mt: 2 }}
            >
                Upload Files
            </Button>
        </Box>
    );
}