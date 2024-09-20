
import React from 'react';
import { Box } from '@mui/material';
import Fab from '@mui/material/Fab';
import { Menu, MenuItem } from '@mui/material';
import ChangeCircleOutlinedIcon from '@mui/icons-material/ChangeCircleOutlined';

const Mainframe = ({ url, menuItems }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

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
            <Fab
                variant="extended"
                onClick={handleClick}
                sx={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    bgcolor: 'white',
                    scale: 0.8,
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                }}
            >
                <ChangeCircleOutlinedIcon sx={{ mr: 1 }} />
                Change Brain
            </Fab>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                {menuItems ? (
                    menuItems.map((item, index) => (
                        <MenuItem key={index} onClick={handleClose}>
                            {item}
                        </MenuItem>
                    ))
                ) : (
                    <>
                        <MenuItem onClick={handleClose}>Placeholder 1</MenuItem>
                        <MenuItem onClick={handleClose}>Placeholder 2</MenuItem>
                        <MenuItem onClick={handleClose}>Placeholder 3</MenuItem>
                    </>
                )}
            </Menu>
        </Box>
    );
};

export default Mainframe;
