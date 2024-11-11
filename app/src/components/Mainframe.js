
import React from 'react';
import { Box } from '@mui/material';
import QuintTable from './QuintTable';


const Mainframe = ({ url, native, token }) => {
    return (
        <Box
            sx={{
                width: '100%',
                height: '95.6vh',
                backgroundColor: '#333333',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
            }}
        >
            {native ? (
                // The native application goes here
                <Box sx={{
                    width: '98%',
                    height: '98%',
                    border: 'none',

                    borderRadius: '4px',
                }}>
                    <QuintTable token={token} />
                </Box>
            ) : (
                <Box
                    component="iframe"
                    sx={{
                        width: '98%',
                        height: '98%',
                        border: 'none',
                        bgcolor: 'white',
                        borderRadius: '4px',
                    }}
                    src={url || ''}
                    title="Mainframe Content"
                    allowFullScreen
                />
            )}
        </Box>
    )
};

export default Mainframe;
