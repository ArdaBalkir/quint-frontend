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
  Divider,
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

import SecurityIcon from "@mui/icons-material/Security";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

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
    url: "https://app.ilastik.org/app/",
    disabled: false,
  },
  {
    label: "WebNutil",
    url: null,
    disabled: false,
  },
  {
    label: "MeshView",
    url: null,
    disabled: false,
  },
  {
    label: "Plots",
    // icon: <AddCircleOutlineIcon fontSize="small" />,
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

  const formatUnixSeconds = (value) => {
    if (!value || typeof value !== "number") return "—";
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        });
  };

  const formatCountdown = (value) => {
    if (!value || typeof value !== "number") return "—";
    const diffMs = value * 1000 - Date.now();
    if (!Number.isFinite(diffMs)) return "—";
    if (diffMs <= 0) return "expired";

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `in ${hours}h ${minutes}m`;
    if (minutes > 0) return `in ${minutes}m ${seconds}s`;
    return `in ${seconds}s`;
  };

  const formatScope = (scope) => {
    if (!scope) return "—";
    return Array.isArray(scope) ? scope.join(" ") : String(scope);
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
                  height: "36px",
                  fontSize: "0.875rem",
                  // Extra left padding so text clears the 12px notch
                  padding: "0 16px 0 20px",
                  minWidth: "auto",
                  opacity: 1,
                  color: "rgba(0, 0, 0, 0.87)",
                  textTransform: "none",
                  backgroundColor: "rgba(255, 255, 255, 0.72)",
                  // Fixed 12px arrow depth — consistent across all tab widths
                  clipPath:
                    "polygon(calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%, 0 0)",
                  marginLeft: "-12px",
                  position: "relative",
                  transition: "background-color 0.15s, color 0.15s",
                  "&:first-of-type": {
                    // Flat left edge for the first tab
                    clipPath:
                      "polygon(calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 0 0)",
                    marginLeft: 0,
                    paddingLeft: "14px",
                  },
                  "&:last-of-type": {
                    // Flat right edge for the last tab (inverse of first)
                    clipPath:
                      "polygon(100% 0, 100% 100%, 0 100%, 12px 50%, 0 0)",
                    paddingRight: "14px",
                  },
                  "&.Mui-selected": {
                    color: "white",
                    opacity: 1,
                    backgroundColor: "primary.main",
                    zIndex: 20,
                  },
                  "&:hover:not(.Mui-selected):not(.Mui-disabled)": {
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    color: "rgba(0, 0, 0, 0.87)",
                    zIndex: 19,
                  },
                  "&.Mui-disabled": {
                    opacity: 0.45,
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
                  // Left tabs stack on top of right tabs so arrows remain visible
                  sx={{ zIndex: tabs.length - index + 10 }}
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
                      case "MeshView":
                        switchToTab(5);
                        setNativeSelection({
                          native: true,
                          app: "meshview",
                        });
                        break;
                      case "Plots":
                        switchToTab(6);
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
              display: "flex",
              alignItems: "center",
              position: "absolute",
              flexDirection: "row",
              right: 0,
              mr: 2,
              gap: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "white",
                letterSpacing: "0.04em",
                display: { xs: "none", md: "block" },
                userSelect: "none",
              }}
            >
              QUINT Online
            </Typography>
            <Button
              onClick={() =>
                window.open(
                  "https://quint-webtools.readthedocs.io/en/latest/",
                  "_blank",
                )
              }
              startIcon={
                <DescriptionIcon sx={{ fontSize: "1rem !important" }} />
              }
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                color: "white",
                textTransform: "none",
                fontSize: "0.8rem",
                px: 1.25,
                py: 0.4,
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: "6px",
                backgroundColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(4px)",
                lineHeight: 1,
                minWidth: 0,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.65)",
                },
              }}
            >
              Docs
            </Button>
            <Tooltip title="Account, settings and FAQ">
              <Button
                // Always use handleLogin if user is not present
                onClick={user ? toggleDrawer : handleLogin}
                startIcon={
                  <AccountCircleIcon sx={{ fontSize: "1rem !important" }} />
                }
                sx={{
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "white",
                  textTransform: "none",
                  fontSize: "0.8rem",
                  px: 1.25,
                  py: 0.4,
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "6px",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(4px)",
                  lineHeight: 1,
                  minWidth: 0,
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.65)",
                  },
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
            <List dense sx={{ pb: 0 }}>
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
                    "https://data-proxy-zipper.ebrains.eu/zip?container=https://data-proxy.ebrains.eu/api/v1/buckets/quint?prefix=Online QUINT demo dataset/",
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
              {user && <Divider sx={{ my: 1 }} />}
              {user && (
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: "grey.50",
                    mx: 2,
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, mb: 1, display: "block" }}
                  >
                    Session Information
                  </Typography>
                  <ListItem sx={{ px: 0, py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <SecurityIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Scope"
                      secondary={formatScope(user?.scope)}
                      primaryTypographyProps={{
                        variant: "caption",
                        color: "text.secondary",
                        fontWeight: 500,
                      }}
                      secondaryTypographyProps={{
                        variant: "body2",
                        color: "text.primary",
                        sx: {
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          wordBreak: "break-word",
                          mt: 0.25,
                        },
                      }}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ScheduleIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Issued"
                      secondary={formatUnixSeconds(user?.iat)}
                      primaryTypographyProps={{
                        variant: "caption",
                        color: "text.secondary",
                        fontWeight: 500,
                      }}
                      secondaryTypographyProps={{
                        variant: "body2",
                        color: "text.primary",
                        sx: { mt: 0.25 },
                      }}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <TimerIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Expires"
                      secondary={
                        <Box component="span">
                          <Box
                            component="span"
                            sx={{ fontWeight: 600, color: "primary.main" }}
                          >
                            {formatCountdown(user?.exp)}
                          </Box>
                          <Box
                            component="span"
                            sx={{
                              color: "text.secondary",
                              fontSize: "0.75rem",
                              ml: 0.5,
                            }}
                          >
                            ({formatUnixSeconds(user?.exp)})
                          </Box>
                        </Box>
                      }
                      primaryTypographyProps={{
                        variant: "caption",
                        color: "text.secondary",
                        fontWeight: 500,
                      }}
                      secondaryTypographyProps={{
                        variant: "body2",
                        color: "text.primary",
                        component: "div",
                        sx: { mt: 0.25 },
                      }}
                    />
                  </ListItem>
                </Box>
              )}

              <ListItem sx={sharedListItemSx} onClick={() => handleLogin()}>
                <ListItemText primary="Refresh token manually" />
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
