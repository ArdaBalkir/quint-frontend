import logger from "../utils/logger.js";
import React, { useEffect, useState } from "react";
import {
  AppBar,
  Button,
  Box,
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
  Snackbar,
  Alert,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";
import DescriptionIcon from "@mui/icons-material/Description";

import Mainframe from "./Mainframe";
import UserAgreement from "./UserAgreement";
import ebrainsLogo from "../assets/logo-color-white.svg";
import ebrainsDark from "../assets/logo-color.svg";
import { useTabContext } from "../contexts/TabContext";
import { useAuth } from "../hooks/useAuth.js";

const tabs = [
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
  const {
    isLoading,
    isAuthenticated,
    token,
    user,
    needsAgreement,
    handleLogin,
    handleAcceptAgreement,
  } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    currentTab,
    switchToTab,
    navigateToWebAlign,
    navigateToWebWarp,
    navigateToWebIlastik,
    nativeSelection,
    setNativeSelection,
    currentUrl,
    handleFrameChange,
    validationError,
    setValidationError,
  } = useTabContext();
  const [docsOpen, setDocsOpen] = useState(false);

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

  // All authentication logic is now handled by useAuth hook

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
  if (needsAgreement) {
    return (
      <UserAgreement
        open={needsAgreement}
        onClose={() => {}} // Prevent closing without accepting
        onAccept={handleAcceptAgreement}
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
          backgroundColor: "black",
          color: "white",
          boxShadow: "none",
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
                        switchToTab(0);
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
                      case "WebIlastik":
                        navigateToWebIlastik();
                        break;
                      case "WebNutil": {
                        switchToTab(4);
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
                        switchToTab(5);
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
                <DescriptionIcon />
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
      <Snackbar
        open={!!validationError}
        autoHideDuration={4000}
        onClose={() => setValidationError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setValidationError(null)}
          severity="warning"
          sx={{ width: "100%" }}
        >
          {validationError}
        </Alert>
      </Snackbar>
      {isAuthenticated && user && (
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
