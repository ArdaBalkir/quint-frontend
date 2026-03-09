import { useState, useEffect, useCallback } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  IconButton,
  Collapse,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  ExpandMore,
  ExpandLess,
  ThreeDRotationOutlined,
  OpenInNew,
  Refresh,
} from "@mui/icons-material";
import { fetchnutilResults } from "../actions/handleCollabs";
import { getBrainStats } from "../actions/brainRepository.ts";
import mBrain from "../mBrain.ico";
import logger from "../utils/logger.js";

const MESH_URL = "https://meshview.apps.ebrains.eu/collab.php";
const DATA_PROXY = "https://data-proxy.ebrains.eu/api/v1/public/buckets/";

const atlasLookup = {
  aba_mouse_ccfv3_2017_25um: "ABA_Mouse_CCFv3_2017_25um",
  whs_sd_rat_v3_39um: "WHS_SD_Rat_v3_39um",
  whs_sd_rat_v4_39um: "WHS_SD_Rat_v4_39um",
};

const formatResultName = (name) => {
  if (!name) return "Unnamed Result";
  const cleanPath = name.endsWith("/") ? name.slice(0, -1) : name;
  const fileName = cleanPath.split("/").pop() || "Unnamed Result";
  const timestampPattern = /^(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})$/;
  const match = fileName.match(timestampPattern);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(year, month - 1, day, hour, minute, second);
    return `${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} at ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  }
  return fileName;
};

const Meshview = ({ token }) => {
  const [brainEntries, setBrainEntries] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedBrains, setExpandedBrains] = useState({});
  const [brainResults, setBrainResults] = useState({});
  const [brainAtlas, setBrainAtlas] = useState({});
  const [loadingBrains, setLoadingBrains] = useState({});
  const [activeMeshUrl, setActiveMeshUrl] = useState(null);
  const [activeResultLabel, setActiveResultLabel] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("projectBrainEntries");
      if (stored) {
        setBrainEntries(JSON.parse(stored));
      }
    } catch (e) {
      logger.error("Error loading brain entries in Meshview", e);
    }
  }, []);

  const fetchResultsForBrain = useCallback(
    async (brain, showLoading = true) => {
      if (!token) return;
      const collabName = localStorage.getItem("bucketName");
      if (showLoading) {
        setLoadingBrains((prev) => ({ ...prev, [brain.name]: true }));
      }
      try {
        const response = await fetchnutilResults(token, collabName, brain.path);
        if (response && response.length > 0) {
          const folderData = response[0];
          if (folderData.images && folderData.images.length > 0) {
            const results = folderData.images.map((item) => ({
              name: item.subdir || item.name || "Unknown",
              path: item.name || item.subdir,
            }));
            setBrainResults((prev) => ({ ...prev, [brain.name]: results }));
          } else {
            setBrainResults((prev) => ({ ...prev, [brain.name]: [] }));
          }
        } else {
          setBrainResults((prev) => ({ ...prev, [brain.name]: [] }));
        }
      } catch (e) {
        logger.error("Error fetching meshview results", {
          brain: brain.name,
          e,
        });
        setBrainResults((prev) => ({ ...prev, [brain.name]: [] }));
      } finally {
        if (showLoading) {
          setLoadingBrains((prev) => ({ ...prev, [brain.name]: false }));
        }
      }
    },
    [token],
  );

  const fetchAtlasForBrain = useCallback(
    async (brain) => {
      if (!token || brainAtlas[brain.name]) return;
      try {
        const collabName = localStorage.getItem("bucketName");
        const normStats = await getBrainStats(token, collabName, brain.path);
        const jsonEntry = normStats.registrations?.jsons?.[0];
        if (jsonEntry) {
          const filePath = jsonEntry.name;
          const atlasMatch = filePath.match(/\/([^/]+)_\d{4}-\d{2}-\d{2}/);
          const atlas = atlasMatch ? atlasMatch[1] : null;
          setBrainAtlas((prev) => ({ ...prev, [brain.name]: atlas }));
        }
      } catch (e) {
        logger.error("Error fetching atlas for brain in Meshview", {
          brain: brain.name,
          e,
        });
      }
    },
    [token, brainAtlas],
  );

  const handleBrainToggle = async (brain) => {
    const isExpanding = !expandedBrains[brain.name];
    setExpandedBrains((prev) => ({ ...prev, [brain.name]: isExpanding }));
    if (isExpanding) {
      await Promise.all([
        fetchResultsForBrain(brain),
        fetchAtlasForBrain(brain),
      ]);
    }
  };

  const handleRefreshBrain = async (e, brain) => {
    e.stopPropagation();
    await fetchResultsForBrain(brain, true);
  };

  // Polling for expanded brains
  useEffect(() => {
    if (!token) return;
    const expandedNames = Object.keys(expandedBrains).filter(
      (k) => expandedBrains[k],
    );
    if (expandedNames.length === 0) return;

    const interval = setInterval(() => {
      expandedNames.forEach((brainName) => {
        const brain = brainEntries.find((b) => b.name === brainName);
        if (brain) fetchResultsForBrain(brain, false);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [expandedBrains, brainEntries, fetchResultsForBrain, token]);

  const handleResultClick = (brain, result) => {
    const atlas = brainAtlas[brain.name];
    if (!atlas || !atlasLookup[atlas]) {
      logger.warn("No atlas found for brain, cannot generate Meshview URL", {
        brain: brain.name,
      });
      return;
    }
    const collabName = localStorage.getItem("bucketName");
    const path = result.path;
    const url = `${MESH_URL}?atlas=${atlasLookup[atlas]}&cloud=${DATA_PROXY}${collabName}/${path}whole_series_meshview/objects_meshview.json`;
    setActiveMeshUrl(url);
    setActiveResultLabel(
      `${brain.name.split("/").pop()} — ${formatResultName(result.name)}`,
    );
  };

  return (
    <Box sx={{ display: "flex", height: "100%", backgroundColor: "#f6f6f6" }}>
      {/* Collapsible sidebar */}
      <Box
        sx={{
          width: sidebarCollapsed ? 36 : 280,
          minWidth: sidebarCollapsed ? 36 : 280,
          transition: "width 0.25s ease, min-width 0.25s ease",
          overflow: "hidden",
          borderRight: "1px solid #e0e0e0",
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Sidebar header row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            px: sidebarCollapsed ? 0 : 1,
            py: 0.75,
            borderBottom: "1px solid #e0e0e0",
            minHeight: 40,
          }}
        >
          {!sidebarCollapsed && (
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: "text.secondary", pl: 1 }}
            >
              SERIES
            </Typography>
          )}
          <Tooltip
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconButton
              size="small"
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              {sidebarCollapsed ? (
                <ChevronRight fontSize="small" />
              ) : (
                <ChevronLeft fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {!sidebarCollapsed && (
          <Box sx={{ overflowY: "auto", flex: 1 }}>
            {brainEntries.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  No series available. Open a project first.
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {brainEntries.map((brain, i) => {
                  const isExpanded = !!expandedBrains[brain.name];
                  const results = brainResults[brain.name] || [];
                  const isLoading = !!loadingBrains[brain.name];
                  const hasAtlas = !!brainAtlas[brain.name];

                  return (
                    <Box key={i}>
                      <ListItem
                        onClick={() => handleBrainToggle(brain)}
                        sx={{
                          py: 0.75,
                          cursor: "pointer",
                          "&:hover": { backgroundColor: "#f5f5f5" },
                          borderBottom: "1px solid #f0f0f0",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <img
                            src={mBrain}
                            alt=""
                            style={{ width: 20, height: 20 }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" noWrap>
                              {brain.name.split("/").pop()}
                            </Typography>
                          }
                          secondary={
                            hasAtlas ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                              >
                                {atlasLookup[brainAtlas[brain.name]] ||
                                  brainAtlas[brain.name]}
                              </Typography>
                            ) : null
                          }
                        />
                        {isExpanded && !isLoading && (
                          <Tooltip title="Refresh results">
                            <IconButton
                              size="small"
                              onClick={(e) => handleRefreshBrain(e, brain)}
                              sx={{ mr: 0.5 }}
                            >
                              <Refresh sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isLoading ? (
                          <CircularProgress size={14} />
                        ) : isExpanded ? (
                          <ExpandLess
                            fontSize="small"
                            sx={{ color: "text.secondary" }}
                          />
                        ) : (
                          <ExpandMore
                            fontSize="small"
                            sx={{ color: "text.secondary" }}
                          />
                        )}
                      </ListItem>

                      <Collapse in={isExpanded} unmountOnExit>
                        {!isLoading && results.length === 0 ? (
                          <Box sx={{ pl: 5, py: 1, pr: 1 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              No Nutil results found
                            </Typography>
                          </Box>
                        ) : (
                          results.map((result, j) => {
                            const isActive =
                              activeMeshUrl &&
                              activeMeshUrl.includes(
                                encodeURIComponent ? result.path : result.path,
                              );
                            const noAtlas =
                              !brainAtlas[brain.name] ||
                              !atlasLookup[brainAtlas[brain.name]];
                            return (
                              <Tooltip
                                key={j}
                                title={
                                  noAtlas
                                    ? "No atlas registration found for this series"
                                    : ""
                                }
                                placement="right"
                              >
                                <ListItem
                                  onClick={() =>
                                    !noAtlas && handleResultClick(brain, result)
                                  }
                                  sx={{
                                    pl: 5,
                                    py: 0.5,
                                    cursor: noAtlas ? "default" : "pointer",
                                    opacity: noAtlas ? 0.5 : 1,
                                    "&:hover": {
                                      backgroundColor: noAtlas
                                        ? "transparent"
                                        : "#f0f7f4",
                                    },
                                    borderLeft: "3px solid",
                                    borderLeftColor: isActive
                                      ? "primary.main"
                                      : "transparent",
                                    backgroundColor: isActive
                                      ? "rgba(28,148,86,0.06)"
                                      : "transparent",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <ListItemIcon sx={{ minWidth: 28 }}>
                                    <ThreeDRotationOutlined
                                      fontSize="small"
                                      sx={{
                                        color: isActive
                                          ? "primary.main"
                                          : "text.secondary",
                                        fontSize: 16,
                                      }}
                                    />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: isActive
                                            ? "primary.main"
                                            : "text.primary",
                                          fontWeight: isActive ? 600 : 400,
                                        }}
                                      >
                                        {formatResultName(result.name)}
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                              </Tooltip>
                            );
                          })
                        )}
                      </Collapse>
                    </Box>
                  );
                })}
              </List>
            )}
            {/* Bare Meshview shortcut at the bottom */}
            <Box sx={{ borderTop: "1px solid #e0e0e0", mt: "auto" }}>
              <ListItem
                onClick={() => {
                  setActiveMeshUrl(MESH_URL);
                  setActiveResultLabel("Meshview");
                }}
                sx={{
                  py: 0.75,
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                  borderLeft: "3px solid",
                  borderLeftColor:
                    activeMeshUrl === MESH_URL ? "primary.main" : "transparent",
                  backgroundColor:
                    activeMeshUrl === MESH_URL
                      ? "rgba(28,148,86,0.06)"
                      : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ThreeDRotationOutlined
                    fontSize="small"
                    sx={{
                      color:
                        activeMeshUrl === MESH_URL
                          ? "primary.main"
                          : "text.secondary",
                      fontSize: 18,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          activeMeshUrl === MESH_URL
                            ? "primary.main"
                            : "text.primary",
                        fontWeight: activeMeshUrl === MESH_URL ? 600 : 400,
                      }}
                    >
                      just Meshview
                    </Typography>
                  }
                />
              </ListItem>
            </Box>
          </Box>
        )}
      </Box>

      {/* Main iframe area */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {activeMeshUrl ? (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2,
                py: 0.75,
                backgroundColor: "white",
                borderBottom: "1px solid #e0e0e0",
                minHeight: 40,
              }}
            >
              <Typography variant="caption" color="text.secondary" noWrap>
                {activeResultLabel}
              </Typography>
              <Tooltip title="Open in new tab">
                <IconButton
                  size="small"
                  onClick={() => window.open(activeMeshUrl, "_blank")}
                >
                  <OpenInNew fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              component="iframe"
              src={activeMeshUrl}
              title="Meshview"
              sx={{ flex: 1, border: "none", width: "100%", height: "100%" }}
              allowFullScreen
            />
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <ThreeDRotationOutlined
              sx={{ fontSize: 56, color: "text.disabled" }}
            />
            <Typography variant="body2" color="text.secondary">
              Select a WebNutil result from the sidebar to view it in Meshview
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Results are updated automatically every 10 seconds
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Meshview;
