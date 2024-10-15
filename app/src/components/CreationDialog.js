import React, { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Typography,
    Box
} from '@mui/material';
import UploadZone from './UploadZone';


export default function CreationDialog({ open, onClose, onSubmit, project }) {
    const [name, setName] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const handleNameChange = (event) => {
        setName(event.target.value);
    };

    const handleUploadComplete = (files) => {
        setUploadedFiles(files);
    };

    const handleSubmit = () => {
        onSubmit({ name, files: uploadedFiles });
        onClose();
    };

    useEffect(() => {
        console.log(project);
    });

    return (
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
                        brain_name={name}
                        onUploadComplete={handleUploadComplete}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ padding: '20px' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Submit</Button>
            </DialogActions>
        </Dialog>
    );
}
