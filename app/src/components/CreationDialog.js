
import React, { useState } from 'react';
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

    // Likely will disallow folder
    const [name, setName] = useState('');
    const [folder, setFolder] = useState(null);
    const [files, setFiles] = useState([]);


    const handleNameChange = (event) => {
        setName(event.target.value);
    };

    const handleFolderChange = (event) => {
        setFiles(Array.from(event.target.files));
    };


    const handleSubmit = () => {
        onSubmit({ name, folder });
        onClose();
    };

    // Currently listed files, should stay in component
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
                    Enter the name of the brain, input the Metadata and select the folder containing the brain files.
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
                    inputProps={{ webkitdirectory: "", directory: "", multiple: true }}
                    onChange={handleFolderChange}
                    sx={{ marginBottom: '20px' }}
                />
                <Typography sx={{ marginBottom: '10px' }}> Files uploaded: {files.length}</Typography>
                <FileList files={files} />
            </DialogContent>
            <DialogActions sx={{ padding: '20px' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Submit</Button>
            </DialogActions>
        </Dialog>
    );
};
