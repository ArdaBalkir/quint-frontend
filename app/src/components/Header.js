import React, { useEffect, useState } from 'react';
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
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ConstructionIcon from '@mui/icons-material/Construction';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';

import Mainframe from './Mainframe';


// Variable loading for URLs
const WEBALIGN_URL = process.env.REACT_APP_WEBALIGN_URL;
const WEBWARP_URL = process.env.REACT_APP_WEBWARP_URL;
const WEBNUTIL_URL = process.env.REACT_APP_WEBNUTIL_URL;
const FILECREATOR = process.env.REACT_APP_FILECREATOR_URL;
const LOCALIZOOM = process.env.REACT_APP_LOCALIZOOM_URL;
const FAPI_URL = process.env.REACT_APP_FAPI_URL;

console.log(`You are running this application in ${process.env.NODE_ENV} mode`)

console.log(`Logging in`)


const Header = () => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [anchorEl1, setAnchorEl1] = useState(null);
    const [anchorEl2, setAnchorEl2] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    // Control for the iframe, further divergence from an iframe can be done within the Mainframe component
    // Mainly for Native use of the applications and the webalign etc i frame ones
    const [currentUrl, setCurrentUrl] = useState(null);
    const [nativeSelection, setNativeSelection] = useState(false);

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
        setNativeSelection(false);
        handleMenuClose();
    };

    const handleNativeApp = () => {
        setNativeSelection(true);
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

    // Setting up the token and user info for use
    // token and user variables are populated
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionParam = urlParams.get('session');

        if (sessionParam) {
            const decodedToken = JSON.parse(atob(sessionParam.split('.')[1]));
            const user = {
                name: decodedToken.preferred_username,
                email: decodedToken.email,
            };
            setUser(user);
            // to fetch some user info to display and email etc.
            localStorage.setItem('userInfo', JSON.stringify(decodedToken));
            // To make requests to the storage etc.
            localStorage.setItem('userToken', sessionParam);
            setToken(sessionParam);

        } else {
            const storedUserInfo = localStorage.getItem('userInfo');
            if (storedUserInfo) {
                const parsedUserInfo = JSON.parse(storedUserInfo);
                setToken(localStorage.getItem('userToken'));
                setUser({
                    name: parsedUserInfo.preferred_username,
                    email: parsedUserInfo.email,
                });
            } else {
                // dont forget to update this one from the env
                window.location.href = `${FAPI_URL}login`;
            }
        }
    }, []);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" sx={{
                backgroundColor: '#F2F2F2',
                color: 'black',
                boxShadow: '0px 3px 2px rgba(0, 0, 0, 0.12)',
                fontFamily: 'Roboto, sans-serif'
            }}>
                <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
                    <Box>
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
                            <List dense={true}>
                                <ListItem onClick={() => handleFrameChange(FILECREATOR)} sx={sharedListItemSx}>
                                    <ListItemText primary="File Creator"
                                        secondary="Create Pyramid files" />
                                </ListItem>
                                <ListItem onClick={() => handleFrameChange(LOCALIZOOM)} sx={sharedListItemSx}>
                                    <ListItemText primary="LocaliZoom"
                                        secondary="View Pyramid files" />
                                </ListItem>
                                <ListItem onClick={handleNativeApp} sx={sharedListItemSx}>
                                    <ListItemText primary="Project Manager" secondary="Manage Projects, Quick Actions" />
                                </ListItem>
                                <ListItem onClick={handleMenuClose} sx={sharedListItemSx}>
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
                            <List dense={true}>
                                <ListItem onClick={() => handleFrameChange(WEBALIGN_URL)} sx={sharedListItemSx}>
                                    <ListItemText primary="WebAlign"
                                        secondary="VisuAlign for linear forming" />
                                </ListItem>
                                <ListItem onClick={() => handleFrameChange(WEBWARP_URL)} sx={sharedListItemSx}>
                                    <ListItemText primary="WebWarp"
                                        secondary="Non-linear warping for brain images" />
                                </ListItem>
                                <ListItem onClick={() => handleFrameChange(WEBNUTIL_URL)} sx={sharedListItemSx}>
                                    <ListItemText primary="WebNUtil"
                                        secondary="NeuroUtilities module" />
                                </ListItem>
                            </List>
                        </Menu>
                    </Box>

                    <Box>
                        <Typography variant="h6" sx={{ fontSize: 24, fontFamily: 'Dosis' }}>
                            Rodent Workbench
                        </Typography>
                    </Box>
                    <Box>
                        <Tooltip title="Account, settings and FAQ">
                            <ListItemText
                                onClick={toggleDrawer}
                                primary={user?.email}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                    color: 'text.primary',
                                    align: 'right',
                                    fontWeight: 'bold',
                                }}
                                sx={{ cursor: 'pointer' }}
                            />
                        </Tooltip>
                    </Box>
                </Toolbar>
                <Drawer
                    anchor="right"
                    open={drawerOpen}
                    onClose={toggleDrawer}
                >
                    <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }} role="presentation">
                        <List >
                            <ListItem sx={sharedListItemSx}>
                                <ListItemIcon>
                                    <AccountCircleIcon />
                                </ListItemIcon>
                                <ListItemText primary={user?.email} secondary={user?.name} primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                            <ListItem sx={sharedListItemSx} onClick={() => window.open('https://quint-webtools.readthedocs.io/en/latest/', '_blank')}>
                                <ListItemIcon>
                                    <MenuBookIcon />
                                </ListItemIcon>
                                <ListItemText primary="Documentation" secondary='QUINT Online Documentation' primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                            <ListItem sx={sharedListItemSx}>
                                <ListItemIcon>
                                    <CloudDownloadIcon />
                                </ListItemIcon>
                                <ListItemText primary="Download Example Dataset" primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                            <ListItem sx={sharedListItemSx} onClick={() => window.open('https://www.ebrains.eu/contact/', '_blank')}>
                                <ListItemIcon>
                                    <HelpRoundedIcon />
                                </ListItemIcon>
                                <ListItemText primary="Contact Us" primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
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
            <Mainframe url={currentUrl} native={nativeSelection} />
        </Box>
    );
};

export default Header;