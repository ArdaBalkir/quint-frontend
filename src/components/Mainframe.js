
import React from 'react';
import { Box } from '@mui/material';

const Mainframe = ({ url }) => {
    return (
        <Box
            sx={{
                width: '100%',
                height: '95.6vh',
                backgroundColor: '#333333',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Box
                component="iframe"
                sx={{
                    width: '97.5%',
                    height: '95%',
                    border: 'none',
                    bgcolor: 'white'
                }}
                src={url || ''}
                title="Mainframe Content"
                allowFullScreen
            />
        </Box>
    );
};

export default Mainframe;
