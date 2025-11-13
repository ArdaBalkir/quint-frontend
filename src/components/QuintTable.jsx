import React, { useState, useEffect, useRef } from "react";
import logger from "../utils/logger.js";
import { useNotification } from "../contexts/NotificationContext";
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

// Project handling
import {
  fetchBucketDir,
  fetchBrainStatsNormalized,
  createProject,
  checkBucketExists,
  downloadWalnJson,
  deleteItem,
} from "../actions/handleCollabs.ts";
import CreationDialog from "./CreationDialog.jsx";
import BrainTable from "./BrainTable.jsx";
import QuickActions from "./QuickActions.jsx";

export default function QuintTable({ token, user }) {
  const { showSuccess, showError } = useNotification();

  // Query helpers
  // null until resolved so 'no-workspace' state can be meaningful
  const [bucketName, setBucketName] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBrain, setSelectedBrain] = useState(null);

  // Normalized brain stats only
  const [selectedBrainStats, setSelectedBrainStats] = useState(null);
  const [projectBrainEntries, setProjectBrainEntries] = useState(() => {
    try {
      const storedEntries = localStorage.getItem("projectBrainEntries");
      return storedEntries ? JSON.parse(storedEntries) : [];
    } catch (error) {
      logger.error("Failed to parse projectBrainEntries", error);
      return [];
    }
  });

  // Other stuff
  const [rows, setRows] = useState(() => {
    try {
      const storedEntries = localStorage.getItem("projectBrainEntries");
      const entries = storedEntries ? JSON.parse(storedEntries) : [];
      return entries.map((entry, index) => ({
        id: index,
        name: entry.name.split("/").pop(),
        type: entry.type,
        path: entry.path,
      }));
    } catch (error) {
      logger.error("Failed to parse rows from projectBrainEntries", error);
      return [];
    }
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [updatingBrains, setUpdatingBrains] = useState(false);
  // To create a new project state
  const [newProjectName, setNewProjectName] = useState("");

  // Project view issues
  const [projectIssue, setProjectIssue] = useState({
    problem: false,
    message: "",
    severity: "info", // 'error' | 'warning' | 'info' available as of now
    loading: false,
  });

  const [walnContent, setWalnContent] = useState(null);

  // Delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [confirmInput, setConfirmInput] = useState("");

  // Resize state for the two-panel view
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);

  // TODO fetch project state and on click to tab fetch brain if havent
  // by 09.11

  // Project state helper for conditional rendering
  const getProjectState = () => {
    if (!token) {
      return "unauthorized";
    }
    if (bucketName === null) {
      return "no-workspace";
    }
    if (projectIssue.loading) {
      return "loading";
    }
    if (projectIssue.problem) {
      return "error";
    }
    if (projects.length === 0) {
      return "empty";
    }
    // Resolved with implementation further down
    return "ready";
  };

  const renderProjectContent = () => {
    switch (getProjectState()) {
      case "unauthorized":
        return <Typography>Please log in to view projects</Typography>;
      case "no-workspace":
        return <Typography>Select a workspace to continue</Typography>;
      case "loading":
        return (
          <Box
            sx={{ display: "flex", gap: 2, justifyContent: "center", py: 4 }}
          >
            <Typography className="loading-shine" sx={{ pl: 2 }}>
              Loading projects in the workspace...
            </Typography>
          </Box>
        );
      case "error":
        return (
          <Box sx={{ color: "error.main", py: 2 }}>
            <Typography>{projectIssue.message}</Typography>
          </Box>
        );
      case "empty":
        return <Typography>This bucket has no projects yet</Typography>;
      default:
        return null; // Projects will be rendered normally
    }
  };

  const projectsControllerRef = useRef(null);
  const fetchAndUpdateProjects = (collabName) => {
    setProjectIssue({
      problem: false,
      message: "",
      severity: "info",
      loading: true,
    });
    if (projectsControllerRef.current) {
      projectsControllerRef.current.abort();
    }
    const controller = new AbortController();
    projectsControllerRef.current = controller;
    fetchBucketDir(token, collabName, null, "/", 1000, {
      signal: controller.signal,
    })
      .then((projects) => {
        logger.debug("Projects fetched", projects);
        setProjects(projects);
        setProjectIssue({
          problem: false,
          message: "",
          severity: "info",
          loading: false,
        });
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          logger.debug("Project fetch aborted by abort controller");
          return;
        }
        logger.error("Error fetching projects", error);
        setProjectIssue({
          problem: true,
          message: "Error fetching projects",
          severity: "error",
          loading: false,
        });
      });
  };

  useEffect(() => {
    try {
      const userName = user?.username;
      if (!userName) return; // wait until user available
      logger.info("User info received by table", { user: user?.username });
      const collabName = `rwb-${userName}`;
      setBucketName(collabName);

      // Initialize the collab/bucket if it doesn't exist
      const initializeWorkspace = async () => {
        try {
          const resp = await checkBucketExists(token, collabName);
          if (resp) {
            logger.debug("Bucket already exists (workspace init)");
            setBucketName(collabName);
          } else {
            try {
              const response = await fetch(
                "https://createzoom.apps.ebrains.eu/api/initialize-collab",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    token: token,
                    collab_id: collabName,
                  }),
                }
              );

              const data = await response.json();

              if (data.success || response.status === 409) {
                setBucketName(collabName);
              } else {
                throw new Error("Failed to initialize collab");
              }
            } catch (error) {
              logger.error("Error initializing collab", error);
              setProjectIssue({
                problem: true,
                message: "Failed to initialize collab",
                severity: "error",
                loading: false,
              });
            }
          }
        } catch (error) {
          logger.error("Error initializing workspace", error);
          setProjectIssue({
            problem: true,
            message: "Failed to initialize workspace",
            severity: "error",
            loading: false,
          });
        }
      };

      initializeWorkspace();
    } catch (error) {
      logger.error("Error parsing userInfo", error);
    }
  }, [user, token]); // only token hook here to avoid infinite loop

  // Second effect: Fetch projects when we have both token and bucketName
  useEffect(() => {
    if (token && bucketName && projects.length === 0) {
      localStorage.setItem("bucketName", bucketName);
      fetchAndUpdateProjects(bucketName);
    }
  }, [token, bucketName]); // Only depends on token and bucketName

  const brainsControllerRef = useRef(null);
  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    localStorage.setItem("selectedProject", JSON.stringify(project));
    setUpdatingBrains(true);

    if (project === null) {
      setSelectedBrain(null);
      setRows([]);
      return;
    }

    try {
      if (brainsControllerRef.current) brainsControllerRef.current.abort();
      const controller = new AbortController();
      brainsControllerRef.current = controller;
      const projectPath = `${project.name}/`;
      const brainEntries = await fetchBucketDir(
        token,
        bucketName,
        projectPath,
        "/",
        1000,
        { signal: controller.signal }
      );
      const newRows = brainEntries.map((entry, index) => ({
        id: index,
        name: entry.name.split("/").pop(),
        type: entry.type,
        path: entry.path,
      }));
      setRows(newRows);
      localStorage.setItem("projectBrainEntries", JSON.stringify(brainEntries));
      setProjectBrainEntries(brainEntries);
      setUpdatingBrains(false);
    } catch (error) {
      if (error.name === "AbortError") {
        logger.debug("Brain list fetch aborted");
      } else {
        logger.error("Error fetching brain entries", error);
      }
      setRows([]);
      setUpdatingBrains(false);
    }
  };

  const refreshProjectBrains = () => {
    setWalnContent(null);
    handleProjectSelect(selectedProject);
    setSelectedBrain(null);
    // Initially project change updates the brain list
    // the current brain will be deleted so defaults to null
  };

  // Ref to track and abort in-flight brain stats/WALN fetches
  const brainFetchControllerRef = useRef(null);

  const handleBrainSelect = async (params) => {
    logger.debug("Brain params passed from BrainTable", params);
    setWalnContent(null);
    setSelectedBrain(params.row);
    setIsFetchingStats(true);
    logger.info("Brain selected", { name: params.row.name });
    // Abort any previous selection's fetches
    if (brainFetchControllerRef.current) {
      brainFetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    brainFetchControllerRef.current = controller;
    const { signal } = controller;
    try {
      const normalized = await fetchBrainStatsNormalized(
        token,
        bucketName,
        params.row.path,
        null,
        { signal }
      );
      setSelectedBrainStats(normalized);
      localStorage.setItem(
        "selectedBrain",
        JSON.stringify({ ...params.row, project: selectedProject.name })
      );
      logger.debug("Selected brain stats", normalized);

      const regFile = normalized?.registrations?.jsons?.[0]?.name;
      if (regFile) {
        try {
          const walnContent = await downloadWalnJson(
            token,
            bucketName,
            regFile,
            signal
          );
          logger.debug("WALN content retrieved", {
            keys: Object.keys(walnContent || {}).length,
          });
          setWalnContent(walnContent);
        } catch (error) {
          if (error.name === "AbortError") {
            logger.debug("WALN fetch aborted (stale selection)");
          } else {
            logger.error("Failed to download WALN", error);
          }
          setWalnContent(null);
        }
      } else {
        logger.info("No registration WALN file present");
        setWalnContent(null);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        logger.debug("Brain stats fetch aborted (stale selection)");
      } else {
        logger.error("Error fetching brain stats", error);
      }
      setSelectedBrainStats(null);
      setWalnContent(null);
    } finally {
      setIsFetchingStats(false);
      if (brainFetchControllerRef.current === controller) {
        brainFetchControllerRef.current = null;
      }
    }
  };

  const refreshBrain = async () => {
    // Refetch stats for current selection
    if (selectedBrain) {
      handleBrainSelect({ row: selectedBrain });
    }
  };

  const createProjectCall = async (projectName) => {
    logger.info("Creating project", { projectName });
    try {
      let res = await createProject({
        token: token,
        bucketName: bucketName,
        projectName: projectName,
      });
      logger.info("Project created", res);
      fetchAndUpdateProjects(bucketName);
    } catch (error) {
      logger.error("Error creating project", error);
    }
  };

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

  // Resizing logic, on click and release, and update on mouse move
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const container = document.getElementById("resize-container");
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 30% and 70%
      if (newLeftWidth >= 30 && newLeftWidth <= 70) {
        setLeftPanelWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <Box
      sx={{
        backgroundColor: "#f6f6f6",
        p: 1,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        height: "99%",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        {selectedProject === null ? (
          <Box
            id="resize-container"
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              gap: 0,
              position: "relative",
              userSelect: isResizing ? "none" : "auto",
            }}
          >
            <Box
              sx={{
                flexDirection: "column",
                width: `${leftPanelWidth}%`,
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                padding: 2,
                backgroundColor: "white",
                transition: isResizing ? "none" : "width 0.1s ease",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                  justifyContent: "space-between",
                  borderBottom: "1px solid #e0e0e0",
                  pb: 2,
                  mb: 2,
                }}
              >
                {/* Main header with the bucket title as rwb-username
                  DONE enlarge the input menu
                */}
                <Typography variant="h5" align="left" textOverflow={"ellipsis"}>
                  Projects in {bucketName}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    justifyContent: "space-between",
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="New project..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    sx={{ width: "250px", height: "40px" }}
                  />
                  <Tooltip title="Create new project">
                    <IconButton
                      sx={{ alignSelf: "flex-start" }}
                      onClick={() => {
                        if (newProjectName.trim()) {
                          createProjectCall(newProjectName);
                          setNewProjectName("");
                        }
                      }}
                      disabled={!newProjectName.trim()}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Open bucket directory">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://data-proxy.ebrains.eu/${bucketName}`,
                          "_blank"
                        );
                      }}
                    >
                      <FolderRoundedIcon
                        sx={{ cursor: "pointer" }}
                        color="primary"
                      />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2 }}>
                {projectIssue.loading && !projectIssue.problem ? (
                  renderProjectContent()
                ) : (
                  <List
                    sx={{
                      width: "100%",
                      "& .MuiListItem-root": {
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        mb: 1,
                        backgroundColor: "white",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "#f5f5f5",
                          transform: "translateX(4px)",
                          borderColor: "#bdbdbd",
                        },
                      },
                    }}
                  >
                    {projects.map((project, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          px: 2,
                          py: 1,
                        }}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            sx={{
                              "&:hover": {
                                color: "error.main",
                                transform: "scale(1.1)",
                                backgroundColor: "transparent",
                              },
                            }}
                            className="tilt-shake"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project);
                              setDeleteDialogOpen(true);
                              setConfirmInput("");
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                        onClick={() => handleProjectSelect(project)}
                      >
                        <ListItemText primary={project.name} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Box>

            {/* Draggable Divider */}
            <Box
              onMouseDown={handleMouseDown}
              sx={{
                width: "8px",
                cursor: "col-resize",
                backgroundColor: "transparent",
                transition: "background-color 0.2s",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "&:hover": {
                  backgroundColor: "#e3fde5ff",
                },
                "&:hover::after": {
                  content: '""',
                  position: "absolute",
                  width: "2px",
                  height: "40px",
                  backgroundColor: "#07a644ff",
                  borderRadius: "2px",
                },
              }}
            />

            <Box
              component="iframe"
              src="https://quint-webtools.readthedocs.io/en/latest/"
              sx={{
                width: `${100 - leftPanelWidth}%`,
                borderRadius: 1,
                border: "1px solid #e0e0e0",
                transition: isResizing ? "none" : "width 0.1s ease",
              }}
            ></Box>
          </Box>
        ) : (
          <>
            {updatingBrains ? (
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  justifyContent: "center",
                  width: "100%",
                  alignItems: "center",
                }}
              >
                2
                <Typography className="loading-shine">
                  Loading series...
                </Typography>
              </Box>
            ) : (
              <>
                <BrainTable
                  selectedProject={selectedProject}
                  rows={rows}
                  onBackClick={() => {
                    setWalnContent(null);
                    setSelectedProject(null);
                    setSelectedBrain(null);
                  }}
                  bucketName={bucketName}
                  token={token}
                  onAddBrainClick={handleOpenDialog}
                  onBrainSelect={handleBrainSelect}
                  refreshProjectBrains={refreshProjectBrains}
                />
                <Box
                  sx={{
                    width: "60%",
                    ml: 1,
                    flexGrow: 0.6,
                    height: "100%",
                    flexDirection: "column",
                  }}
                >
                  <QuickActions
                    braininfo={selectedBrain}
                    stats={selectedBrainStats}
                    isLoading={isFetchingStats}
                    token={token}
                    setSelectedBrain={setSelectedBrain}
                    refreshBrain={refreshBrain}
                    refreshProjectBrains={refreshProjectBrains}
                    walnContent={walnContent}
                  />
                  {/*<ProgressPanel walnContent={walnContent} />*/}
                </Box>
              </>
            )}
          </>
        )}
      </Box>

      <CreationDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        project={selectedProject}
        updateProjects={fetchAndUpdateProjects}
        token={token}
        brainEntries={projectBrainEntries}
        onUploadComplete={refreshProjectBrains}
      />
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setConfirmInput("");
        }}
      >
        <DialogTitle>
          Deleting project <b>{projectToDelete?.name}</b>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action is irreversible! You will lose all data in this project.
            <br />
            Please type <b>{projectToDelete?.name}</b> to confirm deletion.
          </DialogContentText>
          <Box mt={2}>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`Type "${projectToDelete?.name}"`}
              style={{ width: "100%", padding: 8, fontSize: 16 }}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setConfirmInput("");
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={async () => {
              let deletingPath = `${bucketName}/${projectToDelete.name}/`;
              try {
                await deleteItem(deletingPath, token);
                showSuccess("Project deleted.");
                setDeleteDialogOpen(false);
                setConfirmInput("");
                setTimeout(() => {
                  fetchAndUpdateProjects(bucketName);
                }, 1000);
              } catch (error) {
                showError("Failed to delete project.");
                setDeleteDialogOpen(false);
                setConfirmInput("");
              }
            }}
            disabled={confirmInput !== projectToDelete?.name}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
