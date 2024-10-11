import React, { useState } from 'react';
import axios from 'axios';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Input,
    Typography,
} from '@mui/material';

export default function CreationDialog({ open, onClose, onSubmit, project }) {
    const [name, setName] = useState('');
    const [files, setFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const handleNameChange = (event) => {
        setName(event.target.value);
    };

    const handleMultipleChange = (event) => {
        setFiles([...event.target.files]);
    };

    const handleMultipleSubmit = async (event) => {
        event.preventDefault();
        const bucket_name = 'your-bucket-name';

        for (const file of files) {
            const object_name = file.name;
            try {
                // Get upload URL
                const urlResponse = await axios.put(`/v1/buckets/${bucket_name}/${object_name}`);
                const uploadUrl = urlResponse.data.url;

                // Upload file
                const formData = new FormData();
                formData.append('file', file);
                const config = {
                    headers: { 'content-type': 'multipart/form-data' },
                };
                const uploadResponse = await axios.post(uploadUrl, formData, config);
                console.log(uploadResponse.data);
            } catch (error) {
                console.error("Error uploading file: ", error);
            }
        }

        // Update uploaded files
        setUploadedFiles(files.map(file => file.name));
    };

    const handleSubmit = () => {
        onSubmit({ name, files: uploadedFiles });
        onClose();
    };

    const FileList = ({ files }) => (
        <ul>
            {files.map((file, index) => (
                <li key={index}>{file.name}</li>
            ))}
        </ul>
    );

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
                <Input
                    type="file"
                    inputProps={{ multiple: true }}
                    onChange={handleMultipleChange}
                    sx={{ marginBottom: '20px' }}
                />
                <Button onClick={handleMultipleSubmit}>Upload Files</Button>
                <Typography sx={{ marginBottom: '10px' }}> Files selected: {files.length}</Typography>
                <Typography sx={{ marginBottom: '10px' }}> Files uploaded: {uploadedFiles.length}</Typography>
                <FileList files={files} />
            </DialogContent>
            <DialogActions sx={{ padding: '20px' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Submit</Button>
            </DialogActions>
        </Dialog>
    );
}
