import logger from "../utils/logger.js";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Button,
  LinearProgress,
  Typography,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  Delete,
  Upload,
  Analytics,
  SaveAlt,
  Compare,
  Calculate,
  CloudDownload,
  CloudUpload,
  CheckCircle,
  Error,
  HourglassEmpty,
  BarChart,
  Help,
  Visibility,
  ImageOutlined,
  ThreeDRotationOutlined,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import mBrain from "../mBrain.ico";

import {
  fetchBrainSegmentations,
  fetchPyNutilResults,
  deleteItem, // Start implementing possibly click delete -> to delete all files in segmentations?
} from "../actions/handleCollabs";
import { getBrainStats } from "../actions/brainRepository.ts";
import UploadSegments from "./UploadSegments";

// Nutil endpoint, one for submitting and one for polling the status
const NUTIL_URL = "https://pynutil.apps.ebrains.eu";
const MESH_URL = "https://meshview.apps.ebrains.eu/collab.php";

// Shared styles object
const styles = {
  listContainer: {
    backgroundColor: "white",
    border: "1px solid #e0e0e0",
    borderRadius: 1,
    height: "100%",
  },
  listItem: {
    "&:hover": {
      backgroundColor: "#f5f5f5",
      cursor: "pointer",
    },
    borderBottom: "1px solid #e0e0e0",
    transition: "all 0.2s ease",
  },
  toolbarButton: {
    textTransform: "none",
    width: "100%",
    maxWidth: "160px",
    whiteSpace: "nowrap",
    justifyContent: "flex-start",
    padding: "8px",
    color: "text.secondary",
    "&:hover": {
      backgroundColor: "#f5f5f5",
    },
  },
  expandButton: {
    position: "absolute",
    right: -24,
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderLeft: "none",
    borderRadius: "0 4px 4px 0",
    "&:hover": {
      backgroundColor: "#f5f5f5",
    },
  },
  resultsPanel: {
    position: "relative",
    backgroundColor: "white",
    border: "1px solid #e0e0e0",
    borderRadius: 1,
    height: "100%",
    transition: "all 0.3s ease",
  },
};

const atlasLookup = {
  aba_mouse_ccfv3_2017_25um: "ABA_Mouse_CCFv3_2017_25um",
  whs_sd_rat_v3_39um: "WHS_SD_Rat_v3_39um",
  whs_sd_rat_v4_39um: "WHS_SD_Rat_v4_39um",
};

const MeshviewButton = ({ atlas, clouds }) => {
  // Mesh View viewer route
  // Supports a single json for now,
  // TODO allow multiple jsons to be passed in the url after private bucket is resolved
  const handleClick = () => {
    const urlPrefix = "https://data-proxy.ebrains.eu/api/v1/public/buckets/";
    const collabName = localStorage.getItem("bucketName");
    const url = `${MESH_URL}?atlas=${atlasLookup[atlas]}&cloud=${urlPrefix}${collabName}/${clouds}whole_series_meshview/objects_meshview.json`;
    window.open(url, "_blank");
  };
  return (
    <Button
      size="small"
      disabled={!atlas}
      startIcon={<ThreeDRotationOutlined />}
      onClick={handleClick}
      sx={{
        fontSize: "0.75rem",
        py: 0.5,

        borderRadius: 1,
      }}
    >
      View in Meshview
    </Button>
  );
};

