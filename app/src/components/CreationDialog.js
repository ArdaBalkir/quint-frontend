import React, { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Box,
    Snackbar
} from '@mui/material';
import { uploadToPath } from '../actions/handleCollabs';
import UploadZone from './UploadZone';

export default function CreationDialog({ open, onClose, onSubmit, project, updateProjects }) {
    const [name, setName] = useState('');
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const handleNameChange = (event) => {
        setName(event.target.value);
    };

    const handleFilesSelected = (files) => {
        setFilesToUpload(files);
    };

    const uploadFiles = async () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const userName = userInfo.username;
        const collabName = `${userName}-rwb`;

        if (filesToUpload.length > 0) {
            try {
                const uploadedFiles = await Promise.all(
                    filesToUpload.map(async (file) => {
                        const result = await uploadToPath(collabName, project.name, name, file);
                        return { ...result, originalFile: file };
                    })
                );
                return uploadedFiles;
            } catch (error) {
                console.error('Error uploading files:', error);
                throw error;
            }
        }
        return [];
    };

    const handleSubmit = async () => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const userName = userInfo.username;
        const collabName = `${userName}-rwb`;
        try {
            const uploadedFiles = await uploadFiles();
            if (typeof onSubmit === 'function') {
                onSubmit({ name, files: uploadedFiles });
            }
            setSnackbarMessage('Brain created and files uploaded successfully!');
            setSnackbarOpen(true);
            updateProjects(collabName);
            onClose();
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            setSnackbarMessage('Error creating brain or uploading files. Please try again.');
            setSnackbarOpen(true);
        }
    };
    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };
    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ style: { minHeight: '80vh' } }}>
                <DialogTitle>Create a new Brain in Project {project?.name || ''}</DialogTitle>
                <DialogContent sx={{ padding: '20px' }}>
                    <DialogContentText sx={{ marginBottom: '20px' }}>
                        Enter the name of the brain, input the Metadata and select the files for the brain.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={name}
                        onChange={handleNameChange}
                        sx={{ marginBottom: '20px' }}
                    />
                    <Box sx={{ width: '50%' }}>
                        <UploadZone
                            onFilesSelected={handleFilesSelected}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ padding: '20px' }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Submit</Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                message={snackbarMessage}
            />
        </>
    );
}
