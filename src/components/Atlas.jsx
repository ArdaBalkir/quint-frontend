import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Button,
} from "@mui/material";
import netunzip from "../actions/atlasUtils";
import logger from "../utils/logger.js";
import { uploadToJson } from "../actions/handleCollabs";
import desktopToWeb from "../actions/desktopToWeb";
// TODO does not use new snakcbars

// Extractor definitions
// Filename has to match the exact name of the DZIP file instead of dzi
const dzisection = (dzi, filename) => {
  const newFilename = filename.replace(/\.dzi$/, ".dzip");
  return {
    filename: newFilename,
    width: parseInt(dzi.match(/Width="(\d+)"/m)[1]),
    height: parseInt(dzi.match(/Height="(\d+)"/m)[1]),
    tilesize: parseInt(dzi.match(/TileSize="(\d+)"/m)[1]),
    overlap: parseInt(dzi.match(/Overlap="(\d+)"/m)[1]),
    format: dzi.match(/Format="([^"]+)"/m)[1],
  };
};

const convertDziToSection = (dziData, snr = 1) => {
  return {
    filename: dziData.filename,
    width: dziData.width,
    height: dziData.height,
    snr: snr,
    format: dziData.format,
    tilesize: dziData.tilesize,
    overlap: dziData.overlap,
  };
};

// Atlas map
const atlasValueToName = {
  1: "Waxholm Space Atlas of the Sprague Dawley rat v2",
  2: "WHS_SD_Rat_v3_39um",
  3: "WHS_SD_Rat_v4_39um",
  4: "Allen Mouse Brain Atlas version 3 2015",
  5: "ABA_Mouse_CCFv3_2017_25um",
};

// Main function to get called with a list

