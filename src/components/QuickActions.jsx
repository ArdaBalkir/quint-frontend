import logger from "../utils/logger.js";
import { useState, useEffect, useMemo } from "react";
import { useNotification } from "../contexts/NotificationContext";
// MUI Components
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Button,
  LinearProgress,
  IconButton,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import Grid from "@mui/material/Grid2";

// Icons
import {
  AutoAwesomeMotionSharp,
  ImageSharp,
  FolderOff,
  CheckCircleOutline,
  Error,
  PendingOutlined,
  Delete,
  Info,
  FiberManualRecord,
} from "@mui/icons-material";

import ImageSearchIcon from "@mui/icons-material/ImageSearch";

// Project components and helper functions
import { deleteItem } from "../actions/handleCollabs";
import { formatFileSize } from "../utils/fileUtils";
import ProgressPanel from "./ProgressPanel";
import Atlas from "./Atlas";

// Importing deepzoom here
const DEEPZOOM_URL = import.meta.env.VITE_APP_DEEPZOOM_URL;

// To fit some of the dates in case of long names
const dateOptions = {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "short",
  year: "2-digit",
};

const QuickActions = ({
  braininfo,
  stats,
  isLoading,
  token,
  refreshBrain,
  walnContent,
}) => {
  const { showWarning, showInfo, showSuccess, showError } = useNotification();

  // Stats expected to be in normalized object shape only
  const rawStats = stats?.rawImages;
  const pyramidStats = stats?.pyramids;
  const registrationStats = stats?.registrations;
  const segmentationStats = stats?.segmentations;
  const pynutilStats = stats?.pynutil;

  const nutilResults =
    pynutilStats?.nutil_results || pynutilStats?.nutilResults || [];

  const unifiedFiles = useMemo(() => {
    const rawImages = rawStats?.tiffs || [];
    const zippedImages = pyramidStats?.zips || [];
    if (!rawImages.length && !zippedImages.length) return [];

    const zippedMap = new Map();
    zippedImages.forEach((zip) => {
      // Extract the base name from the path
      // The name format is as .tif -> .tif.dzip
      const baseName = zip.name.split("/").pop().replace(".dzip", "");
      // add the zipped image modification time
      zip.last_modified = new Date(zip.last_modified).getTime();
      zippedMap.set(baseName, zip);
    });

    logger.debug("Zipped images map", { count: zippedMap.size });

    // Create unified records
    return rawImages.map((raw) => {
      const rawBaseName = raw.name.split("/").pop();
      const matchingZip = zippedMap.get(rawBaseName);

      // TODO Add processed size to the table
      return {
        id: raw.name, // Use full path as unique ID
        fileName: rawBaseName,
        rawPath: raw.name,
        rawSize: raw.bytes,
        rawLastModified: raw.last_modified,
        zipLastModified: matchingZip?.last_modified || null,
        isProcessed: !!matchingZip,
        processedPath: matchingZip?.name || null,
        processedSize: matchingZip?.bytes || null,
        processedLastModified: matchingZip?.last_modified || null,
      };
    });
  }, [rawStats, pyramidStats]);

  let pyramidCount = pyramidStats?.zips?.length ?? 0;
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bucketName, setBucketName] = useState(null);
  // current work alignment file
  const [alignment, setAlignment] = useState(
    localStorage.getItem("alignment") || null
  );

  const [taskStatus, setTaskStatus] = useState({});
  const [pollingInterval, setPollingInterval] = useState(null);

  // Health check state
  const [deepzoomHealth, setDeepzoomHealth] = useState({
    status: "checking", // "checking" | "healthy" | "unhealthy"
    lastChecked: null,
  });

  useEffect(() => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      setUser(userInfo.username);
      setBucketName(localStorage.getItem("bucketName"));
    } catch (error) {
      logger.error("Error parsing userInfo", error);
    }
  }, [token, stats]);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Health check function
  const checkDeepzoomHealth = async () => {
    try {
      const healthUrl = DEEPZOOM_URL.replace(/\/$/, "") + "/health";
      const response = await fetch(healthUrl, {
        method: "GET",
        timeout: 5000, // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "I'm alive!") {
          setDeepzoomHealth({
            status: "healthy",
            lastChecked: new Date(),
          });
        } else {
          setDeepzoomHealth({
            status: "unhealthy",
            lastChecked: new Date(),
          });
        }
      } else {
        setDeepzoomHealth({
          status: "unhealthy",
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      logger.warn("Deepzoom health check failed", error);
      setDeepzoomHealth({
        status: "unhealthy",
        lastChecked: new Date(),
      });
    }
  };

  // Check health on component mount and every 30 seconds
  useEffect(() => {
    checkDeepzoomHealth();
    const healthInterval = setInterval(checkDeepzoomHealth, 30000);

    return () => {
      clearInterval(healthInterval);
    };
  }, []);

  const getHealthIndicator = () => {
    switch (deepzoomHealth.status) {
      case "healthy":
        return {
          icon: (
            <FiberManualRecord sx={{ fontSize: 12, color: "success.main" }} />
          ),
          text: "Service Online",
          color: "success.main",
        };
      case "unhealthy":
        return {
          icon: (
            <FiberManualRecord sx={{ fontSize: 12, color: "error.main" }} />
          ),
          text: "Service Offline",
          color: "error.main",
        };
      case "checking":
      default:
        return {
          icon: (
            <FiberManualRecord sx={{ fontSize: 12, color: "warning.main" }} />
          ),
          text: "Checking...",
          color: "warning.main",
        };
    }
  };

  const processImage = async (imageFile, bucket, targetPath, token) => {
    try {
      const response = await fetch(DEEPZOOM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          path: `${bucket}/${imageFile.path}`,
          target_path: `${bucket}/${targetPath}`,
          token: token,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        fileName: imageFile.name,
        filePath: imageFile.path,
        taskId: data.task_id,
        statusEndpoint: data.status_endpoint,
        status: data.status,
      };
    } catch (error) {
      logger.error("Error processing file", { file: imageFile.name, error });
      throw error;
    }
  };

  const processTiffFiles = async () => {
    if (!braininfo || !unifiedFiles.length) {
      showWarning("No TIFF files found to process");
      return;
    }

    // Only process unprocessed files
    const filesToProcess = unifiedFiles
      .filter((file) => !file.isProcessed)
      .map((file) => ({
        path: file.rawPath,
        name: file.fileName,
      }));

    if (filesToProcess.length === 0) {
      showInfo("All files have already been processed");
      return;
    }

    setIsProcessing(true);
    const sourceBrain = braininfo.path;

    try {
      // Initialize task status for each file
      const initialStatus = {};
      filesToProcess.forEach((file) => {
        initialStatus[file.path] = { status: "pending", progress: 0 };
      });
      setTaskStatus(initialStatus);

      // Start processing and collect task info
      const tasks = await Promise.all(
        filesToProcess.map((imageFile) => {
          const targetPath = `${sourceBrain}zipped_images/`;
          return processImage(imageFile, bucketName, targetPath, token);
        })
      );

      // Store the tasks information
      const tasksInfo = {};
      tasks.forEach((task) => {
        tasksInfo[task.filePath] = {
          taskId: task.taskId,
          fileName: task.fileName,
          statusEndpoint: task.statusEndpoint,
          status: task.status,
          progress: 0,
        };
      });

      setTaskStatus(tasksInfo);

      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      // Set up polling for all tasks - using a ref to track completion
      let completionCheck = false;

      const interval = setInterval(async () => {
        // Get the CURRENT task status (not from closure)
        const currentTaskStatus = { ...tasksInfo }; // Start with initial tasks
        let allCompleted = true;
        let hasActiveTask = false;

        // Check each task's current status
        for (const [filePath, taskInfo] of Object.entries(currentTaskStatus)) {
          if (taskInfo.statusEndpoint) {
            try {
              const status = await pollTaskStatus(
                taskInfo.statusEndpoint,
                filePath
              );

              // If any task is still processing, we're not done
              if (status.status !== "completed" && status.status !== "error") {
                allCompleted = false;
                hasActiveTask = true;
              }
            } catch (error) {
              logger.error("Error polling pyramid conversion task", {
                filePath,
                error,
              });
            }
          }
        }

        // Only stop and refresh if we had tasks and they're all done
        if (
          allCompleted &&
          !completionCheck &&
          Object.keys(currentTaskStatus).length > 0
        ) {
          completionCheck = true;
          clearInterval(interval);
          setPollingInterval(null);
          setIsProcessing(false);

          // Small delay to ensure final status updates are reflected in UI
          setTimeout(() => {
            refreshBrain(); // Refresh to show new files
          }, 1000);
        }
      }, 5000); // Poll every 5 seconds
      // TODO Update this to a exponential backoff strategy

      setPollingInterval(interval);

      showSuccess(
        `Scheduled ${filesToProcess.length} files for conversion - you can leave this page.`
      );
    } catch (error) {
      logger.error("Error processing TIFF files", error);
      showError("Error processing TIFF files. Check the console for details.");
      setIsProcessing(false);
    }
  };

  const pollTaskStatus = async (statusEndpoint, filePath) => {
    try {
      const response = await fetch(
        `https://createzoom.apps.ebrains.eu${statusEndpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const statusData = await response.json();

      setTaskStatus((prevStatus) => ({
        ...prevStatus,
        [filePath]: statusData,
      }));

      return statusData;
    } catch (error) {
      logger.error("Error polling status", error);
      setTaskStatus((prevStatus) => ({
        ...prevStatus,
        [filePath]: {
          status: "error",
          error: error.message,
          progress: 0,
        },
      }));
      return { status: "error", error: error.message };
    }
  };

  const calculateOverallProgress = () => {
    const totalFiles = rawStats?.files || 0;
    if (!isProcessing || Object.keys(taskStatus).length === 0) {
      if (!totalFiles) return 0;
      return (pyramidCount / totalFiles) * 100;
    }

    const tasks = Object.values(taskStatus);
    const totalProgress = tasks.reduce(
      (sum, task) => sum + (task.progress || 0),
      0
    );
    return Math.round(totalProgress / tasks.length);
  };

  if (!braininfo) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 4,
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Choose an image series to view additional information.
          <br />
          If there are none, add a new series by clicking on the 'Add/Edit
          Series' button.
        </Typography>
      </Box>
    );
  }

  const brainStats = rawStats || {};
  const brainPyramids = pyramidStats || {};
  const walnJson = registrationStats || {};
  const segmented = segmentationStats?.files || 0;
  let registered = walnJson.jsons?.length >= 1;

  if (isLoading) {
    return (
      <Box
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          width: "100%",
        }}
      >
        <Typography
          variant="body2"
          className="loading-shine"
          color="textSecondary"
          size="small"
        >
          Loading series...
        </Typography>
      </Box>
    );
  }

  const pyramidComplete = pyramidCount === brainStats.files;

  return (
    <Box sx={{ height: "auto" }}>
      <Grid
        container
        spacing={1}
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Grid size={3}>
          <Card
            sx={{
              boxShadow: "none",
              border: "1px solid #e0e0e0",
              height: "100%",
            }}
          >
            <Typography
              variant="h5"
              color="primary"
              gutterBottom
              sx={{
                fontWeight: "bold",
                wordBreak: "break-word",
                overflow: "hidden",
                textOverflow: "ellipsis",
                borderBottom: "1px solid #e0e0e0",
                padding: 2,
                width: "100%",
              }}
              textAlign="left"
            >
              {braininfo.name}
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Total Images in Series"
                  secondary={brainStats.files || "N/A"}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontSize: "0.8rem",
                    },
                    "& .MuiListItemText-secondary": {
                      fontSize: "0.7rem",
                    },
                  }}
                />
                <Tooltip title="You can add more images from the 'Add or Edit' button">
                  <Info fontSize="small" color="action" />
                </Tooltip>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Size of the Series"
                  secondary={
                    brainStats.size ? formatFileSize(brainStats.size) : "N/A"
                  }
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontSize: "0.8rem",
                    },
                    "& .MuiListItemText-secondary": {
                      fontSize: "0.7rem",
                    },
                  }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Last updated on"
                  secondary={new Date().toLocaleString()}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontSize: "0.8rem",
                    },
                    "& .MuiListItemText-secondary": {
                      fontSize: "0.7rem",
                    },
                  }}
                />
              </ListItem>
            </List>
          </Card>
        </Grid>
        <Grid size={9}>
          <Card
            sx={{
              boxShadow: "none",
              border: "1px solid #e0e0e0",
              // Handled by the button now opacity: registered ? 0.5 : 1,
              "&:hover": {
                cursor: registered ? "not-allowed" : "default",
              },
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  mb: 2,
                  width: "100%",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    mb: { xs: 2, sm: 0 },
                    width: "100%",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",

                      justifyContent: "space-between",
                      width: "100%",
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          textWrap: "wrap",
                          textAlign: "left",
                          fontSize: 16,
                        }}
                      >
                        Convert images to DZI format
                      </Typography>
                      <Tooltip
                        title={`Deepzoom service: ${getHealthIndicator().text}${
                          deepzoomHealth.lastChecked
                            ? ` (Last checked: ${deepzoomHealth.lastChecked.toLocaleTimeString()})`
                            : ""
                        }`}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {getHealthIndicator().icon}
                          <Typography
                            variant="caption"
                            sx={{
                              color: getHealthIndicator().color,
                              fontSize: "0.7rem",
                            }}
                          >
                            {getHealthIndicator().text}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Box>
                    <Button
                      size="small"
                      disabled={!pyramidComplete}
                      sx={{
                        textTransform: "none",
                        fontSize: 12,
                      }}
                      startIcon={<ImageSearchIcon />}
                      onClick={() => {
                        try {
                          if (!pyramidComplete) return;
                          const accessToken =
                            localStorage.getItem("accessToken") || token;
                          const firstZip = pyramidStats?.zips?.[0]?.name;
                          if (!firstZip) return;
                          const url = `https://serieszoom.apps.ebrains.eu/?token=${encodeURIComponent(
                            accessToken
                          )}&dzip=https://data-proxy.ebrains.eu/api/v1/buckets/${bucketName}/${firstZip}`;
                          window.open(url, "_blank", "noopener,noreferrer");
                        } catch (e) {
                          logger.warn("Failed to open SeriesZoom viewer", e);
                        }
                      }}
                    >
                      Inspect images
                    </Button>
                  </Box>
                  {/* Unified Image Table */}
                  <TableContainer
                    component={Paper}
                    sx={{
                      maxHeight: 300,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                      boxShadow: "none",
                    }}
                  >
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>File Name</TableCell>
                          <TableCell>Raw Image Size</TableCell>
                          <TableCell>Uploaded at</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Created at</TableCell>
                          <TableCell>DZIP Size</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unifiedFiles.length > 0 ? (
                          unifiedFiles.map((file) => {
                            const fileStatus = taskStatus[file.rawPath];

                            return (
                              <TableRow
                                key={file.id}
                                sx={{
                                  "&:last-child td, &:last-child th": {
                                    border: 0,
                                  },
                                  bgcolor: file.isProcessed
                                    ? "rgba(76, 175, 80, 0.08)"
                                    : "inherit",
                                }}
                              >
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    {file.isProcessed ? (
                                      <AutoAwesomeMotionSharp fontSize="small" />
                                    ) : (
                                      <ImageSharp fontSize="small" />
                                    )}
                                    <Typography variant="body2">
                                      {file.fileName}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {formatFileSize(file.rawSize)}
                                </TableCell>
                                <TableCell>
                                  {new Date(
                                    file.rawLastModified
                                  ).toLocaleString("en-GB", dateOptions)}
                                </TableCell>
                                <TableCell>
                                  {isProcessing && fileStatus ? (
                                    <Box sx={{ width: "100%" }}>
                                      {fileStatus.status === "pending" &&
                                        "Waiting..."}
                                      {(fileStatus.status === "accepted" ||
                                        fileStatus.status === "processing") && (
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <PendingOutlined
                                            fontSize="small"
                                            color="primary"
                                          />
                                          <Box sx={{ width: "100%" }}>
                                            <Typography variant="caption">
                                              {fileStatus.progress || 0}%
                                            </Typography>
                                            <LinearProgress
                                              variant="determinate"
                                              value={fileStatus.progress || 0}
                                              sx={{
                                                height: 3,
                                                borderRadius: 1,
                                              }}
                                            />
                                          </Box>
                                        </Box>
                                      )}
                                      {fileStatus.status === "completed" && (
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <CheckCircleOutline
                                            fontSize="small"
                                            color="success"
                                          />
                                          <Typography
                                            variant="caption"
                                            color="success.main"
                                          >
                                            Complete
                                          </Typography>
                                        </Box>
                                      )}
                                      {fileStatus.status === "error" && (
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <Error
                                            fontSize="small"
                                            color="error"
                                          />
                                          <Typography
                                            variant="caption"
                                            color="error"
                                          >
                                            Error
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  ) : (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      {file.isProcessed ? (
                                        <>
                                          <CheckCircleOutline
                                            fontSize="small"
                                            color="success"
                                          />
                                          <Typography
                                            variant="caption"
                                            color="success.main"
                                          >
                                            Processed
                                          </Typography>
                                        </>
                                      ) : (
                                        <>
                                          <PendingOutlined
                                            fontSize="small"
                                            color="action"
                                          />
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            Not processed
                                          </Typography>
                                        </>
                                      )}
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {file.isProcessed
                                    ? new Date(
                                        file.zipLastModified
                                      ).toLocaleString("en-GB", dateOptions)
                                    : "-"}
                                </TableCell>

                                <TableCell>
                                  {file.processedSize
                                    ? formatFileSize(file.processedSize)
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Box
                                sx={{
                                  p: 4,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                <FolderOff
                                  sx={{
                                    fontSize: "2rem",
                                    color: "text.disabled",
                                  }}
                                />
                                <Typography color="text.secondary">
                                  No images found
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    width: "100%",
                    justifyContent: "space-between",
                    mt: 2,
                  }}
                >
                  <Box sx={{ mt: 1, width: "100%" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        mb: 1,
                        textAlign: "left",
                        color: "text.secondary",
                      }}
                    >
                      Progress: {pyramidCount} / {brainStats.files || 0} images
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={calculateOverallProgress()}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: (theme) => theme.palette.grey[200],
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Button
                      variant="outlined"
                      disabled={
                        isProcessing ||
                        pyramidComplete ||
                        brainStats.files === 0
                      }
                      onClick={() => {
                        processTiffFiles();
                      }}
                      sx={{
                        size: "md",
                        borderColor: (theme) => theme.palette.grey[800],
                        color: (theme) => theme.palette.grey[800],
                        "&:hover": {
                          borderColor: (theme) => theme.palette.grey[900],
                          backgroundColor: (theme) =>
                            theme.palette.action.hover,
                        },
                      }}
                    >
                      {pyramidComplete
                        ? "Complete"
                        : isProcessing
                        ? "Converting..."
                        : "Convert"}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!registered && (
        <Box
          sx={{
            mt: 1,
            boxShadow: "none",
            border: "1px solid #e0e0e0",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            p: 1,
            borderRadius: 1,
          }}
        >
          <Atlas
            token={token}
            bucketName={bucketName}
            dzips={brainPyramids.zips}
            updateInfo={({ open, message, severity }) => {
              if (open) {
                if (severity === "error") showError(message);
                else if (severity === "warning") showWarning(message);
                else if (severity === "success") showSuccess(message);
                else showInfo(message);
              }
            }}
            refreshBrain={refreshBrain}
          />
        </Box>
      )}
      {walnContent && (
        <ProgressPanel
          walnContent={walnContent}
          currentRegistration={walnJson.jsons?.[0]?.name}
          segmented={segmented}
          nutilResults={nutilResults}
          onDeleteRegistration={() => {
            if (!(bucketName && walnJson.jsons?.[0]?.name)) {
              showWarning("No registration file to delete");
              return;
            }
            deleteItem(bucketName + "/" + walnJson.jsons?.[0]?.name, token);
            logger.debug(
              "Deleting",
              bucketName + "/" + walnJson.jsons?.[0]?.name
            );
            showInfo("Registration file is being deleted");
            setTimeout(() => {
              refreshBrain();
            }, 2000);
          }}
        />
      )}
    </Box>
  );
};

export default QuickActions;
