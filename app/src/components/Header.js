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
    Tabs,
    Tab,
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
import callUser from '../actions/createUser';


// Variable loading for URLs
const WEBALIGN_URL = process.env.REACT_APP_WEBALIGN_URL;
const WEBWARP_URL = process.env.REACT_APP_WEBWARP_URL;
const WEBNUTIL_URL = process.env.REACT_APP_WEBNUTIL_URL;
const FILECREATOR = process.env.REACT_APP_FILECREATOR_URL;
const LOCALIZOOM = process.env.REACT_APP_LOCALIZOOM_URL;
const FAPI_URL = process.env.REACT_APP_FAPI_URL;
const OIDC = process.env.REACT_APP_OIDC;
const USER_INFO_URL = process.env.REACT_APP_USER_INFO_URL;

const tabs = [
    {
        label: 'Projects',
        url: null,
        disabled: false,
    },
    {
        label: 'WebWarp',
        url: WEBWARP_URL,
        disabled: false,
    },
    {
        label: 'WebNutil',
        url: WEBNUTIL_URL,
        disabled: false,
    },
    {
        label: 'WebAlign',
        url: WEBALIGN_URL,
        disabled: false,
    }
]


console.log(`You are running this application in ${process.env.NODE_ENV} mode`)

console.log(`Logging in`)

const Header = () => {
    const [auth, setAuth] = useState(false);
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    // Control for the iframe, further divergence from an iframe can be done within the Mainframe component
    // Mainly for Native use of the applications and the webalign etc i frame ones
    const [currentUrl, setCurrentUrl] = useState(null);
    const [nativeSelection, setNativeSelection] = useState(true);
    const [tab, setTab] = useState(0);

    const handleLogin = () => {
        window.location.href = `${OIDC}?response_type=code&login=true&client_id=quintweb&redirect_uri=https://127.00.0.1:3000`
    }

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleFrameChange = (url) => {
        console.log(`Changing frame to ${url}`);
        setCurrentUrl(url);
        setNativeSelection(false);
    };

    const handleNativeChange = () => {
        setNativeSelection(!nativeSelection);
    };

    const sharedListItemSx = {
        '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
        },
    };

    // OnMount for all logins etc.
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            fetch(`${FAPI_URL}token?code=${code}`)
                .then(response => response.json())
                .then(data => {
                    console.log(data);
                    localStorage.setItem('accessToken', data.token.access_token);
                    localStorage.setItem('tokenExpiry', new Date(Date.now() + data.token.expires_in * 1000).toISOString())
                    localStorage.setItem('refreshToken', data.token.refresh_token)
                    localStorage.setItem('tokenType', data.token.token_type)
                    localStorage.setItem('scope', data.token.scope)
                    setToken(data.token.access_token);
                })
                // clean the url
                .then(
                    window.history.replaceState(null, null, window.location.pathname))
                .catch(error => console.error("Token couldn't be retrieved", error))
        }

        try {
            callUser();
        } catch {
            console.log("User couldn't be retrieved")
            setAuth(false);
        }

        const tokenExpiry = localStorage.getItem('tokenExpiry');
        if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
            setUser(null)
        } else {
            try {
                setUser(JSON.parse(localStorage.getItem('userInfo')));
                console.log(user)
                setAuth(true);
            } catch {
                setAuth(false);
                console.log("User not logged in")
            }
        }

    }, []);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" sx={{
                backgroundColor: '#F2F2F2',
                color: 'black',
                boxShadow: '0px 3px 2px rgba(0, 0, 0, 0.12)',
                fontFamily: 'Roboto, sans-serif',
            }}>
                <Toolbar variant="dense" sx={{ justifyContent: 'space-between', height: '20px', position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tabs
                            value={tab}
                            onChange={(event, newValue) => setTab(newValue)}
                            sx={{
                                '& .MuiTab-root': {
                                    textTransform: 'none',

                                    color: 'black',
                                    fontFamily: 'Roboto, sans-serif',
                                    fontSize: '9',
                                    marginRight: '1px',
                                    '&.Mui-selected': {
                                        color: 'primary.main',
                                        backgroundColor: 'white',
                                    },
                                    '&:hover': {
                                        color: 'primary.main',
                                        opacity: 1,
                                    },
                                },
                                '& .MuiTabs-indicator': {
                                    height: 5,
                                    transition: 'none',
                                },
                            }}
                        >
                            {tabs.map((tab, index) => (
                                <Tab
                                    key={index}
                                    label={tab.label}
                                    disabled={tab.disabled}
                                    onClick={() => tab.label === 'Projects' ? handleNativeChange() : handleFrameChange(tab.url)}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    <Box sx={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1,
                    }}>

                        <Typography sx={{
                            fontSize: 18,
                        }}>
                            rodent workbench
                        </Typography>
                    </Box>
                    <Box>
                        <Tooltip title="Account, settings and FAQ">
                            <ListItemText
                                onClick={user ? toggleDrawer : handleLogin}
                                primary={user?.username || 'Login'}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                    color: 'text.primary',
                                    align: 'right',
                                    fontWeight: 'bold',
                                }}
                                sx={{ cursor: user ? 'pointer' : 'default' }}
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
                                {<ListItemText primary={user?.fullname} secondary={user?.email} primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />}

                            </ListItem>
                            {/*}
                            <ListItem sx={sharedListItemSx} onClick={() => window.open('https://quint-webtools.readthedocs.io/en/latest/', '_blank')}>
                                <ListItemIcon>
                                    <MenuBookIcon />
                                </ListItemIcon>
                                <ListItemText primary="Documentation" secondary='QUINT Online Documentation' primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                            </ListItem>
                            */}
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