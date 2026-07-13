import logger from "../utils/logger.js";
import { useState, useEffect, useMemo } from "react";
import { useNotification } from "../contexts/NotificationContext";
// MUI Components
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";

// Icons
import {
  FolderOff,
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
import RunningRatLoader from "./RunningRatLoader";

// Importing deepzoom here
const DEEPZOOM_URL = import.meta.env.VITE_APP_DEEPZOOM_URL;
const INGESTION_URL = import.meta.env.VITE_APP_INGESTION_URL;

const URL_OPTIONS = [
  { value: DEEPZOOM_URL, label: "CreateZoom", experimental: false },
  { value: INGESTION_URL, label: "CreateZoom", experimental: true },
];

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
  const nutilStats = stats?.nutil;

  const nutilResults =
    nutilStats?.nutil_results || nutilStats?.nutilResults || [];

  const unifiedFiles = useMemo(() => {
    const rawImages = rawStats?.tiffs || [];
    const zippedImages = pyramidStats?.zips || [];
    const registrationSections =
      walnContent?.sections || walnContent?.slices || [];
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

    const registrationMap = new Map();
    registrationSections.forEach((section) => {
      const baseName = section.filename?.split("/").pop()?.replace(".dzip", "");
      if (baseName) registrationMap.set(baseName, section);
    });

    logger.debug("Zipped images map", { count: zippedMap.size });

    // Create unified records
    return rawImages.map((raw) => {
      const rawBaseName = raw.name.split("/").pop();
      const matchingZip = zippedMap.get(rawBaseName);
      const registrationSection = matchingZip
        ? registrationMap.get(
            matchingZip.name.split("/").pop().replace(".dzip", ""),
          )
        : null;

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
        registrationSection,
        hasOuv: Boolean(
          registrationSection?.ouv || registrationSection?.anchoring,
        ),
        hasMarkers: Boolean(registrationSection?.markers?.length),
      };
    }).sort((a, b) => {
      const sNum = (name) => {
        const m = name.match(/_s(\d+)[a-zA-Z]?/);
        return m ? parseInt(m[1], 10) : Infinity;
      };
      return sNum(a.fileName) - sNum(b.fileName);
    });
  }, [rawStats, pyramidStats, walnContent]);

  let pyramidCount = pyramidStats?.zips?.length ?? 0;
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bucketName, setBucketName] = useState(null);
  // current work alignment file
  const [alignment, setAlignment] = useState(
    localStorage.getItem("alignment") || null,
  );

  const [taskStatus, setTaskStatus] = useState({});
  const [pollingInterval, setPollingInterval] = useState(null);

  // Health check state
  const [deepzoomHealth, setDeepzoomHealth] = useState({
    status: "checking", // "checking" | "healthy" | "unhealthy"
    lastChecked: null,
  });

  const [selectedUrl, setSelectedUrl] = useState(DEEPZOOM_URL);

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
      const healthUrl = selectedUrl.replace(/\/$/, "") + "/health";
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

  // Check health on component mount, when URL changes, and every 30 seconds
  useEffect(() => {
    setDeepzoomHealth({ status: "checking", lastChecked: null });
    checkDeepzoomHealth();
    const healthInterval = setInterval(checkDeepzoomHealth, 30000);

    return () => {
      clearInterval(healthInterval);
    };
  }, [selectedUrl]);

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
      const response = await fetch(selectedUrl, {
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
        }),
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
                filePath,
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
        `Scheduled ${filesToProcess.length} files for conversion - you can leave this page.`,
      );
    } catch (error) {
      logger.error("Error processing TIFF files", error);
      showError("Error processing TIFF files. Check the console for details.");
      setIsProcessing(false);
    }
  };

  const pollTaskStatus = async (statusEndpoint, filePath) => {
    try {
      const baseUrl = new URL(selectedUrl).origin;
      const response = await fetch(
        `${baseUrl}${statusEndpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
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
      0,
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
        <RunningRatLoader height={32} />
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
      <Card
        sx={{
          boxShadow: "none",
          border: "1px solid #e0e0e0",
        }}
      >
        {/* Compact header: brain name + inline stats */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
            px: 2,
            py: 1,
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <Typography
            variant="subtitle1"
            color="primary"
            sx={{
              fontWeight: "bold",
              wordBreak: "break-word",
              mr: 1,
            }}
          >
            {braininfo.name}
          </Typography>
          <Tooltip title="You can add more images from the 'Add or Edit' button">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "grey.100",
                borderRadius: 1,
                px: 1,
                py: 0.25,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Images:
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {brainStats.files || "N/A"}
              </Typography>
            </Box>
          </Tooltip>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              bgcolor: "grey.100",
              borderRadius: 1,
              px: 1,
              py: 0.25,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Size:
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {brainStats.size ? formatFileSize(brainStats.size) : "N/A"}
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
            <Box
              sx={{
                width: "100%",
                flexDirection: "column",
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
                      fontSize: 14,
                    }}
                  >
                    Convert images to DZI format
                  </Typography>
                  <Tooltip title="DZI (Deep Zoom Image) enables smooth viewing of large images and is the file format used by our tools.">
                    <Info
                      fontSize="small"
                      color="action"
                      sx={{ cursor: "help" }}
                    />
                  </Tooltip>
                  <FormControl
                    size="small"
                    sx={{
                      minWidth: 140,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      px: 1,
                    }}
                  >
                    <Select
                      value={selectedUrl}
                      onChange={(e) => setSelectedUrl(e.target.value)}
                      variant="standard"
                      disableUnderline
                      sx={{ fontSize: "0.7rem" }}
                    >
                      {URL_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.7rem" }}>
                          {opt.label}
                          <Box
                            component="span"
                            sx={{
                              ml: 0.75,
                              fontSize: "0.6rem",
                              fontWeight: 600,
                              color: opt.experimental
                                ? "warning.dark"
                                : "success.dark",
                            }}
                          >
                            {opt.experimental ? "Exp" : "Def"}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                        accessToken,
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
                      <TableCell>Size</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Registration</TableCell>
                      <TableCell>Dimensions</TableCell>
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
                              "&:hover": {
                                bgcolor: "rgba(0,0,0,0.02)",
                              },
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2">
                                {file.fileName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Typography variant="body2">
                                  {formatFileSize(file.rawSize)}
                                </Typography>
                                {file.processedSize && (
                                  <>
                                    <Typography variant="caption" color="text.disabled">→</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {formatFileSize(file.processedSize)}
                                    </Typography>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {isProcessing && fileStatus ? (
                                <Box sx={{ width: "100%" }}>
                                  {fileStatus.status === "pending" &&
                                    "Waiting..."}
                                  {(fileStatus.status === "accepted" ||
                                    fileStatus.status === "processing") && (
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
                                  )}
                                  {fileStatus.status === "completed" && (
                                    <Typography variant="caption" color="success.main">
                                      Complete
                                    </Typography>
                                  )}
                                  {fileStatus.status === "error" && (
                                    <Typography variant="caption" color="error">
                                      Error
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Typography
                                  variant="caption"
                                  color={file.isProcessed ? "success.main" : "text.secondary"}
                                >
                                  {file.isProcessed ? "Processed" : "Not processed"}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {file.registrationSection ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: 1,
                                  }}
                                >
                                  <Typography variant="caption" sx={{ color: file.hasOuv ? "primary.main" : "text.disabled" }}>
                                    {file.hasOuv ? "Aligned" : "Not aligned"}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: file.hasMarkers ? "success.main" : "text.disabled" }}>
                                    {file.hasMarkers ? "Warped" : "No markers"}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.disabled">—</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                color={file.registrationSection ? "text.primary" : "text.disabled"}
                              >
                                {file.registrationSection
                                  ? `${file.registrationSection.width || "?"} × ${
                                      file.registrationSection.height || "?"
                                    }`
                                  : "—"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
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
                  Progress:{" "}
                  {Math.max(
                    pyramidCount,
                    Math.round(
                      (calculateOverallProgress() / 100) *
                        (brainStats.files || 0),
                    ),
                  )}{" "}
                  / {brainStats.files || 0} images
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
                    isProcessing || pyramidComplete || brainStats.files === 0
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
                      backgroundColor: (theme) => theme.palette.action.hover,
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
              bucketName + "/" + walnJson.jsons?.[0]?.name,
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
