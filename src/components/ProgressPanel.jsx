import logger from "../utils/logger.js";
import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Tooltip,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";

import { useTabContext } from "../contexts/TabContext";

// Icons
import ArrowOutward from "@mui/icons-material/ArrowOutward";
import Delete from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";

// This is the main atlas name dispalyed on top of the panel as waln containts the abbrev.
const atlasNames = {
  WHS_SD_Rat_v3_39um: "Waxholm Space Atlas of the Sprague Dawley rat v3",
  WHS_SD_Rat_v4_39um: "Waxholm Space Atlas of the Sprague Dawley rat v4",
  ABA_Mouse_CCFv3_2017_25um: "Allen Mouse Brain Atlas CCFv3 2017 25um",
  // More atlases later on maybe
};

// TODO - Get the vanilla atlas screen from QuickActions to here

export default function ProgressPanel({
  walnContent,
  currentRegistration,
  segmented,
  nutilResults,
  onDeleteRegistration,
}) {
  const {
    navigateToWebAlign,
    navigateToWebWarp,
    navigateToWebIlastik,
    navigateToWebNutil,
  } = useTabContext();

  // Set the registration in localStorage on mount if available
  // Replaces button DONE!!
  React.useEffect(() => {
    if (currentRegistration) {
      const storedAlignment = localStorage.getItem("alignment");
      if (storedAlignment !== currentRegistration) {
        localStorage.setItem("alignment", currentRegistration);
        logger.debug("Registration set on mount", { currentRegistration });
      }
    }
  }, [currentRegistration]);

  if (!walnContent) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
        <Typography variant="body2" color="text.secondary"></Typography>
      </Box>
    );
  }

  // Helpers for getting the WALN content
  const sectionList = walnContent?.sections || walnContent?.slices || [];
  const totalImages = sectionList.length;

  // Calculate sections/slices with OUV/anchoring and markers
  const sectionsWithOUVorAnchoring = sectionList.filter(
    (item) =>
      (item?.ouv && item.ouv.length > 0) ||
      (item?.anchoring && item.anchoring.length > 0),
  ).length;
  const sectionsWithMarkers = sectionList.filter(
    (item) => item?.markers && item.markers.length > 0,
  ).length;

  // Verbose logging
  logger.debug("ProgressPanel metrics", {
    totalImages,
    sectionsWithOUVorAnchoring,
    sectionsWithMarkers,
  });

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        backgroundColor: "white",
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
        boxShadow: "none",
        mt: 1,
      }}
    >
      <Stack spacing={2}>
        {/* Header with Atlas and Image Count 
        
        - Initial info, later down will reveal the progress
        
        
        */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" color="primary" noWrap>
              {atlasNames[walnContent.atlas]}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Total brain sections">
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <ImageIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  {totalImages}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip title="Delete registration">
              <IconButton
                size="small"
                onClick={onDeleteRegistration}
                sx={{
                  height: 24,
                  width: 24,
                  "&:hover": {
                    color: "error.main",
                    backgroundColor: "transparent",
                  },
                }}
              >
                <Delete className="tilt-shake" sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack spacing={1} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
            {/* WebAlign Card */}
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(25, 118, 210, 0.05)",
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="primary.main"
                    >
                      Register to Atlas
                    </Typography>
                  </Box>
                  <Tooltip
                    title={`${sectionsWithOUVorAnchoring} of ${totalImages} sections aligned`}
                  >
                    <Typography variant="caption" color="primary.main" fontWeight={500}>
                      {sectionsWithOUVorAnchoring}/{totalImages}
                    </Typography>
                  </Tooltip>
                </Stack>

                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    my: 1,
                  }}
                >
                  <Box sx={{ position: "relative", display: "inline-flex" }}>
                    <CircularProgress
                      variant="determinate"
                      value={(sectionsWithOUVorAnchoring / totalImages) * 100}
                      size={60}
                      thickness={2.5}
                      sx={{ color: "primary.main" }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        component="div"
                        color="primary.main"
                        fontWeight="bold"
                      >
                        {Math.round(
                          (sectionsWithOUVorAnchoring / totalImages) * 100,
                        )}
                        %
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Button
                  size="small"
                  variant="contained"
                  endIcon={<ArrowOutward />}
                  disableElevation
                  onClick={() => navigateToWebAlign(currentRegistration)}
                  disabled={!walnContent}
                  sx={{ fontSize: "0.8rem", mt: 0.5, textTransform: "none" }}
                  fullWidth
                  className="glass-button"
                >
                  Continue in WebAlign
                </Button>
              </Stack>
            </Paper>

            {/* WebWarp Card */}
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(46, 125, 50, 0.05)",
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="success.main"
                    >
                      Refine Registration
                    </Typography>
                  </Box>
                  <Tooltip
                    title={`${sectionsWithMarkers} of ${totalImages} sections warped`}
                  >
                    <Typography variant="caption" color="success.main" fontWeight={500}>
                      {sectionsWithMarkers}/{totalImages}
                    </Typography>
                  </Tooltip>
                </Stack>

                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    my: 1,
                  }}
                >
                  <Box sx={{ position: "relative", display: "inline-flex" }}>
                    <CircularProgress
                      variant="determinate"
                      value={(sectionsWithMarkers / totalImages) * 100}
                      size={60}
                      thickness={2.5}
                      sx={{ color: "success.main" }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        component="div"
                        color="success.main"
                        fontWeight="bold"
                      >
                        {Math.round((sectionsWithMarkers / totalImages) * 100)}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Button
                  size="small"
                  variant="contained"
                  endIcon={<ArrowOutward />}
                  disableElevation
                  onClick={() => navigateToWebWarp(currentRegistration)}
                  color="success"
                  className="glass-button"
                  sx={{ fontSize: "0.8rem", mt: 0.5, textTransform: "none" }}
                  fullWidth
                >
                  Continue in WebWarp
                </Button>
              </Stack>
            </Paper>
            {/* WebIlastik Card
            The info for this section is available via the segments function
            */}
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(184, 110, 20, 0.05)",
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="warning.main"
                    >
                      Extract Labelling
                    </Typography>
                  </Box>
                  <Tooltip title={`${segmented} of ${totalImages} sections labelled`}>
                    <Typography variant="caption" color="warning.main" fontWeight={500}>
                      {segmented}/{totalImages}
                    </Typography>
                  </Tooltip>
                </Stack>

                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    my: 1,
                  }}
                >
                  <Box sx={{ position: "relative", display: "inline-flex" }}>
                    <CircularProgress
                      variant="determinate"
                      value={Math.min((segmented / totalImages) * 100, 100)}
                      size={60}
                      thickness={2.5}
                      color="warning"
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        component="div"
                        color="warning"
                        fontWeight="bold"
                      >
                        {Math.min((segmented / totalImages) * 100, 100).toFixed(
                          2,
                        )}
                        %
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Button
                  size="small"
                  variant="contained"
                  endIcon={<ArrowOutward />}
                  className="glass-button"
                  disableElevation
                  onClick={navigateToWebIlastik}
                  color="warning"
                  sx={{
                    fontSize: "0.8rem",
                    mt: 0.5,
                    textTransform: "none",
                  }}
                  fullWidth
                >
                  Continue in WebIlastik
                </Button>
              </Stack>
            </Paper>
            {/* WebNutil 
            integrity is verified via the csv/other type of result presence WIP */}
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(25, 118, 210, 0.05)",
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="secondary.main"
                    >
                      Quantify
                    </Typography>
                  </Box>
                  {/*<Tooltip title={`nutil tooltip`}>
                    <Chip
                      label={`?`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ height: 22 }}
                    />
                  </Tooltip>
                  */}
                </Stack>

                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    my: 1,
                  }}
                >
                  <Box sx={{ position: "relative", display: "inline-flex" }}>
                    <CircularProgress
                      variant="determinate"
                      value={0}
                      size={60}
                      thickness={2.5}
                      sx={{ color: "warning" }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        component="div"
                        color="secondary"
                        fontWeight="bold"
                      >
                        {nutilResults?.length} results ready
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Button
                  size="small"
                  variant="contained"
                  endIcon={<ArrowOutward />}
                  disableElevation
                  onClick={navigateToWebNutil}
                  color="secondary"
                  sx={{
                    fontSize: "0.8rem",
                    mt: 0.5,
                    textTransform: "none",
                  }}
                  className="glass-button"
                  fullWidth
                >
                  Continue in WebNutil
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