function Atlas({ bucketName, dzips, token, updateInfo, refreshBrain }) {
  // Early return before any hooks are called
  if (!bucketName || !dzips || !token) {
    return null;
  }

  const [atlasName, setAtlasName] = useState(null);
  const [creating, setCreating] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const [atlasProgress, setAtlasProgress] = useState(0);
  const [desktopFile, setDesktopFile] = useState(null);
  const fileInputRef = useRef(null);

  const createAtlas = async (atlasName, bucketName, dzips, token) => {
    logger.info("Creating atlas", {
      atlasName,
      bucketName,
      dzipCount: dzips?.length,
    });

    const sortedDzips = [...dzips].sort((a, b) => a.name.localeCompare(b.name));
    const split = dzips[0].name.split("/");
    const uploadObj = {
      token: token,
      bucketName: bucketName,
      projectName: split[0],
      brainName: split[1],
    };
    let brainAnnounce = uploadObj.brainName; // find a use for this

    try {
      const pathParts = dzips[0].name.split("/");
      pathParts.pop();
      const dziproot = pathParts.join("/");

      const atlas = {
        atlas: atlasName,
        sections: [],
        bucket: bucketName,
        dziproot: dziproot + "/",
      };

      // Redirect param expected for authenticated downloads
      const urlLocator = (url) => {
        return () =>
          fetch(`${url}?redirect=false`, {
            headers: { authorization: `Bearer ${token}` },
          })
            .then((response) => response.json())
            .then((json) => json.url);
      };

      for (let [index, dzipObj] of sortedDzips.entries()) {
        const zipdir = await netunzip(
          urlLocator(
            `https://data-proxy.ebrains.eu/api/v1/buckets/${bucketName}/${dzipObj.name}`
          )
        );

        const dziEntry = Array.from(zipdir.entries.values()).find((entry) =>
          entry.name.endsWith(".dzi")
        );

        if (dziEntry) {
          const data = await zipdir.get(dziEntry);
          const dziContent = new TextDecoder().decode(data);
          const dziData = dzisection(dziContent, dziEntry.name);
          const sectionData = convertDziToSection(dziData, index + 1);
          atlas.sections.push(sectionData);
        }

        setAtlasProgress((index + 1) / sortedDzips.length);
        logger.debug("Atlas section processed", {
          index: index + 1,
          total: sortedDzips.length,
        });
      }

      const walnName = `${atlasName
        .toLowerCase()
        .replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, 19)}.waln`;
      let finalAtlas = atlas;
      if (desktopFile) {
        try {
          finalAtlas = desktopToWeb(desktopFile, atlas);
          logger.info("Desktop alignment merged into atlas");
        } catch (mergeError) {
          logger.error("Failed to merge desktop alignment", mergeError);
          throw new Error(
            typeof mergeError === "string" ? mergeError : mergeError.message
          );
        }
      }
      const response = await uploadToJson(uploadObj, walnName, finalAtlas);
      return finalAtlas;
    } catch (error) {
      logger.error("Error creating atlas", error);
      throw error;
    }
  };

  useEffect(() => {
    logger.info("Files staged for registration", { count: dzips?.length });
    if (dzips && Array.isArray(dzips)) {
      setImageCount(dzips.length);
      logger.info("Images ready for registration", { imageCount });
    }
  }, [dzips]);

  return (
    <Card sx={{ boxShadow: "none", width: "100%", alignItems: "left" }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
            {imageCount || 0} Images are ready for registration
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
            Generate registration file
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
            mt: 1,
            mb: 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (evt) => {
                try {
                  const parsed = JSON.parse(evt.target.result);
                  if (!parsed.slices || !Array.isArray(parsed.slices)) {
                    updateInfo({
                      open: true,
                      message: "Invalid desktop alignment file: missing 'slices' array",
                      severity: "error",
                    });
                    setDesktopFile(null);
                    e.target.value = "";
                    return;
                  }
                  setDesktopFile(parsed);
                  logger.info("Desktop alignment file loaded", {
                    slices: parsed.slices.length,
                    filename: file.name,
                  });
                } catch {
                  updateInfo({
                    open: true,
                    message: "Could not parse desktop alignment file",
                    severity: "error",
                  });
                  setDesktopFile(null);
                  e.target.value = "";
                }
              };
              reader.readAsText(file);
            }}
          />
          <Button
            variant="outlined"
            size="small"
            sx={{
              borderColor: desktopFile ? "success.main" : "grey.500",
              color: desktopFile ? "success.main" : "grey.600",
              whiteSpace: "nowrap",
              flexShrink: 0,
              "&:hover": {
                borderColor: desktopFile ? "success.dark" : "grey.700",
                backgroundColor: "rgba(0,0,0,0.04)",
              },
            }}
            onClick={() => {
              if (desktopFile) {
                setDesktopFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              } else {
                fileInputRef.current?.click();
              }
            }}
          >
            {desktopFile
              ? "Clear desktop alignment"
              : "Upload desktop alignment"}
          </Button>
          {desktopFile && (
            <Typography
              sx={{ color: "success.main", fontSize: 12, flexShrink: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {desktopFile.slices.length} slices loaded
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <FormControl
            fullWidth
            variant="standard"
            sx={{
              margin: "1px",
              width: "80%",
            }}
          >
            <InputLabel htmlFor="grouped-select">
              Select the reference atlas
            </InputLabel>
            <Select
              defaultValue=""
              id="grouped-select"
              label="Select the reference atlas"
              dense="true"
              onChange={(event) => {
                const value = event.target.value;
                setAtlasName(value ? atlasValueToName[value] : null);
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <ListSubheader>Rat Brain Atlases</ListSubheader>
              <MenuItem value={2}>
                Waxholm Space Atlas of the Sprague Dawley rat v3
              </MenuItem>
              <MenuItem value={3}>
                Waxholm Space Atlas of the Sprague Dawley rat v4
              </MenuItem>
              <ListSubheader>Mouse Brain Atlases</ListSubheader>
              <MenuItem value={5}>
                Allen Mouse Brain Atlas version 3 2017
              </MenuItem>
            </Select>
          </FormControl>
          {creating && <Typography>Generating registration...</Typography>}
          {!creating && (
            <Button
              variant="outlined"
              sx={{
                borderColor: "black",
                color: "black",

                "&:hover": {
                  borderColor: "black",
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                },
              }}
              onClick={async () => {
                if (!atlasName) {
                  updateInfo({
                    open: true,
                    message: `Please select an atlas`,
                    severity: "error",
                  });
                  return;
                }
                if (!bucketName || !dzips || !token) {
                  updateInfo({
                    open: true,
                    message: `Missing required parameters for createAtlas`,
                    severity: "error",
                  });

                  logger.warn("Missing required parameters for createAtlas");
                  return;
                }
                if (dzips.length === 0) {
                  updateInfo({
                    open: true,
                    message: `DZI files are required to generate a registration file. Please convert your images to DZI format`,
                    severity: "error",
                  });
                  // Reset creating state to false
                  // moved to logic onclick as the button carried onto execute refreshBrain
                  logger.warn(
                    "DZI files are required to generate a registration file. Please convert your images to DZI format"
                  );
                  return;
                }

                setCreating(true);
                logger.debug("Submitting atlas creation request");
                updateInfo({
                  open: true,
                  message: desktopFile
                    ? `Generating registration file and merging desktop alignment...`
                    : `Generation of the registration file is in progress...`,
                  severity: "info",
                });
                try {
                  await createAtlas(atlasName, bucketName, dzips, token);
                  refreshBrain();
                } catch (err) {
                  updateInfo({
                    open: true,
                    message: err.message || "Failed to generate registration file",
                    severity: "error",
                  });
                  logger.error("Atlas creation failed", err);
                }
                setCreating(false);
              }}
            >
              Generate
            </Button>
          )}
        </Box>
        <Box sx={{ width: "100%", height: 10 }}>
          {creating && (
            <Box
              sx={{
                width: `${atlasProgress * 100}%`,
                height: "100%",
                backgroundColor: "primary.main",
              }}
            ></Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default Atlas;
