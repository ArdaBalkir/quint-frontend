import logger from "../utils/logger.js";
import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Tooltip,
  Button,
  LinearProgress,
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

// Single progress card used for each pipeline step (Align, Warp, Ilastik, Nutil)
function ProgressCard({
  title,
  color,
  bgcolor,
  value,
  total,
  progressLabel,
  buttonText,
  onClick,
  disabled,
  countOnly,
}) {
  const percent = total > 0 ? Math.min((value / total) * 100, 100) : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        p: 1.5,
        borderRadius: 2,
        bgcolor,
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={0.5}
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="body2" fontWeight="medium" color={`${color}.main`}>
            {title}
          </Typography>
          {!countOnly && (
            <Tooltip title={progressLabel}>
              <Typography variant="caption" color={`${color}.main`} fontWeight={500}>
                {`${value}/${total}`}
              </Typography>
            </Tooltip>
          )}
        </Stack>

        {countOnly ? (
          <Typography
            variant="caption"
            color={`${color}.main`}
            fontWeight="bold"
            sx={{ minHeight: 22, display: "flex", alignItems: "center" }}
          >
            {progressLabel}
          </Typography>
        ) : (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <LinearProgress
              variant="determinate"
              value={percent}
              color={color}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
              }}
            />
            <Typography
              variant="caption"
              fontWeight="bold"
              color={`${color}.main`}
              sx={{ minWidth: 32, textAlign: "right" }}
            >
              {Math.round(percent)}%
            </Typography>
          </Stack>
        )}

        <Button
          size="small"
          variant="contained"
          endIcon={<ArrowOutward />}
          disableElevation
          onClick={onClick}
          color={color}
          disabled={disabled}
          className="glass-button"
          sx={{ fontSize: "0.8rem", mt: 0.5, textTransform: "none" }}
          fullWidth
        >
          {buttonText}
        </Button>
      </Stack>
    </Paper>
  );
}

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
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Stack spacing={0} sx={{ textAlign: "left" }}>
              <Typography variant="subtitle2" color="primary" noWrap>
                {atlasNames[walnContent.atlas]}
              </Typography>
              {currentRegistration && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ wordBreak: "break-all" }}
                >
                  {currentRegistration}
                </Typography>
              )}
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.25 }}>
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
            <ProgressCard
              title="Register to Atlas"
              color="primary"
              bgcolor="rgba(25, 118, 210, 0.05)"
              value={sectionsWithOUVorAnchoring}
              total={totalImages}
              progressLabel={`${sectionsWithOUVorAnchoring} of ${totalImages} sections aligned`}
              buttonText="Continue in WebAlign"
              onClick={() => navigateToWebAlign(currentRegistration)}
              disabled={!walnContent}
            />

            <ProgressCard
              title="Refine Registration"
              color="success"
              bgcolor="rgba(46, 125, 50, 0.05)"
              value={sectionsWithMarkers}
              total={totalImages}
              progressLabel={`${sectionsWithMarkers} of ${totalImages} sections warped`}
              buttonText="Continue in WebWarp"
              onClick={() => navigateToWebWarp(currentRegistration)}
            />

            <ProgressCard
              title="Extract Labelling"
              color="warning"
              bgcolor="rgba(184, 110, 20, 0.05)"
              value={segmented}
              total={totalImages}
              progressLabel={`${segmented} of ${totalImages} sections labelled`}
              buttonText="Continue in WebIlastik"
              onClick={navigateToWebIlastik}
            />

            <ProgressCard
              title="Quantify"
              color="secondary"
              bgcolor="rgba(25, 118, 210, 0.05)"
              value={nutilResults?.length || 0}
              progressLabel={`${nutilResults?.length || 0} results ready`}
              buttonText="Continue in WebNutil"
              onClick={navigateToWebNutil}
              countOnly
            />
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
