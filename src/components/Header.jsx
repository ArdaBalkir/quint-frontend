import logger from "../utils/logger.js";
import React, { useEffect, useState } from "react";
import {
  AppBar,
  Button,
  Box,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Toolbar,
  Tooltip,
  Typography,
  IconButton,
  Dialog,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";

import Mainframe from "./Mainframe";
import UserAgreement from "./UserAgreement";
import ebrainsLogo from "../assets/logo-color-white.svg";
import ebrainsDark from "../assets/logo-color.svg";
import {
  createUser,
  checkAgreement,
  signDocument,
} from "../actions/createUser";
import { useTabContext } from "../contexts/TabContext";

// Variable loading for URLs
const OIDC = import.meta.env.VITE_APP_OIDC;

// Dev instance switch pain points
const TOKEN_URL = import.meta.env.VITE_APP_TOKEN_URL;
const MY_URL = import.meta.env.VITE_APP_MY_URL;

const tabs = [
  /*
  {
    icon: <HomeRoundedIcon />,
    label: "Projects",
    url: null,
    disabled: false,
  },
  // To be implemented once the project context is ready
  {
  */
  {
    label: "Projects",
    url: null,
    disabled: false,
  },

  {
    label: "WebAlign",
    url: "https://webalign.apps.ebrains.eu/index.php",
    disabled: false,
  },
  {
    label: "WebWarp",
    url: "https://webwarp.apps.ebrains.eu/webwarp.php",
    disabled: false,
  },
  {
    label: "WebIlastik",
    url: "https://app.ilastik.org/public/nehuba/index.html#!%7B%22layout%22:%22xy%22%7D",
    disabled: false,
  },
  {
    label: "WebNutil",
    url: null,
    disabled: false,
  },
  {
    label: "Sandbox",
    url: null,
    disabled: false,
  },
];

logger.info("Application mode", { mode: process.env.NODE_ENV });

logger.info("Logging in start");

const Header = () => {
  const [auth, setAuth] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  // Control for the iframe, further divergence from an iframe can be done within the Mainframe component
  // Mainly for Native use of the applications and the webalign etc i frame ones
  const {
    currentTab,
    switchToTab,
    navigateToWebAlign,
    navigateToWebWarp,
    nativeSelection,
    setNativeSelection,
    currentUrl,
    handleFrameChange,
  } = useTabContext();
  const [docsOpen, setDocsOpen] = useState(false);

  // Login alert
  const [loginAlert, setLoginAlert] = useState(false); // Default to false
  const [userAgreementOpen, setUserAgreementOpen] = useState(false); // Default to false

  // Tab context to interact

  const handleLogin = () => {
    // Redirect immediately
    window.location.href = `${OIDC}?response_type=code&login=true&client_id=quintweb&redirect_uri=${MY_URL}`;
    // WIP url https://rodentworkbench.apps.ebrains.eu/new/
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const toggleDocs = () => {
    setDocsOpen(!docsOpen);
  };

  const sharedListItemSx = {
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.04)",
      cursor: "pointer",
    },
  };

  // OnMount: Handle code exchange or redirect
  useEffect(() => {
    // TODO: try resolve saved authData has an already valid token by expiry

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      setIsLoading(true); // Keep loading while fetching token
      fetch(`${TOKEN_URL}?code=${code}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          logger.debug("Token received", { hasAccess: !!data?.access_token });
          if (data.token && data.token.access_token) {
            setToken(data.token.access_token);
            // User fetching will happen in the next effect
            // Clean the url after successful token fetch
            window.history.replaceState(null, null, window.location.pathname);
          } else {
            // Handle cases where the response is ok but doesn't contain the expected token

            logger.error("Token data missing or invalid", data);
            setToken(null); // Ensure token is null
            handleLogin(); // Redirect to login if token exchange failed
          }
        })
        .catch((error) => {
          logger.error("Token couldn't be retrieved", error);
          setToken(null); // Ensure token is null on error
          // Optionally show an error message to the user before redirecting
          handleLogin(); // Redirect to login on fetch error
          // This will no longer freak out when the IAM is too slow to respond
        });
    } else {
      // No code in URL, redirect immediately to login
      // Check if a token might already exist (e.g., from a previous session, though not implemented here)
      // If not implementing token persistence, always redirect if no code.
      logger.info("No code found, redirecting to login");
      handleLogin();
      // Keep isLoading true as we are redirecting away
    }
  }, []); // Runs only once on mount

  // Get user info when token is available
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        // If token becomes null after attempting fetch, stop loading
        // This condition might be hit if token fetch failed but didn't redirect immediately
        // Or if the initial state is null and no code was found (though redirect should handle that)
        // Check if a code was present initially to avoid stopping loading during redirect
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has("code")) {
          setIsLoading(false); // Only stop loading if we weren't trying to exchange a code
        }
        return;
      }

      try {
        logger.debug("Fetching user info");
        const userInfo = await createUser(token);
        setUser(userInfo);
        logger.info("User info received", { user: userInfo?.username });
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
        const agreement = await checkAgreement(
          userInfo["username"],
          userInfo["email"]
        );
        logger.debug("User agreement status", { agreement });
        if (!agreement) {
          logger.info("User has not accepted the agreement");
          setLoginAlert(true); // Show login alert if user hasn't accepted the agreement
          setIsLoading(false); // Stop loading after user is fetched
          setUserAgreementOpen(true); // Open user agreement dialog
        } else {
          logger.info("User has accepted the agreement");
          setLoginAlert(false); // Hide login alert if user has accepted the agreement
          setAuth(true);
          setIsLoading(false); // Stop loading after user is fetched
          setLoginAlert(false); // Hide login alert if shown
        }
      } catch (error) {
        logger.error("User couldn't be retrieved", error);
        setAuth(false);
        setUser(null);
        setToken(null); // Invalidate token if user fetch fails
        // setIsLoading(false); // Stop loading on error
        handleLogin(); // Uncomment this line if you want to force re-login on user fetch error
      }
    };

    fetchUser();
  }, [token]); // Runs when token changes

  // Removed the auto-redirect useEffect with setTimeout

  // Show loading screen while authenticating or redirecting
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f0f0f0",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <img
          src={ebrainsDark}
          alt="QUINT Logo"
          style={{
            height: "86px",
            marginBottom: "16px",
          }}
        />
        <Typography variant="h5" color="text.primary">
          QUINT Online
        </Typography>
        <Typography variant="body2" className="loading-shine">
          Connecting to EBRAINS services...
        </Typography>
      </Box>
    );
  }
  if (userAgreementOpen) {
    return (
      <UserAgreement
        open={userAgreementOpen}
        onClose={() => setUserAgreementOpen(false)}
        onAccept={async () => {
          try {
            // Call signDocument with the token as required by the function signature
            await signDocument(token);

            // Verify the agreement was properly signed
            const agreementSigned = await checkAgreement(
              user?.username,
              user?.email
            );

            if (agreementSigned) {
              logger.info("Agreement signed & verified");
              setUserAgreementOpen(false);
              setAuth(true);
              setLoginAlert(false);
              setIsLoading(false);
            } else {
              logger.error("Agreement signature could not be verified");
              // Optionally show an error message to the user
            }
          } catch (error) {
            logger.error("Error during agreement signing", error);
            // Handle error, maybe show a notification to the user
          }
        }}
        userEmail={user?.email}
        userName={user?.fullname}
      />
    );
  }

  // If not loading and not authenticated (e.g., token fetch failed but didn't redirect yet, or user fetch failed)
  // This state might be brief or shouldn't be reached if redirects work correctly.
  // Consider what to show here, maybe an error message or force redirect again.
  // For now, we proceed to render the main app structure, which will show "Login" if !user

  // This can revert to the original dialog if needed :)

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar
        position="flex"
        sx={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "black",
          boxShadow: "none",
          borderBottom: "1px solid #ccc",
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            minHeight: "42px !important",
            py: 0,
            px: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Box
              sx={{
                height: "36px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                marginRight: "8px",
              }}
            >
              <img
                src={ebrainsLogo}
                alt="EBRAINS Logo"
                style={{
                  height: "48px",
                  display: "block",
                }}
              />
            </Box>
            <Tabs
              value={currentTab}
              onChange={(event, newValue) => switchToTab(newValue)}
              sx={{
                minHeight: "36px",
                "& .MuiTab-root": {
                  minHeight: "36px",
                  height: "auto",
                  fontSize: "0.875rem",
                  padding: "0 14px",
                  minWidth: "auto",
                  opacity: 1,
                  transition: "opacity 0.1s",
                  color: "black",
                  textTransform: "none",
                  backgroundColor: "rgba(255, 255, 255, 0.69)",
                  clipPath:
                    "polygon(90% 0, 100% 50%, 90% 100%, 0 100%, 10% 50%, 0 0)", // Arrow shape
                  marginLeft: -0.5, // Spacing is 0 for now as arrows look to be fitting in
                  "&:first-child": {
                    clipPath:
                      "polygon(90% 0, 100% 50%, 90% 100%, 0 100%, 0 0, 0 0)",
                    borderRadius: "2px",
                    marginLeft: -0.5,
                  },
                  "&.Mui-selected": {
                    color: "white",
                    opacity: 1,
                    backgroundColor: "primary.main",
                  },
                  "&:hover": {
                    opacity: 1,
                    backgroundColor: "transparent",
                    color: "white",
                  },
                },
                "& .MuiTabs-indicator": {
                  display: "none",
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  label={tab.icon || tab.label}
                  // Disable tabs if not authenticated (user object is null)
                  disabled={!user && tab.label !== "Projects"}
                  onClick={() => {
                    // Prevent action if not authenticated
                    if (!user && tab.label !== "Projects") return;

                    switch (tab.label) {
                      case "Projects":
                        setNativeSelection({
                          native: true,
                          app: "workspace",
                        });
                        break;
                      case "WebAlign":
                        navigateToWebAlign();
                        break;
                      case "WebWarp":
                        navigateToWebWarp();
                        break;
                      case "WebNutil": {
                        setNativeSelection({
                          native: true,
                          app: "nutil",
                        });
                        logger.debug("Native selection", {
                          selection: nativeSelection,
                        });
                        break;
                      }
                      case "Sandbox":
                        setNativeSelection({
                          native: true,
                          app: "sandbox",
                        });
                        break;
                      default:
                        handleFrameChange(tab.url);
                    }
                  }}
                />
              ))}
            </Tabs>
          </Box>

          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1,
              display: { sm: "none", lg: "flex" },
              flexDirection: "row",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: "white",
              }}
            >
              QUINT Online
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              position: "absolute",
              flexDirection: "row",
              right: 0,
              mr: 2,
            }}
          >
            <Tooltip title="Docs">
              <IconButton
                onClick={() =>
                  window.open(
                    "https://quint-webtools.readthedocs.io/en/latest/",
                    "_blank"
                  )
                }
                size="small"
                sx={{
                  color: "white",
                  padding: 0,
                  "&:hover": {
                    backgroundColor: "transparent",
                  },
                  mr: 1,
                }}
              >
                <FindInPageIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Account, settings and FAQ">
              <Button
                // Always use handleLogin if user is not present
                onClick={user ? toggleDrawer : handleLogin}
                sx={{
                  textAlign: "right",
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "white",
                  textTransform: "none",
                  padding: 0,
                  "& .MuiTypography-root": {
                    variant: "body2",
                  },
                }}
              >
                {user?.username || "Login"}
              </Button>
            </Tooltip>
          </Box>
        </Toolbar>
        <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer}>
          <Box
            sx={{
              width: 280,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
            role="presentation"
          >
            <List>
              <ListItem sx={sharedListItemSx}>
                <ListItemIcon>
                  <AccountCircleIcon />
                </ListItemIcon>
                {user && ( // Conditionally render user info
                  <ListItemText
                    primary={user?.fullname}
                    secondary={user?.email}
                    primaryTypographyProps={{
                      variant: "body2",
                      color: "text.primary",
                    }}
                  />
                )}
              </ListItem>
              <ListItem
                sx={sharedListItemSx}
                onClick={() => {
                  window.open(
                    // Fixed URL for downloading the example dataset
                    "https://data-proxy-zipper.ebrains.eu/zip?container=https://data-proxy.ebrains.eu/api/v1/buckets/quint?prefix=Online QUINT demo dataset/"
                  );
                }}
              >
                <ListItemIcon>
                  <CloudDownloadIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Download Example Dataset"
                  primaryTypographyProps={{
                    variant: "body2",
                    color: "text.primary",
                  }}
                />
              </ListItem>
              <ListItem
                sx={sharedListItemSx}
                onClick={() =>
                  window.open("https://www.ebrains.eu/contact/", "_blank")
                }
              >
                <ListItemIcon>
                  <HelpRoundedIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Contact Us"
                  primaryTypographyProps={{
                    variant: "body2",
                    color: "text.primary",
                  }}
                />
              </ListItem>
              <ListItem sx={sharedListItemSx} onClick={() => handleLogin()}>
                <ListItemText primary="Login again" />
              </ListItem>
            </List>
            <Box sx={{ padding: "16px", marginTop: "auto" }}>
              <Typography variant="body2" color="textSecondary">
                Rodent Workbench v1.0.0, UiO 2024
              </Typography>
            </Box>
          </Box>
        </Drawer>
      </AppBar>
      <Dialog
        open={docsOpen}
        onClose={toggleDocs}
        maxWidth={false}
        PaperProps={{
          sx: {
            right: 0,
            m: 0,
            height: "100%",
            width: "50%",
            borderRadius: 0,
            transition: "transform 0.3s ease-in-out",
            transform: docsOpen ? "translateX(0)" : "translateX(100%)",
          },
        }}
      >
        <iframe
          src="https://quint-webtools.readthedocs.io/en/latest/"
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Rodent Workbench Documentation"
        />
      </Dialog>
      {auth && user && (
        <Mainframe
          url={currentUrl}
          native={nativeSelection}
          token={token}
          user={user}
        />
      )}
    </Box>
  );
};

export default Header;
