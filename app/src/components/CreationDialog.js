
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
} from '@mui/material';

export default function CreationDialog({ open, onClose, onSubmit, project }) {
    const [name, setName] = useState('');
    const [folder, setFolder] = useState(null);

    const handleNameChange = (event) => {
        setName(event.target.value);
    };

    const handleFolderChange = (event) => {
        setFolder(event.target.files[0]);
    };

    const handleSubmit = () => {
        onSubmit({ name, folder });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ style: { minHeight: '80vh' } }}>
            <DialogTitle>Create a new Brain in Project {project.name}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Enter the name of the brain, input the Metadata and select the folder containing the brain files.
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label="Name"
                    type="text"
                    fullWidth
                    variant="standard"
                    value={name}
                    onChange={handleNameChange}
                />
                <Input
                    type="file"
                    inputProps={{ webkitdirectory: "", directory: "" }}
                    onChange={handleFolderChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Submit</Button>
            </DialogActions>
        </Dialog>
    );
};
