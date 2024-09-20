import React, { useState } from 'react';
import {
    AppBar,
    Box,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ConstructionIcon from '@mui/icons-material/Construction';
import DescriptionIcon from '@mui/icons-material/Description';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import Mainframe from './Mainframe';

import handleLogin from '../actions/handleLogin';

// Variable loading for URLs
const WEBALIGN_URL = process.env.REACT_APP_WEBALIGN_URL;
const WEBWARP_URL = process.env.REACT_APP_WEBWARP_URL;
const WEBNUTIL_URL = process.env.REACT_APP_WEBNUTIL_URL;
const FILECREATOR = process.env.REACT_APP_FILECREATOR_URL;
const LOCALIZOOM = process.env.REACT_APP_LOCALIZOOM_URL;

console.log(`You are running this application in ${process.env.NODE_ENV} mode`)

console.log(`Logging in`)

const Header = () => {
    const [anchorEl1, setAnchorEl1] = useState(null);
    const [anchorEl2, setAnchorEl2] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    // Control for the iframe, further divergence from an iframe can be done within the Mainframe component
    const [currentUrl, setCurrentUrl] = useState(null);

    const handleMenu1Click = (event) => {
        setAnchorEl1(event.currentTarget);
    };

    const handleMenu2Click = (event) => {
        setAnchorEl2(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl1(null);
        setAnchorEl2(null);
    };

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleFrameChange = (url) => {
        console.log(`Changing frame to ${url}`);
        setCurrentUrl(url);
        handleMenuClose();
    };

    const sharedMenuSx = {
        '& .MuiPaper-root': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
        },
        '& .MuiMenuItem-root': {
            '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
        },
    };

    const sharedListItemSx = {
        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
    };



    const [value, setValue] = React.useState('one');

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };


    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" sx={{
                backgroundColor: 'white',
                color: 'black',
                boxShadow: '0px 3px 2px rgba(0, 0, 0, 0.12)',
                fontFamily: 'Roboto, sans-serif'
            }}>
                <Toolbar variant="dense">
                    <Tabs
                        value={value}
                        onChange={handleChange}
                        textColor="black"
                        indicatorColor="secondary"
                        aria-label="secondary tabs example"
                        TabIndicatorProps={{
                            style: {
                                backgroundColor: "red",
                                borderRadius: '4px',
                                justifyContent: 'center',
                                height: 3
                            }
                        }}
                    >
                        <Tab value="one" label="File Creator" />
                        <Tab value="two" label="WebAlign" />
                        <Tab value="three" label="WebWarp" />
                    </Tabs>

                    <Box sx={{ flexGrow: 1 }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', height: 'auto' }}>
                        <Tooltip title="Tools">
                            <IconButton
                                edge="start"
                                color="inherit"
                                aria-label="tools"
                                onClick={handleMenu1Click}
                            >
                                <ConstructionIcon />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            anchorEl={anchorEl1}
                            open={Boolean(anchorEl1)}
                            onClose={handleMenuClose}
                            sx={sharedMenuSx}
                        >
                            <List dense='true'>
                                <ListItem button onClick={() => handleFrameChange(FILECREATOR)} sx={sharedListItemSx}>
                                    <ListItemText primary="File Creator"
                                        secondary="Create Pyramid files" />
                                </ListItem>
                                <ListItem button onClick={() => handleFrameChange(LOCALIZOOM)} sx={sharedListItemSx}>
                                    <ListItemText primary="LocaliZoom"
                                        secondary="View Pyramid files" />
                                </ListItem>
                                <ListItem button onClick={handleMenuClose} sx={sharedListItemSx}>
                                    <ListItemText primary="File Manager" />
                                </ListItem>
                                <ListItem button onClick={handleMenuClose} sx={sharedListItemSx}>
                                    <ListItemText primary="Manage Buckets" />
                                </ListItem>
                            </List>
                        </Menu>
                        <Tooltip title="Apps & Analysis">
                            <IconButton
                                color="inherit"
                                aria-label="apps and analysis"
                                onClick={handleMenu2Click}>
                                <DisplaySettingsIcon />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            anchorEl={anchorEl2}
                            open={Boolean(anchorEl2)}
                            onClose={handleMenuClose}
                            sx={sharedMenuSx}
                        >
                            <List dense='true'>
                                <ListItem button onClick={() => handleFrameChange(WEBALIGN_URL)} sx={sharedListItemSx}>
                                    <ListItemText primary="WebAlign"
                                        secondary="VisuAlign for linear forming" />
                                </ListItem>
                                <ListItem button onClick={() => handleFrameChange(WEBWARP_URL)} sx={sharedListItemSx}>
                                    <ListItemText primary="WebWarp"
                                        secondary="Non-linear warping for brain images" />
                                </ListItem>
                                <ListItem button onClick={() => handleFrameChange(WEBNUTIL_URL)} sx={sharedListItemSx}>
                                    <ListItemText primary="WebNUtil"
                                        secondary="NeuroUtilities module" />
                                </ListItem>
                            </List>
                        </Menu>
                    </Box>
                    <Box sx={{ flexGrow: 1 }} />
                    <Box>
                        <Tooltip title="Account, settings and FAQ">
                            <Typography variant="h6" onClick={toggleDrawer} sx={{ cursor: 'pointer', fontSize: 24, fontFamily: 'Dosis' }}>
                                Rodent Workbench
                            </Typography>
                        </Tooltip>
                    </Box>
                </Toolbar>
                <Drawer
                    anchor="right"
                    open={drawerOpen}
                    onClose={toggleDrawer}
                >
                    <Box sx={{ width: 250, height: '100%', display: 'flex', flexDirection: 'column' }} role="presentation">
                        <List >
                            <ListItem button sx={sharedListItemSx}>
                                <ListItemIcon>
                                    <AccountCircleIcon />
                                </ListItemIcon>
                                <ListItemText primary="Account" primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                            <ListItem button sx={sharedListItemSx} onClick={() => window.open('https://quint-webtools.readthedocs.io/en/latest/', '_blank')}>
                                <ListItemIcon>
                                    <MenuBookIcon />
                                </ListItemIcon>
                                <ListItemText primary="Documentation" secondary='QUINT Online Documentation' primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                            <ListItem button sx={sharedListItemSx}>
                                <ListItemIcon>
                                    <CloudDownloadIcon />
                                </ListItemIcon>
                                <ListItemText primary="Download Example Dataset" primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                            <ListItem button sx={sharedListItemSx} onClick={() => window.open('https://www.ebrains.eu/contact/', '_blank')}>
                                <ListItemIcon>
                                    <HelpRoundedIcon />
                                </ListItemIcon>
                                <ListItemText primary="Contact Us" primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                            <ListItem button sx={sharedListItemSx}>
                                <ListItemIcon>
                                    <ExitToAppIcon />
                                </ListItemIcon>
                                <ListItemText primary="Logout" primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                        </List>
                        <Box sx={{ padding: '16px', marginTop: 'auto' }}>
                            <Typography variant="body2" color="textSecondary">
                                Rodent Workbench v1.0.0, NeSys, UiO 2024
                            </Typography>
                        </Box>
                    </Box>
                </Drawer>
            </AppBar>
            <Mainframe url={currentUrl} />
        </Box>
    );
};

export default Header;