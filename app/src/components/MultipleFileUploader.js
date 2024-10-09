import React, { useState } from 'react';
import { Button, List, ListItem, ListItemText, Paper, Snackbar, Typography } from '@mui/material';
import { styled } from '@mui/system';
import MuiAlert from '@mui/material/Alert';

const StyledPaper = styled(Paper)(({ theme }) => ({
    maxHeight: 200,
    overflow: 'auto',
    marginBottom: theme.spacing(2),
}));

const MultipleFileUploader = (url) => {
    const [files, setFiles] = useState(null);
    const [status, setStatus] = useState('initial');
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setStatus('initial');
            setFiles(e.target.files);
        }
    };

    const handleUpload = async () => {
        if (files) {
            setStatus('uploading');

            const formData = new FormData();
            [...files].forEach((file) => {
                formData.append('files', file);
            });

            try {
                const result = await fetch(url, {
                    method: 'POST',
                    body: formData,
                });

                const data = await result.json();

                console.log(data);
                setStatus('success');
                setOpenSnackbar(true);
            } catch (error) {
                console.error(error);
                setStatus('fail');
                setOpenSnackbar(true);
            }
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenSnackbar(false);
    };

    return (
        <>
            <input
                accept="*/*"
                style={{ display: 'none' }}
                id="raised-button-file"
                multiple
                type="file"
                onChange={handleFileChange}
            />
            <label htmlFor="raised-button-file">
                <Button variant="contained" component="span">
                    Choose Files
                </Button>
            </label>

            {files && (
                <StyledPaper>
                    <List>
                        {[...files].map((file, index) => (
                            <ListItem key={file.name}>
                                <ListItemText
                                    primary={`File ${index + 1}: ${file.name}`}
                                    secondary={`Type: ${file.type}, Size: ${file.size} bytes`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </StyledPaper>
            )}

            {files && (
                <Button
                    onClick={handleUpload}
                    variant="contained"
                    color="primary"
                >
                    Upload {files.length > 1 ? 'files' : 'a file'}
                </Button>
            )}

            <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <MuiAlert onClose={handleCloseSnackbar} severity={status === 'success' ? 'success' : 'error'} sx={{ width: '100%' }}>
                    {status === 'success' ? 'File uploaded successfully!' : 'File upload failed!'}
                </MuiAlert>
            </Snackbar>

            {status === 'uploading' && (
                <Typography variant="body1" style={{ marginTop: '1rem' }}>
                    Uploading selected file...
                </Typography>
            )}
        </>
    );
};

export default MultipleFileUploader;