const Nutil = ({ token }) => {
  const [brainEntries, setBrainEntries] = useState([]);
  const [error, setError] = useState(null);

  const [segmentations, setSegmentations] = useState([]);
  const [selectedSegmentations, setSelectedSegmentations] = useState([]);

  const [isFetchingSegmentations, setIsFetchingSegmentations] = useState(false);
  const [selectedBrain, setSelectedBrain] = useState(null);

  const [uploadSegmentsOpen, setUploadSegmentsOpen] = useState(false);
  const [registration, setRegistration] = useState({
    atlas: null,
    last_modified: null,
    alignment_json_path: null,
  });
  const [objectColor, setObjectColor] = useState("#ff0000");
  const [isProcessing, setIsProcessing] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [completedResults, setCompletedResults] = useState([]);
  const [isPolling, setIsPolling] = useState(false);

  const getStatusInfo = (status) => {
    switch (status) {
      case "completed":
        return {
          color: "success.light",
          icon: <CheckCircle fontSize="small" />,
        };
      case "failed":
        return { color: "error.light", icon: <Error fontSize="small" /> };
      case "pending":
        return {
          color: "warning.light",
          icon: <HourglassEmpty fontSize="small" />,
        };
      case "downloading json":
        return {
          color: "info.light",
          icon: <CloudDownload fontSize="small" />,
        };
      case "downloading segments":
        return {
          color: "info.light",
          icon: <CloudDownload fontSize="small" />,
        };
      case "quantifying":
        return { color: "info.light", icon: <BarChart fontSize="small" /> };
      case "uploading":
        return { color: "info.light", icon: <CloudUpload fontSize="small" /> };
      default:
        return { color: "warning.light", icon: <Help fontSize="small" /> };
    }
  };

  const requestNutil = async () => {
    if (
      !selectedBrain ||
      !registration.atlas ||
      !atlasLookup[registration.atlas] || // Ensure atlas is valid for lookup
      selectedSegmentations.length === 0
    ) {
      logger.warn("Missing required data for Nutil analysis", {
        selectedBrain,
        registration,
        selectedSegmentations,
      });
      setError(
        "Missing required data (brain, atlas, or segmentations) for Nutil analysis."
      );
      return;
    }

    setIsProcessing(true);
    try {
      const collabName = localStorage.getItem("bucketName");
      const brainPath = `${collabName}/${selectedBrain.path}`;

      const segmentationPath =
        selectedSegmentations[0].name.split("/").slice(0, -1).join("/") + "/";

      // hex -> bgr
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [b, g, r];
      };

      const now = new Date();
      const dateStr = `${now.getFullYear()}_${String(
        now.getMonth() + 1
      ).padStart(2, "0")}_${String(now.getDate()).padStart(2, "0")}_${String(
        now.getHours()
      ).padStart(2, "0")}_${String(now.getMinutes()).padStart(2, "0")}_${String(
        now.getSeconds()
      ).padStart(2, "0")}`;
      // output_path should be bucketName/path/to/output_folder
      const outputPath = `${selectedBrain.path}pynutil_results/${dateStr}`; // Relative to bucket

      // Create the request payload
      const payload = {
        segmentation_path: `${collabName}/${segmentationPath}`,
        alignment_json_path: `${collabName}/${registration.alignment_json_path}`,
        colour: hexToRgb(objectColor),
        atlas_name: atlasLookup[registration.atlas], // Use looked-up atlas name
        output_path: `${collabName}/${outputPath}`, // Full path including bucket name
        token: token,
      };

      logger.debug("Nutil analysis request payload", { payload });
      const response = await fetch(`${NUTIL_URL}/schedule-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        mode: "cors",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Error: ${response.status} - ${
            errorData.detail || response.statusText
          }`
        );
      }

      const result = await response.json();
      logger.info("Nutil task scheduled", { task: result?.task_id });

      // Add the new task to the tasks list with initial status
      if (result && result.task_id) {
        const newTask = {
          id: result.task_id,
          status: "pending", // Initial status from schedule-task might be different, or use polling result
          message: result.message || "Task submitted and processing...",
          createdAt: new Date(),
          brainName: selectedBrain.name,
          outputPath: `${collabName}/${outputPath}`, // Store the full output path
        };

        setTasks((prev) => [...prev, newTask]);

        // Start polling for this task
        if (!isPolling) {
          setIsPolling(true);
        }
      } else {
        logger.error("Task ID not found in schedule-task response", result);
        setError("Failed to get Task ID from Nutil analysis request.");
      }
    } catch (error) {
      logger.error("Error requesting Nutil analysis", error);
      setError(`Failed to process Nutil analysis request: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const pollTaskStatus = async (taskId) => {
    try {
      const baseUrl = import.meta.env.DEV
        ? "/api/pynutil"
        : "https://pynutil.apps.ebrains.eu";
      const response = await fetch(`${baseUrl}/task-status/${taskId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Error fetching task status: ${response.status} - ${
            errorData.detail || response.statusText
          }`
        );
      }

      const result = await response.json(); // result is { task: { ... } }
      return result; // Return the full response object
    } catch (error) {
      logger.error("Error polling task", { taskId, error });
      // Return a structure consistent with a successful poll containing an error status
      return {
        task: { status: "failed", message: `Polling error: ${error.message}` },
      };
    }
  };

  const fetchCompletedResults = async () => {
    if (!selectedBrain) return;

    try {
      const collabName = localStorage.getItem("bucketName");
      const resultsPath = `${selectedBrain.path}`;

      logger.info("Fetching completed results", { resultsPath });

      const response = await fetchPyNutilResults(
        token,
        collabName,
        resultsPath
      );

      logger.debug("Raw response structure", { response });

      if (response && response.length > 0) {
        const folderData = response[0];

        if (folderData.images && folderData.images.length > 0) {
          // Process the deeply nested structure properly
          const results = folderData.images.map((item) => ({
            name:
              item.subdir || item.name || `Result ${item.hash || "Unknown"}`,
            created: item.last_modified || new Date().toISOString(),
            path: item.name || item.subdir, // Use subdir as a fallback for path
            status: "completed",
          }));
          logger.debug("Raw results fetched", {
            keys: Object.keys(results || {}),
          });
          setCompletedResults(results);
          logger.info("Processed results ready", { hasData: !!results });
        } else {
          setCompletedResults([]);
        }
      } else {
        setCompletedResults([]);
      }
    } catch (error) {
      logger.error("Error fetching completed results", error);
      setCompletedResults([]);
    }
  };
  const handleExportResults = async (resultPath) => {
    const bucketName = localStorage.getItem("bucketName");
    if (!bucketName) {
      logger.warn("No bucket name found in localStorage");
      return;
    }

    // Build the zipper URL
    const baseUrl = "https://data-proxy-zipper.ebrains.eu/zip?container=";
    const containerUrl = `https%3A%2F%2Fdata-proxy.ebrains.eu%2Fapi%2Fv1%2Fbuckets%2F${encodeURIComponent(
      bucketName
    )}%3Fprefix%3D${encodeURIComponent(resultPath)}`;
    const zipperUrl = baseUrl + containerUrl;

    logger.info("Downloading zipper results", { zipperUrl });

    try {
      // Usin authentication for the data proxy zipper
      const response = await fetch(zipperUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`
        );
      }

      // Create a blob from the response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${resultPath.split("/").pop() || "results"}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error("Error downloading results", error);
      // Fallback to opening in new tab if fetch fails
      window.open(zipperUrl, "_blank");
    }
  };

  // Call this when a brain is selected to fetch existing results
  useEffect(() => {
    if (selectedBrain) {
      fetchCompletedResults();
    }
  }, [selectedBrain]);

  useEffect(() => {
    let pollingInterval;

    if (tasks.length > 0 && isPolling) {
      pollingInterval = setInterval(async () => {
        let shouldContinuePolling = false;

        const updatedTasks = await Promise.all(
          tasks.map(async (task) => {
            if (task.status !== "completed" && task.status !== "failed") {
              const statusResult = await pollTaskStatus(task.id);

              // Ensure statusResult and statusResult.task exist
              if (statusResult && statusResult.task) {
                const currentTaskStatus = statusResult.task.status;
                const currentTaskMessage = statusResult.task.message;

                if (
                  currentTaskStatus !== "completed" &&
                  currentTaskStatus !== "failed"
                ) {
                  shouldContinuePolling = true;
                }

                if (
                  (currentTaskStatus === "completed" ||
                    currentTaskStatus === "failed") &&
                  task.status !== "completed" && // Check against previous task status
                  task.status !== "failed"
                ) {
                  fetchCompletedResults();
                }

                return {
                  ...task,
                  status: currentTaskStatus,
                  message: currentTaskMessage || task.message, // Use new message or fallback to old
                  completedAt:
                    currentTaskStatus === "completed" ||
                    currentTaskStatus === "failed"
                      ? new Date()
                      : null,
                };
              } else {
                // Handle case where pollTaskStatus might not return the expected structure
                // This could happen if the error return in pollTaskStatus isn't {task: {...}}
                // or if the API returns an unexpected format.
                logger.warn(
                  `Unexpected statusResult for task ${task.id}:`,
                  statusResult
                );
                shouldContinuePolling = true; // Continue polling for this task for now
                return task; // Return unmodified task
              }
            }
            return task; // Return task if already completed or failed
          })
        );

        setTasks(updatedTasks);

        if (
          !shouldContinuePolling &&
          tasks.some((t) => t.status !== "completed" && t.status !== "failed")
        ) {
          // If no tasks are actively being polled but some are still not terminal, ensure polling continues
          // This case might be redundant if shouldContinuePolling is set correctly above.
        }

        // If no tasks are still in progress (pending, quantifying etc.), stop polling
        const anyTaskInProgress = updatedTasks.some(
          (t) => t.status !== "completed" && t.status !== "failed"
        );
        if (!anyTaskInProgress) {
          setIsPolling(false);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [tasks, isPolling, token]); // Added token to dependencies as it's used in pollTaskStatus

  useEffect(() => {
    try {
      // Getting the brain entries from localstorage, previously set by clicking on a project
      const storedBrainEntries = localStorage.getItem("projectBrainEntries");
      if (storedBrainEntries) {
        const parsedEntries = JSON.parse(storedBrainEntries);
        setBrainEntries(parsedEntries);
        logger.debug("Brain entries loaded", { count: parsedEntries.length });
      }
    } catch (error) {
      logger.error("Error loading brain entries", error);
      setError("Failed to load brain entries");
    }
  }, []);

  const getSegmentations = async (brainEntry) => {
    if (!token) {
      alert("Please login to access this feature");
      return;
    }

    setIsFetchingSegmentations(true);
    try {
      let collabName = localStorage.getItem("bucketName");
      let brainPath = brainEntry.path;

      const response = await fetchBrainSegmentations(
        token,
        collabName,
        brainPath
      );
      if (response && response[0] && response[0].images) {
        const imageData = response[0].images;
        logger.info("Brain segmentations fetched", {
          count: imageData?.[0]?.images?.length || 0,
        });
        setSegmentations(imageData);
        setSelectedSegmentations(imageData);
      } else {
        throw new Error("Invalid response structure");
      }
    } catch (error) {
      logger.error("Error fetching brain segmentations", error);
      setSegmentations([]);
      setError("Failed to fetch brain segmentations");
    } finally {
      setIsFetchingSegmentations(false);
    }
  };

  const handleBrainSelect = async (brain) => {
    try {
      setSelectedBrain(brain);
      // Resetting the segmentations and registration state when a new brain is selected
      // Much faster response time for the user
      setRegistration({
        atlas: null,
        last_modified: null,
        alignment_json_path: null,
      });
      setSegmentations([]);
      localStorage.setItem("selectedBrain", JSON.stringify(brain));
      await getSegmentations(brain);
      const bucketName = localStorage.getItem("bucketName");
      const normStats = await getBrainStats(token, bucketName, brain.path);
      logger.debug("Normalized stats", { keys: Object.keys(normStats || {}) });
      const jsonEntry = normStats.registrations?.jsons?.[0];
      if (jsonEntry) {
        const filePath = jsonEntry.name;
        const atlasMatch = filePath.match(/\/([^\/]+)_\d{4}-\d{2}-\d{2}/);
        const atlas = atlasMatch ? atlasMatch[1] : null;
        const lastModified = jsonEntry.last_modified;

        await setRegistration({
          atlas: atlas,
          last_modified: lastModified,
          alignment_json_path: filePath,
        });
        logger.info("Atlas registration found", { filePath });
      } else {
        logger.info("No atlas registration found");
        await setRegistration({
          atlas: "Registration file not found",
          last_modified: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("Error selecting brain", error);
      setError("Failed to select brain");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        backgroundColor: "#f6f6f6",
        gap: 1,
        padding: 1,
      }}
    >
      {/* 
      Brain list
      - > Fetched from the initial chosen project on the main list and populated with the brains in localstorage
      - > Allows the user to select a brain to view the segmentations
      - > Features won't work if no token is provided
      Probably move this documentation somewhere else or get a consistent style for it
      */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1.2 }}>
        <Box sx={{ ...styles.listContainer, overflow: "auto" }}>
          <List>
            {brainEntries.length > 0 ? (
              brainEntries.map((entry, index) => (
                <ListItem
                  key={index}
                  sx={{
                    ...styles.listItem,
                    backgroundColor:
                      selectedBrain?.name === entry.name
                        ? "rgba(28, 148, 86, 0.08)"
                        : "transparent",
                    "&:hover": {
                      backgroundColor:
                        selectedBrain?.name === entry.name
                          ? "rgba(0, 0, 0, 0.12)"
                          : "rgba(0, 0, 0, 0.04)",
                      cursor: "pointer",
                    },
                  }}
                  onClick={() => handleBrainSelect(entry)}
                >
                  <ListItemIcon>
                    <img
                      src={mBrain}
                      alt="Brain Icon"
                      style={{ width: "1.75rem", height: "1.75rem" }}
                    />
                  </ListItemIcon>
                  <ListItemText primary={entry.name.split("/").pop()} />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText
                  primary={"No brains available"}
                  sx={{ color: "error.main" }}
                />
              </ListItem>
            )}
          </List>
        </Box>
      </Box>

      {/* Image list
      - > Allows custom uploads from the user made with Ilastik
      - > Displays the segmentations filled via webilastik
      */}
      <Box sx={{ ...styles.listContainer, flex: 2 }}>
        <Stack
          sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}
          direction="row"
          gap={3}
          spacing={1}
          justifyContent={"space-between"}
        >
          <Box>
            <Tooltip title="Upload your own segmentations from Ilastik">
              <Button
                startIcon={<Upload />}
                size="small"
                onClick={() => {
                  if (!selectedBrain) {
                    alert("Please select a brain first");
                  } else {
                    setUploadSegmentsOpen(true);
                  }
                }}
              >
                Upload Segmentations
              </Button>
            </Tooltip>
            <Button startIcon={<Delete />} size="small" color="error">
              Delete
            </Button>
          </Box>

          <Button
            startIcon={<Compare />}
            variant="contained"
            disableElevation
            size="small"
          >
            Compare
          </Button>
        </Stack>

        <List dense sx={{ overflow: "auto", height: "85vh" }}>
          {" "}
          {isFetchingSegmentations ? (
            <ListItem>
              <Box
                sx={{
                  width: "100%",

                  py: 1,
                  flexDirection: "row",
                  display: "flex",
                  justifyContent: "left",
                  gap: 1,
                }}
              >
                {" "}
                <Typography sx={{ mr: 2 }} className="loading-shine">
                  {" "}
                  Loading segmentations...
                </Typography>
              </Box>
            </ListItem>
          ) : segmentations.length > 0 ? (
            segmentations.map((image, index) => (
              <ListItem
                key={image.hash + index}
                sx={{
                  ...styles.listItem,
                  py: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                <ListItemIcon>
                  <ImageOutlined />{" "}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      {image.name.split("/").pop()}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption">
                      {new Date(image.last_modified).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        }
                      )}{" "}
                      • {(image.bytes / 1024 / 1024).toFixed(1)}MB
                    </Typography>
                  }
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <Box
                sx={{
                  width: "100%",

                  py: 1,
                  flexDirection: "row",
                  display: "flex",
                  justifyContent: "left",
                  gap: 1,
                }}
              >
                {" "}
                <Typography sx={{ mr: 2 }}> No segmentations found</Typography>
              </Box>
            </ListItem>
          )}
        </List>
      </Box>

      <Box
        sx={{
          flex: 2,
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          backgroundColor: "white",
          height: "100%",
        }}
      >
        <Box sx={{ height: "98%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 1.5, borderBottom: "1px solid #e0e0e0" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1.5,
              }}
            >
              <Typography variant="body2">Quantification Settings</Typography>
              <Button
                variant="contained"
                disableElevation
                size="small"
                startIcon={<Analytics />}
                disabled={!registration.atlas || isProcessing}
                onClick={requestNutil}
              >
                {isProcessing ? "Processing..." : "Run analysis"}
              </Button>
            </Box>
            <Box
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                p: 1.5,
                mb: 1.5,
                backgroundColor: "grey.50",
                textAlign: "left",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Reference Atlas
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {atlasLookup[registration.atlas] || "No atlas selected"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Last modified:{" "}
                {registration.last_modified
                  ? new Date(registration.last_modified).toLocaleString(
                      "no-NO",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }
                    )
                  : "Never"}
              </Typography>
            </Box>

            <Box
              sx={{
                // Settings panel
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
              }}
            >
              <Box sx={{ flex: 1, flexDirection: "row" }}>
                <Typography variant="caption" display="block" gutterBottom>
                  Object Color
                </Typography>
                <TextField
                  type="color"
                  size="small"
                  fullWidth
                  value={objectColor}
                  onChange={(e) => setObjectColor(e.target.value)}
                  sx={{
                    '& input[type="color"]': {
                      padding: "2px",
                      height: "32px",
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
          <Box
            sx={{ p: 1.5, flex: 1, display: "flex", flexDirection: "column" }}
          >
            <Typography
              variant="body2"
              gutterBottom
              sx={{ mb: 1, textAlign: "left" }}
            >
              Results
            </Typography>
            <Box
              sx={{
                flex: 1,
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                p: 1.5,
                backgroundColor: "grey.50",
                mb: 1.5,
                overflowY: "auto",
              }}
            >
              {/* Task Status Section */}
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ textAlign: "left" }}
              >
                Job Status
              </Typography>

              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const statusInfo = getStatusInfo(task.status);
                  return (
                    <Box
                      key={task.id}
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 1,
                        p: 1.5,
                        mb: 1.5,
                        backgroundColor: "white",
                        position: "relative",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "medium" }}
                        >
                          Task: {task.id.substring(0, 8)}...
                        </Typography>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor: statusInfo.color,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {statusInfo.icon}
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: "medium" }}
                            color="white"
                          >
                            {task.status.toUpperCase()}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        {task.message ||
                          `Processing ${task.brainName.split("/").pop()}`}
                      </Typography>

                      {task.status !== "completed" &&
                        task.status !== "failed" && (
                          <LinearProgress
                            sx={{ mt: 1.5, height: 6, borderRadius: 3 }}
                          />
                        )}

                      {task.status === "completed" && (
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          variant="outlined"
                          sx={{ mt: 1.5 }}
                          onClick={() => {
                            // Add logic to view results
                            // TODO Use a to sandbox link to open the results
                          }}
                        >
                          View Results
                        </Button>
                      )}

                      {task.completedAt && (
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 1, color: "text.secondary" }}
                        >
                          Completed at: {task.completedAt.toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 2, textAlign: "left" }}
                >
                  No active jobs
                </Typography>
              )}

              {/* Completed Results Section
              -> Listing all the directories within pynutils_results
              
              */}
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ mt: 3, textAlign: "left" }}
              >
                Available Results
              </Typography>

              <Box
                sx={{
                  maxHeight: "45vh",
                  overflowY: "auto",
                  borderBottom: "1px solid #e0e0e0",
                }}
              >
                {completedResults && completedResults.length > 0 ? (
                  completedResults.map((result, index) => (
                    <Box
                      key={index}
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 1,
                        p: 1.5,
                        mb: 1.5,
                        backgroundColor: "white",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "400", textAlign: "left" }}
                      >
                        {(() => {
                          if (!result.name) return "Unnamed Result";
                          const cleanPath = result.name.endsWith("/")
                            ? result.name.slice(0, -1)
                            : result.name;
                          const fileName =
                            cleanPath.split("/").pop() || "Unnamed Result";

                          // There are no dates on the folders in data-proxy so we are using this reconstruct time of creation
                          const timestampPattern =
                            /^(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})$/;
                          const match = fileName.match(timestampPattern);

                          if (match) {
                            const [, year, month, day, hour, minute, second] =
                              match;
                            const date = new Date(
                              year,
                              month - 1,
                              day,
                              hour,
                              minute,
                              second
                            );
                            return `Quantification - ${date.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )} at ${date.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}`;
                          }

                          return fileName;
                        })()}
                      </Typography>

                      {/*<Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{ mt: 1, textAlign: "left" }}
                      >
                        {result.created ? result.created : "No date available"}
                      </Typography>
                        Created info is broken at the api level
                        
                        */}

                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Calculate />}
                          sx={{ fontSize: "0.75rem", py: 0.5 }}
                        >
                          Plot
                        </Button>{" "}
                        <Button
                          size="small"
                          startIcon={<SaveAlt />}
                          sx={{ fontSize: "0.75rem", py: 0.5 }}
                          onClick={() => handleExportResults(result.name)}
                        >
                          Export
                        </Button>
                        <MeshviewButton
                          atlas={registration.atlas}
                          clouds={[result.path]}
                        />
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ p: 2, textAlign: "left" }}>
                    <Typography variant="body2" color="text.secondary">
                      No completed results available
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Submit a job to generate results
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/*
            // These are the old placement for buttons
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" startIcon={<Calculate />} fullWidth>
                Plotting and Viewers
              </Button>
              <Button size="small" startIcon={<SaveAlt />} fullWidth>
                Export Results
              </Button>
            </Box>*/}
          </Box>
        </Box>
      </Box>
      <UploadSegments
        open={uploadSegmentsOpen}
        onClose={() => setUploadSegmentsOpen(false)}
        token={token}
        project={JSON.parse(localStorage.getItem("selectedProject"))}
        brain={selectedBrain}
        onUploadComplete={() => getSegmentations(selectedBrain)}
      />
    </Box>
  );
};

export default Nutil;
