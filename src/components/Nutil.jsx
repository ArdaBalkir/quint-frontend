import logger from "../utils/logger.js";
import { useNotification } from "../contexts/NotificationContext";
import { useTabContext } from "../contexts/TabContext";
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
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  Slider,
  IconButton,
  ButtonBase,
  Collapse,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
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
  ExpandMore,
  ExpandLess,
  ChevronRight,
  Search,
  AccountTreeOutlined,
} from "@mui/icons-material";
import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import mBrain from "../mBrain.ico";
import allen2017RegionsCsv from "../assets/atlasregions/allen2017_colours.csv?raw";
import waxholmV3RegionsCsv from "../assets/atlasregions/waxholm_v3_label.csv?raw";
import waxholmV4RegionsCsv from "../assets/atlasregions/waxholm_v4_label.csv?raw";
import allen2017RegionTree from "../assets/atlasregions/trees/allen_2017_tree.json";
import waxholmV3RegionTree from "../assets/atlasregions/trees/waxholm_v3_tree.json";
import waxholmV4RegionTree from "../assets/atlasregions/trees/waxholm_v4_tree.json";

import {
  downloadWalnJson,
  downloadBucketJson,
  fetchBrainSegmentations,
  fetchnutilResults,
  deleteItem, // Start implementing possibly click delete -> to delete all files in segmentations?
} from "../actions/handleCollabs";
import { getBrainStats } from "../actions/brainRepository.ts";
import { getRegistrationQuantificationSummary } from "../utils/registrationQuantification.js";
import UploadSegments from "./UploadSegments";

// Nutil endpoint, one for submitting and one for polling the status
const NUTIL_URL = "https://webnutil.apps.ebrains.eu";
const MESH_URL = "https://meshview.apps.ebrains.eu/collab.php";
const TERMINAL_TASK_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "canceled",
  "aborted",
]);

const normalizeTaskStatus = (status) =>
  typeof status === "string" ? status.trim().toLowerCase() : "";

const isTerminalTaskStatus = (status) =>
  TERMINAL_TASK_STATUSES.has(normalizeTaskStatus(status));

const getTaskResponseMessage = (payload) => {
  const message = payload?.detail || payload?.message || payload?.task?.message;
  return typeof message === "string" ? message : "";
};

const isTaskNotFoundResponse = (payload) =>
  /task.*not\s+found/i.test(
    `${getTaskResponseMessage(payload)} ${payload?.task?.status || ""}`,
  );

const formatResultDate = (value) => {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("no-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return "Unavailable";
  return seconds < 1 ? `${Math.round(seconds * 1000)} ms` : `${seconds.toFixed(1)} s`;
};

const DetailItem = ({ label, children }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
      {children ?? "Unavailable"}
    </Typography>
  </Box>
);

const ResultDetails = ({ settings }) => {
  const stages = Object.entries(settings?.execution?.stages || {});
  const bgr = settings?.parameters?.target_colour?.value || settings?.colour;
  const rgb = Array.isArray(bgr) && bgr.length === 3 ? [...bgr].reverse() : null;
  const colour = rgb ? `rgb(${rgb.join(", ")})` : null;
  const regionIds =
    settings?.atlas?.custom_mask_region_ids || settings?.custom_mask || null;
  const atlasSlice = settings?.atlas?.slice || settings?.atlas_slice || null;
  const createdAt = settings?.analysis?.created_at || settings?.metadata?.scheduled_at;
  const completedAt = settings?.analysis?.saved_at;
  const totalDuration =
    createdAt && completedAt
      ? (new Date(completedAt).getTime() - new Date(createdAt).getTime()) / 1000
      : null;

  return (
    <Box
      sx={{
        mt: 1.25,
        pt: 1.25,
        borderTop: "1px solid #e0e0e0",
        textAlign: "left",
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        Configuration
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1.25,
          mt: 0.75,
        }}
      >
        <DetailItem label="Atlas">{settings?.atlas?.name || settings?.atlas_name}</DetailItem>
        <DetailItem label="Hemisphere">{settings?.atlas?.hemisphere || settings?.hemisphere || "Both"}</DetailItem>
        <DetailItem label="Target colour">
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
            {colour && (
              <Box
                component="span"
                sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: colour, border: "1px solid #bbb" }}
              />
            )}
            {rgb ? `RGB ${rgb.join(", ")}` : "Unavailable"}
          </Box>
        </DetailItem>
        <DetailItem label="Regions">
          {Array.isArray(regionIds) && regionIds.length > 0
            ? `${regionIds.length} custom (${regionIds.join(", ")})`
            : "All regions"}
        </DetailItem>
        <DetailItem label="Atlas volume">
          {Array.isArray(atlasSlice) && atlasSlice.length > 0
            ? atlasSlice.join(" × ")
            : "Full atlas"}
        </DetailItem>
        <DetailItem label="Coordinate extraction">
          {settings?.parameters?.coordinate_extraction?.non_linear === false
            ? "Disabled"
            : "Enabled"}
        </DetailItem>
      </Box>

      <Typography variant="caption" sx={{ display: "block", fontWeight: 700, mt: 1.5 }}>
        Result summary
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1.25,
          mt: 0.75,
        }}
      >
        <DetailItem label="Sections">{settings?.results?.section_count}</DetailItem>
        <DetailItem label="Objects">{settings?.results?.object_count?.toLocaleString()}</DetailItem>
        <DetailItem label="Pixels">{settings?.results?.pixel_count?.toLocaleString()}</DetailItem>
        <DetailItem label="Regions with objects">{settings?.results?.regions_with_objects}</DetailItem>
        <DetailItem label="Artifacts">{settings?.outputs?.artifact_count}</DetailItem>
        <DetailItem label="Total time">{formatDuration(totalDuration)}</DetailItem>
      </Box>

      <Typography variant="caption" sx={{ display: "block", fontWeight: 700, mt: 1.5 }}>
        History
      </Typography>
      <Box sx={{ mt: 0.75 }}>
        <DetailItem label="Created">{formatResultDate(createdAt)}</DetailItem>
        <Box sx={{ mt: 0.75 }}>
          <DetailItem label="Completed">{formatResultDate(completedAt)}</DetailItem>
        </Box>
        {stages.map(([name, stage]) => (
          <Box
            key={name}
            sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: 0.75 }}
          >
            <Typography variant="caption" sx={{ textTransform: "capitalize" }}>
              {name.replaceAll("_", " ")} · {stage.status}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {Number.isFinite(stage.duration_seconds)
                ? formatDuration(stage.duration_seconds)
                : stage.reason || "—"}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, overflowWrap: "anywhere" }}>
        Task {settings?.analysis?.task_id || settings?.analysis?.id || "unknown"}
        {settings?.software?.version ? ` · WebNutil ${settings.software.version}` : ""}
      </Typography>
    </Box>
  );
};

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
    transition: "all 0.2s ease",
    borderBottom: "1px solid transparent",
    position: "relative",
    "&:not(:last-child)": {
      borderImage:
        "linear-gradient(to right, transparent 12px, #e0e0e0 12px, #e0e0e0 calc(100% - 12px), transparent calc(100% - 12px)) 1",
      borderBottom: "1px solid",
    },
    "& .MuiListItemText-root": {
      borderBottom: "none",
    },
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

const fallbackAtlasShapes = {
  ABA_Mouse_CCFv3_2017_25um: [456, 528, 320],
  WHS_SD_Rat_v3_39um: [512, 1024, 512],
  WHS_SD_Rat_v4_39um: [512, 1024, 512],
};

const atlasAxisLabels = [
  "Mediolateral (left–right)",
  "Anteroposterior (front–back)",
  "Superior–inferior (top–bottom)",
];

const formatAtlasRange = ([start, stop], axisSize) => {
  if (start === 0 && stop === axisSize) return ":";
  return `${start === 0 ? "" : start}:${stop === axisSize ? "" : stop}`;
};

const buildAtlasSlice = (ranges, shape) =>
  ranges.map((range, axis) => formatAtlasRange(range, shape[axis]));

const parseAtlasRegions = (csv) =>
  Papa.parse(csv, { header: true, skipEmptyLines: true })
    .data.filter((row) => row.idx && row.idx !== "0" && row.name)
    .map((row) => ({
      id: String(row.idx),
      name: row.name.trim(),
      color: `rgb(${row.r}, ${row.g}, ${row.b})`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

const regionsByAtlas = {
  aba_mouse_ccfv3_2017_25um: parseAtlasRegions(allen2017RegionsCsv),
  whs_sd_rat_v3_39um: parseAtlasRegions(waxholmV3RegionsCsv),
  whs_sd_rat_v4_39um: parseAtlasRegions(waxholmV4RegionsCsv),
};

const regionTreesByAtlas = {
  aba_mouse_ccfv3_2017_25um: allen2017RegionTree,
  whs_sd_rat_v3_39um: waxholmV3RegionTree,
  whs_sd_rat_v4_39um: waxholmV4RegionTree,
};

const buildSelectableTree = (nodes, regionsById) =>
  nodes.map((node) => {
    const children = buildSelectableTree(node.children || [], regionsById);
    const selectableIds = [
      ...(regionsById.has(String(node.id)) ? [String(node.id)] : []),
      ...children.flatMap((child) => child.selectableIds),
    ];

    return { ...node, children, selectableIds: [...new Set(selectableIds)] };
  });

const filterRegionTree = (nodes, query) => {
  if (!query) return nodes;

  return nodes.flatMap((node) => {
    if (node.name.toLowerCase().includes(query)) return [node];
    const children = filterRegionTree(node.children, query);
    return children.length > 0 ? [{ ...node, children }] : [];
  });
};

const RegionTreeRow = ({ node, depth, selectedIds, expandedIds, onToggle, onExpand, searching }) => {
  const hasChildren = node.children.length > 0;
  const selectedCount = node.selectableIds.reduce(
    (count, id) => count + (selectedIds.has(id) ? 1 : 0),
    0,
  );
  const checked = node.selectableIds.length > 0 && selectedCount === node.selectableIds.length;
  const indeterminate = selectedCount > 0 && !checked;
  const expanded = searching || expandedIds.has(String(node.id));
  const color = node.color ? `#${node.color.replace(/^#/, "")}` : null;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 36,
          pl: depth * 2,
          pr: 1,
          borderRadius: 1,
          "&:hover": { backgroundColor: "action.hover" },
        }}
      >
        <IconButton
          size="small"
          disabled={!hasChildren}
          onClick={() => onExpand(String(node.id))}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name}`}
          sx={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
        </IconButton>
        <Checkbox
          size="small"
          checked={checked}
          indeterminate={indeterminate}
          disabled={node.selectableIds.length === 0}
          onChange={() => onToggle(node.selectableIds, !checked)}
          inputProps={{ "aria-label": `Select ${node.name} bundle` }}
        />
        {color && (
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: color,
              border: "1px solid rgba(0,0,0,0.18)",
              mr: 1,
              flex: "0 0 auto",
            }}
          />
        )}
        <Typography variant="body2" sx={{ minWidth: 0, flex: 1 }}>
          {node.name}
        </Typography>
        {hasChildren && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {selectedCount > 0 ? `${selectedCount}/` : ""}{node.selectableIds.length}
          </Typography>
        )}
      </Box>
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {node.children.map((child) => (
            <RegionTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onExpand={onExpand}
              searching={searching}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

const RegionBundleSelector = ({ atlas, options, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState(new Set());
  const [expandedIds, setExpandedIds] = useState(new Set());

  const optionsById = useMemo(
    () => new Map(options.map((option) => [String(option.id), option])),
    [options],
  );
  const tree = useMemo(
    () => buildSelectableTree(regionTreesByAtlas[atlas] || [], optionsById),
    [atlas, optionsById],
  );
  const visibleTree = useMemo(
    () => filterRegionTree(tree, query.trim().toLowerCase()),
    [tree, query],
  );

  const openDialog = () => {
    setDraftIds(new Set(value.map((region) => String(region.id))));
    setExpandedIds(new Set(tree.map((node) => String(node.id))));
    setQuery("");
    setOpen(true);
  };

  const toggleIds = (ids, select) => {
    setDraftIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const toggleExpanded = (id) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applySelection = () => {
    onChange(
      [...draftIds]
        .map((id) => optionsById.get(id))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        fullWidth
        disabled={disabled}
        onClick={openDialog}
        startIcon={<AccountTreeOutlined />}
        sx={{ minHeight: 48, justifyContent: "flex-start", textTransform: "none" }}
      >
        <Box sx={{ minWidth: 0, textAlign: "left" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Atlas region bundles (hierarchy)
          </Typography>
          <Typography variant="body2" noWrap>
            {value.length === 0
              ? "All regions (default)"
              : `${value.length} region${value.length === 1 ? "" : "s"} selected`}
          </Typography>
        </Box>
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1 }}>
          Select atlas region bundles
          <Typography variant="body2" color="text.secondary">
            Select a branch to include every quantifiable region within it.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2, position: "sticky", top: 0, bgcolor: "background.paper", zIndex: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search regions and bundles"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                  ),
                },
              }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center" }}>
              <Button size="small" onClick={() => setDraftIds(new Set(optionsById.keys()))}>
                Select all
              </Button>
              <Button size="small" onClick={() => setDraftIds(new Set())}>
                Clear
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: "auto !important" }}>
                {draftIds.size} of {options.length} selected
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ px: 1, pb: 2, minHeight: 360, maxHeight: "56vh", overflowY: "auto" }}>
            {visibleTree.length > 0 ? (
              visibleTree.map((node) => (
                <RegionTreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedIds={draftIds}
                  expandedIds={expandedIds}
                  onToggle={toggleIds}
                  onExpand={toggleExpanded}
                  searching={Boolean(query.trim())}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
                No matching regions
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={applySelection}>Apply selection</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const hemisphereLabels = {
  both: "Both hemispheres",
  right: "Right hemisphere",
  left: "Left hemisphere",
};

const nextHemisphere = {
  both: "right",
  right: "left",
  left: "both",
};

const hemisphereHighlight = {
  both: "linear-gradient(90deg, #1c9456 0 100%)",
  right: "linear-gradient(90deg, transparent 0 50%, #1c9456 50% 100%)",
  left: "linear-gradient(90deg, #1c9456 0 50%, transparent 50% 100%)",
};

const HemisphereSelector = ({ value, onChange, disabled }) => (
  <ButtonBase
    disableRipple
    disabled={disabled}
    onClick={() => onChange(nextHemisphere[value])}
    aria-label={`${hemisphereLabels[value]}. Click to change hemisphere.`}
    sx={{
      width: "100%",
      height: "100%",
      py: 0,
      borderRadius: 1,
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      alignItems: "center",
      px: 0.5,
      "&.Mui-disabled": { opacity: 0.45 },
    }}
  >
    <Box
      sx={{
        position: "relative",
        justifySelf: "center",
        width: 92,
        height: 92,
      }}
    >
      <Box
        component="img"
        src={mBrain}
        alt=""
        sx={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.28 }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: hemisphereHighlight[value],
          WebkitMaskImage: `url(${mBrain})`,
          maskImage: `url(${mBrain})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.9) 48%, transparent 66%)",
          backgroundSize: "220% 100%",
          WebkitMaskImage: `url(${mBrain})`,
          maskImage: `url(${mBrain})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          animation: "brain-shine 2.8s ease-in-out infinite",
          "@keyframes brain-shine": {
            "0%, 35%": { backgroundPosition: "180% 0" },
            "75%, 100%": { backgroundPosition: "-80% 0" },
          },
        }}
      />
    </Box>
    <Box sx={{ minWidth: 0, textAlign: "left", justifySelf: "start" }}>
      <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
        {hemisphereLabels[value]}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Click to change
      </Typography>
    </Box>
  </ButtonBase>
);

const AtlasSliceSelector = ({
  enabled,
  onEnabledChange,
  shape,
  ranges,
  onRangeChange,
  disabled,
}) => (
  <Box
    sx={{
      border: "1px solid #e0e0e0",
      borderRadius: 1,
      px: 1.25,
      py: 0.75,
      backgroundColor: "grey.50",
      textAlign: "left",
    }}
  >
    <FormControlLabel
      sx={{ m: 0, width: "100%", justifyContent: "space-between" }}
      labelPlacement="start"
      control={
        <Switch
          size="small"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          inputProps={{ "aria-label": "Limit atlas volume" }}
        />
      }
      label={
        <Box>
          <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
          Create custom atlas volume
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {shape ? `Voxel size ${shape.join(" × ")}` : "Atlas dimensions unavailable"}
          </Typography>
        </Box>
      }
    />

    {enabled && shape && ranges.length === 3 && (
      <Stack spacing={0.5} sx={{ mt: 0.75 }}>
        {shape.map((axisSize, axis) => {
          const range = ranges[axis] || [0, axisSize];
          return (
            <Box key={axis}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {atlasAxisLabels[axis]}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "monospace", fontWeight: 600 }}
                >
                  {formatAtlasRange(range, axisSize)}
                </Typography>
              </Box>
              <Slider
                size="small"
                min={0}
                max={axisSize}
                step={1}
                value={range}
                disableSwap
                valueLabelDisplay="auto"
                getAriaLabel={(thumb) =>
                  `${atlasAxisLabels[axis]} ${
                    thumb === 0 ? "start" : "stop"
                  }`
                }
                onChange={(_, nextRange, activeThumb) => {
                  if (!Array.isArray(nextRange)) return;
                  const adjustedRange = [...nextRange];
                  if (adjustedRange[1] - adjustedRange[0] < 1) {
                    if (activeThumb === 0) {
                      adjustedRange[0] = Math.max(0, adjustedRange[1] - 1);
                    } else {
                      adjustedRange[1] = Math.min(
                        axisSize,
                        adjustedRange[0] + 1,
                      );
                    }
                  }
                  onRangeChange(axis, adjustedRange);
                }}
                sx={{ py: 0, mt: -0.25 }}
              />
            </Box>
          );
        })}
      </Stack>
    )}
  </Box>
);

const MeshviewButton = ({ atlas, clouds }) => {
  // Mesh View viewer route
  // Supports a single json for now,
  // TODO allow multiple jsons to be passed in the url after private bucket is resolved
  const { navigateToMeshView } = useTabContext();
  const handleClick = () => {
    const urlPrefix = "https://data-proxy.ebrains.eu/api/v1/public/buckets/";
    const collabName = localStorage.getItem("bucketName");
    const url = `${MESH_URL}?atlas=${atlasLookup[atlas]}&cloud=${urlPrefix}${collabName}/${clouds}whole_series_meshview/objects_meshview.json`;
    navigateToMeshView(url);
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
  const { showWarning, showInfo, showSuccess, showError } = useNotification();
  const { navigateToSandBox } = useTabContext();

  const [brainEntries, setBrainEntries] = useState([]);
  const [error, setError] = useState(null);
  const [segmentationCounts, setSegmentationCounts] = useState({});

  const [segmentations, setSegmentations] = useState([]);

  const [isFetchingSegmentations, setIsFetchingSegmentations] = useState(false);
  const [selectedBrain, setSelectedBrain] = useState(null);

  const [uploadSegmentsOpen, setUploadSegmentsOpen] = useState(false);
  const [registration, setRegistration] = useState({
    atlas: null,
    last_modified: null,
    alignment_json_path: null,
  });
  const [registrationQuantification, setRegistrationQuantification] =
    useState(null);
  const [objectColor, setObjectColor] = useState("#ff0000");
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [hemisphere, setHemisphere] = useState("both");
  const [atlasMetadata, setAtlasMetadata] = useState({});
  const [limitAtlasVolume, setLimitAtlasVolume] = useState(false);
  const [atlasRanges, setAtlasRanges] = useState([]);
  // TODO implement in the backend nutil bit
  const [extractCoordinates, setExtractCoordinates] = useState(true);
  const [createVisualizations, setCreateVisualizations] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [tasks, setTasks] = useState(() => {
    try {
      const bucketName = localStorage.getItem("bucketName");
      if (!bucketName) return [];
      const stored = localStorage.getItem(`nutilTasks_${bucketName}`);
      if (!stored) return [];
      return JSON.parse(stored)
        .filter((task) => task?.id && !isTerminalTaskStatus(task.status))
        .map((task) => ({
          ...task,
          id: String(task.id),
          createdAt: task.createdAt ? new Date(task.createdAt) : null,
          completedAt: task.completedAt ? new Date(task.completedAt) : null,
        }));
    } catch {
      return [];
    }
  });
  const [completedResults, setCompletedResults] = useState([]);
  const [expandedResultPath, setExpandedResultPath] = useState(null);
  const [resultDetails, setResultDetails] = useState({});
  const [loadingResultDetails, setLoadingResultDetails] = useState({});
  const [resultDetailErrors, setResultDetailErrors] = useState({});
  const [isPolling, setIsPolling] = useState(() => {
    try {
      const bucketName = localStorage.getItem("bucketName");
      if (!bucketName) return false;
      const stored = localStorage.getItem(`nutilTasks_${bucketName}`);
      if (!stored) return false;
      const tasks = JSON.parse(stored);
      return tasks.some(
        (task) => task?.id && !isTerminalTaskStatus(task.status),
      );
    } catch {
      return false;
    }
  });

  const selectedAtlasId = atlasLookup[registration.atlas];
  const atlasShape =
    atlasMetadata[selectedAtlasId]?.shape || fallbackAtlasShapes[selectedAtlasId] || null;

  useEffect(() => {
    let cancelled = false;

    const fetchAtlasMetadata = async () => {
      try {
        const response = await fetch(`${NUTIL_URL}/atlases`);
        if (!response.ok) {
          throw new Error(`Atlas metadata request failed with ${response.status}`);
        }
        const metadata = await response.json();
        if (!cancelled) setAtlasMetadata(metadata);
      } catch (metadataError) {
        logger.warn("Using bundled atlas dimensions", metadataError);
      }
    };

    fetchAtlasMetadata();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const shape =
      atlasMetadata[selectedAtlasId]?.shape ||
      fallbackAtlasShapes[selectedAtlasId] ||
      null;

    setLimitAtlasVolume(false);
    setAtlasRanges(shape ? shape.map((axisSize) => [0, axisSize]) : []);
  }, [selectedAtlasId, atlasMetadata]);

  const getStatusInfo = (status) => {
    switch (status) {
      case "completed":
        return {
          color: "success.light",
          icon: <CheckCircle fontSize="small" sx={{ color: "white" }} />,
        };
      case "failed":
        return { color: "error.light", icon: <Error fontSize="small" sx={{ color: "white" }} /> };
      case "pending":
        return {
          color: "warning.light",
          icon: <HourglassEmpty fontSize="small" sx={{ color: "white" }} />,
        };
      case "downloading json":
        return {
          color: "info.light",
          icon: <CloudDownload fontSize="small" sx={{ color: "white" }} />,
        };
      case "downloading segments":
        return {
          color: "info.light",
          icon: <CloudDownload fontSize="small" sx={{ color: "white" }} />,
        };
      case "quantifying":
        return { color: "info.light", icon: <BarChart fontSize="small" sx={{ color: "white" }} /> };
      case "uploading":
        return { color: "info.light", icon: <CloudUpload fontSize="small" sx={{ color: "white" }} /> };
      default:
        return { color: "warning.light", icon: <Help fontSize="small" sx={{ color: "white" }} /> };
    }
  };

  const requestNutil = async () => {
    if (
      !selectedBrain ||
      !registration.atlas ||
      !atlasLookup[registration.atlas] ||
      segmentations.length === 0
    ) {
      logger.warn("Missing required data for Nutil analysis", {
        selectedBrain,
        registration,
        segmentations,
      });
      setError(
        "Missing required data (brain, atlas, or segmentations) for Nutil analysis.",
      );
      return;
    }

    if (
      limitAtlasVolume &&
      (!atlasShape ||
        atlasRanges.length !== 3 ||
        atlasRanges.some(
          ([start, stop], axis) =>
            start < 0 ||
            stop > atlasShape[axis] ||
            !Number.isInteger(start) ||
            !Number.isInteger(stop) ||
            start >= stop,
        ))
    ) {
      setError("Choose a valid non-empty range for all three atlas axes.");
      return;
    }

    setIsProcessing(true);
    try {
      const collabName = localStorage.getItem("bucketName");
      const brainPath = `${collabName}/${selectedBrain.path}`;

      const segmentationPath =
        segmentations[0].name.split("/").slice(0, -1).join("/") + "/";

      // hex -> bgr
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [b, g, r];
      };

      const now = new Date();
      const dateStr = `${now.getFullYear()}_${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}_${String(now.getDate()).padStart(2, "0")}_${String(
        now.getHours(),
      ).padStart(2, "0")}_${String(now.getMinutes()).padStart(2, "0")}_${String(
        now.getSeconds(),
      ).padStart(2, "0")}`;
      // output_path should be bucketName/path/to/output_folder
      const outputPath = `${selectedBrain.path}nutil_results/${dateStr}`; // Relative to bucket

      // Create the request payload
      const payload = {
        segmentation_path: `${collabName}/${segmentationPath}`,
        alignment_json_path: `${collabName}/${registration.alignment_json_path}`,
        colour: hexToRgb(objectColor),
        atlas_name: atlasLookup[registration.atlas], // Use looked-up atlas name
        output_path: `${collabName}/${outputPath}`, // Full path including bucket name
        token: token,
        ...(hemisphere !== "both" && { hemisphere }),
        ...(selectedRegions.length > 0 && {
          custom_mask: selectedRegions.map((region) => Number(region.id)),
        }),
        ...(limitAtlasVolume && {
          atlas_slice: buildAtlasSlice(atlasRanges, atlasShape),
        }),
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
          }`,
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
        ? "/api/nutil"
        : "https://webnutil.apps.ebrains.eu";
      const response = await fetch(`${baseUrl}/task-status/${taskId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.status === 404 || isTaskNotFoundResponse(responseData)) {
        logger.info("Removing stale Nutil task from the queue", { taskId });
        return { disposition: "stale" };
      }

      if (!response.ok) {
        throw new Error(
          `Error fetching task status: ${response.status} - ${
            getTaskResponseMessage(responseData) || response.statusText
          }`,
        );
      }

      if (!responseData?.task || !responseData.task.status) {
        logger.warn("Removing Nutil task with an invalid status response", {
          taskId,
          responseData,
        });
        return { disposition: "stale" };
      }

      return {
        disposition: isTerminalTaskStatus(responseData.task.status)
          ? "terminal"
          : "active",
        task: responseData.task,
      };
    } catch (error) {
      logger.error("Error polling task", { taskId, error });
      // A temporary network/server problem is not evidence that the job failed.
      // Keep it in the queue and retry on the next polling pass.
      return { disposition: "retry" };
    }
  };

  const fetchCompletedResults = async () => {
    if (!selectedBrain) return;

    try {
      const collabName = localStorage.getItem("bucketName");
      const resultsPath = `${selectedBrain.path}`;

      logger.info("Fetching completed results", { resultsPath });

      const response = await fetchnutilResults(token, collabName, resultsPath);

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

  const toggleResultDetails = async (result) => {
    const resultPath = result.path || result.name;
    if (!resultPath) return;

    if (expandedResultPath === resultPath) {
      setExpandedResultPath(null);
      return;
    }

    setExpandedResultPath(resultPath);
    if (resultDetails[resultPath] || loadingResultDetails[resultPath]) return;

    const bucketName = localStorage.getItem("bucketName");
    if (!bucketName) return;

    setLoadingResultDetails((current) => ({ ...current, [resultPath]: true }));
    setResultDetailErrors((current) => ({ ...current, [resultPath]: null }));

    try {
      const settingsPath = `${resultPath.replace(/\/?$/, "/")}webnutil_settings.json`;
      const settings = await downloadBucketJson(token, bucketName, settingsPath);
      setResultDetails((current) => ({ ...current, [resultPath]: settings }));
    } catch (detailsError) {
      logger.warn("WebNutil settings are unavailable for this result", {
        resultPath,
        error: detailsError,
      });
      setResultDetailErrors((current) => ({
        ...current,
        [resultPath]: "Details are unavailable for this result.",
      }));
    } finally {
      setLoadingResultDetails((current) => ({ ...current, [resultPath]: false }));
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
      bucketName,
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
          `Download failed: ${response.status} ${response.statusText}`,
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

  const handleSaveForPlotting = () => {
    const settings = {
      nutilResults: completedResults,
      selectedBrain: selectedBrain,
      brainEntries: brainEntries,
    };
    localStorage.setItem("sandboxSettings", JSON.stringify(settings));
    logger.info("Saved nutil results for plotting", {
      resultsCount: completedResults.length,
      brain: selectedBrain?.name,
    });
    showSuccess("Results saved for plotting in Sandbox");

    // Navigate to Sandbox tab
    navigateToSandBox();
  };

  const handleDeleteSegmentation = async (segmentation) => {
    if (!token) return;
    const bucketName = localStorage.getItem("bucketName");
    if (!bucketName) return;

    try {
      await deleteItem(`${bucketName}/${segmentation.name}`, token);
      showSuccess("Segmentation deleted");
      await getSegmentations(selectedBrain);
      await fetchAllSegmentationCounts([selectedBrain]);
    } catch (error) {
      logger.error("Failed to delete segmentation", { error });
      showError("Failed to delete segmentation");
    }
  };

  const handleDeleteAllSegmentations = async () => {
    if (!token || segmentations.length === 0) return;
    const bucketName = localStorage.getItem("bucketName");
    if (!bucketName) return;

    try {
      await Promise.all(
        segmentations.map((seg) =>
          deleteItem(`${bucketName}/${seg.name}`, token),
        ),
      );
      showSuccess(`Deleted ${segmentations.length} segmentation(s)`);
      await getSegmentations(selectedBrain);
      await fetchAllSegmentationCounts([selectedBrain]);
    } catch (error) {
      logger.error("Failed to delete segmentations", { error });
      showError("Failed to delete segmentations");
    }
  };

  const handleDeleteResult = async (resultPath) => {
    if (!token) return;
    const bucketName = localStorage.getItem("bucketName");
    if (!bucketName) return;

    try {
      const folderPath = resultPath.endsWith("/")
        ? resultPath
        : resultPath + "/";
      await deleteItem(`${bucketName}/${folderPath}`, token);
      showSuccess("Result is scheduled for deletion!");
      await fetchCompletedResults();
    } catch (error) {
      logger.error("Failed to delete result", { error });
      showError("Failed to delete result");
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
    let pollingInProgress = false;
    let cancelled = false;

    if (tasks.length > 0 && isPolling) {
      pollingInterval = setInterval(async () => {
        if (pollingInProgress) return;
        pollingInProgress = true;

        try {
          const taskUpdates = await Promise.all(
            tasks.map(async (task) => {
              if (isTerminalTaskStatus(task.status)) {
                return { task: null, refreshResults: false };
              }

              const statusResult = await pollTaskStatus(task.id);

              if (statusResult.disposition === "stale") {
                return { task: null, refreshResults: false };
              }

              if (statusResult.disposition === "terminal") {
                return {
                  task: null,
                  refreshResults:
                    normalizeTaskStatus(statusResult.task.status) ===
                    "completed",
                };
              }

              if (statusResult.disposition === "retry") {
                return { task, refreshResults: false };
              }

              return {
                task: {
                  ...task,
                  status: normalizeTaskStatus(statusResult.task.status),
                  message: statusResult.task.message || task.message,
                },
                refreshResults: false,
              };
            }),
          );

          if (cancelled) return;

          const updatedTasks = taskUpdates
            .map((update) => update.task)
            .filter(Boolean);
          setTasks(updatedTasks);

          if (taskUpdates.some((update) => update.refreshResults)) {
            fetchCompletedResults();
          }

          if (updatedTasks.length === 0) {
            setIsPolling(false);
          }
        } finally {
          pollingInProgress = false;
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      cancelled = true;
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [tasks, isPolling, token]); // Added token to dependencies as it's used in pollTaskStatus

  // Persist tasks to localStorage whenever they change
  useEffect(() => {
    const bucketName = localStorage.getItem("bucketName");
    if (!bucketName) return;
    const activeTasks = tasks.filter(
      (task) => task?.id && !isTerminalTaskStatus(task.status),
    );
    localStorage.setItem(`nutilTasks_${bucketName}`, JSON.stringify(activeTasks));
  }, [tasks]);

  useEffect(() => {
    try {
      // Getting the brain entries from localstorage, previously set by clicking on a project
      const storedBrainEntries = localStorage.getItem("projectBrainEntries");
      if (storedBrainEntries) {
        const parsedEntries = JSON.parse(storedBrainEntries);
        setBrainEntries(parsedEntries);
        logger.debug("Brain entries loaded", { count: parsedEntries.length });

        // Fetch segmentation counts for all brains
        fetchAllSegmentationCounts(parsedEntries);

        // Auto-select if there's only one brain entry
        if (parsedEntries.length === 1) {
          handleBrainSelect(parsedEntries[0]);
          logger.info("Auto-selected", {
            brain: parsedEntries[0].name,
          });
        }
      }

    } catch (error) {
      logger.error("Error loading brain entries", error);
      setError("Failed to load brain entries");
    }
  }, []);

  const fetchAllSegmentationCounts = async (brains) => {
    if (!token || !brains || brains.length === 0) return;

    const collabName = localStorage.getItem("bucketName");
    const counts = {};

    await Promise.all(
      brains.map(async (brain) => {
        try {
          const response = await fetchBrainSegmentations(
            token,
            collabName,
            brain.path,
          );
          if (response && response[0] && response[0].images) {
            counts[brain.name] = response[0].images.length;
          } else {
            counts[brain.name] = 0;
          }
        } catch (error) {
          logger.error("Error fetching segmentation count for brain", {
            brain: brain.name,
            error,
          });
          counts[brain.name] = 0;
        }
      }),
    );

    setSegmentationCounts((prev) => ({ ...prev, ...counts }));
    logger.info("Segmentation counts fetched", { counts });
  };

  const getSegmentations = async (brainEntry) => {
    if (!token) {
      showWarning("Please login to access this feature");
      return;
    }

    setIsFetchingSegmentations(true);
    try {
      let collabName = localStorage.getItem("bucketName");
      let brainPath = brainEntry.path;

      const response = await fetchBrainSegmentations(
        token,
        collabName,
        brainPath,
      );
      if (response && response[0] && response[0].images) {
        const imageData = response[0].images;
        logger.info("Brain segmentations fetched", {
          count: imageData?.[0]?.images?.length || 0,
        });
        setSegmentations(imageData);
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
      setRegistrationQuantification(null);
      setSelectedRegions([]);
      setHemisphere("both");
      setLimitAtlasVolume(false);
      setExpandedResultPath(null);
      setResultDetails({});
      setLoadingResultDetails({});
      setResultDetailErrors({});
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

        try {
          const registrationContent = await downloadWalnJson(
            token,
            bucketName,
            filePath,
          );
          setRegistrationQuantification(
            getRegistrationQuantificationSummary(registrationContent),
          );
        } catch (registrationError) {
          logger.error("Failed to inspect registration content", {
            filePath,
            error: registrationError,
          });
          setRegistrationQuantification(null);
        }
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

  const regionOptions = regionsByAtlas[registration.atlas] || [];

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
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <Typography variant="body2">
                          {entry.name.split("/").pop()}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            ml: 1,
                          }}
                        >
                          {segmentationCounts[entry.name] !== undefined
                            ? `${segmentationCounts[entry.name]} segmentation${
                                segmentationCounts[entry.name] !== 1 ? "s" : ""
                              }`
                            : "..."}
                        </Typography>
                      </Box>
                    }
                  />
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
                    showWarning("Please select a brain first");
                  } else {
                    setUploadSegmentsOpen(true);
                  }
                }}
              >
                Upload Segmentations
              </Button>
            </Tooltip>
            <Button
              startIcon={<Delete />}
              size="small"
              color="error"
              onClick={handleDeleteAllSegmentations}
              disabled={segmentations.length === 0 || !token}
            >
              Delete All
            </Button>
          </Box>

          <Button
            startIcon={<Compare />}
            variant="contained"
            disableElevation
            size="small"
            onClick={() => {
              if (!selectedBrain) {
                showWarning("Please select a brain first");
                return;
              }

              const bucketName = localStorage.getItem("bucketName");
              const brainPath = selectedBrain.path;
              const workdir = `https://data-proxy.ebrains.eu/api/v1/buckets/${bucketName}/${brainPath}`;

              const params = new URLSearchParams({
                mode: "viewer",
                workdir,
                token,
                server: "https://app.ilastik.org/api/",
              });

              window.open(
                `https://app.ilastik.org/app/?${params.toString()}`,
                "_blank",
              );
            }}
          >
            Compare Overlayed Segmentations
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
            segmentations.map((image, index) => {
              return (
                <ListItem
                  key={image.hash + index}
                  disablePadding
                  sx={{
                    ...styles.listItem,
                    py: 0.5,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      px: 2,
                      py: 0.5,
                    }}
                  >
                    <ListItemIcon>
                      <ImageOutlined />
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
                            },
                          )}{" "}
                          • {(image.bytes / 1024 / 1024).toFixed(1)}MB
                        </Typography>
                      }
                    />
                  </Box>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    sx={{
                      mr: 1,
                      "&:hover": {
                        color: "error.main",
                        backgroundColor: "transparent",
                      },
                    }}
                    className="tilt-shake"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSegmentation(image);
                    }}
                  >
                    <Delete />
                  </IconButton>
                </ListItem>
              );
            })
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
          <Box
            sx={{
              // Quantification Settings Area
              p: 1.5,
              borderBottom: "1px solid #e0e0e0",
            }}
          >
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Quantification Settings
            </Typography>

            <Box
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                px: 1.5,
                py: 1,
                mb: 1,
                backgroundColor: "grey.50",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  Reference Atlas
                </Typography>
                <Typography variant="body2" noWrap>
                  {atlasLookup[registration.atlas] || "No atlas selected"}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flex: "0 0 auto", textAlign: "right" }}
              >
                {registration.last_modified
                  ? new Date(registration.last_modified).toLocaleString(
                      "no-NO",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      },
                    )
                  : "Never"}
              </Typography>
            </Box>

            {registrationQuantification?.missingRegistrationImages > 0 && (
              <Alert severity="warning" sx={{ mb: 1.5, textAlign: "left" }}>
                Only {registrationQuantification.quantifiableImages} of{" "}
                {registrationQuantification.totalImages} images will be
                quantified. {registrationQuantification.missingRegistrationImages}{" "}
                {registrationQuantification.missingRegistrationImages === 1
                  ? "image has"
                  : "images have"}{" "}
                no atlas registration data and cannot be quantified.
                Return to WebAlign and WebWarp to finish registration.
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
                gap: 1.5,
                mb: 1.5,
                alignItems: "stretch",
              }}
            >
              <Stack spacing={1}>
                <Box>
                  <HemisphereSelector
                    value={hemisphere}
                    onChange={setHemisphere}
                    disabled={!registration.atlas || regionOptions.length === 0}
                  />
                </Box>
                {/* Atlas volume selection temporarily hidden.
                <AtlasSliceSelector
                  enabled={limitAtlasVolume}
                  onEnabledChange={setLimitAtlasVolume}
                  shape={atlasShape}
                  ranges={atlasRanges}
                  disabled={!registration.atlas || !atlasShape}
                  onRangeChange={(axis, nextRange) =>
                    setAtlasRanges((currentRanges) =>
                      currentRanges.map((range, index) =>
                        index === axis ? nextRange : range,
                      ),
                    )
                  }
                />
                */}
              </Stack>

              <Stack spacing={1}>
                <RegionBundleSelector
                  atlas={registration.atlas}
                  options={regionOptions}
                  value={selectedRegions}
                  disabled={regionOptions.length === 0}
                  onChange={setSelectedRegions}
                />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: 40,
                    px: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Colour to quantify
                  </Typography>
                  <Box
                    component="label"
                    sx={{
                      width: 30,
                      height: 30,
                      position: "relative",
                      flex: "0 0 auto",
                      borderRadius: "50%",
                      backgroundColor: objectColor,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                      "&:hover": {
                        transform: "scale(1.08)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      },
                    }}
                  >
                    <input
                      type="color"
                      aria-label="Colour to quantify"
                      value={objectColor}
                      onChange={(e) => setObjectColor(e.target.value)}
                      style={{
                        opacity: 0,
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        cursor: "pointer",
                      }}
                    />
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  disableElevation
                  size="small"
                  startIcon={<Analytics />}
                  disabled={
                    !registration.atlas ||
                    isProcessing ||
                    segmentations.length === 0
                  }
                  onClick={requestNutil}
                  fullWidth
                  sx={{ height: 40, minHeight: 40, flex: "0 0 40px" }}
                >
                  {isProcessing ? "Processing..." : "Run analysis"}
                </Button>
              </Stack>
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
                            py: 0.25,
                            borderRadius: 5,
                            backgroundColor: statusInfo.color,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {statusInfo.icon}
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, fontSize: "0.68rem", letterSpacing: 0.3 }}
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
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 1, color: "text.secondary" }}
                        >
                          You can now view the results in the "Available
                          Results" section!
                        </Typography>
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
              -> Listing all the directories within nutils_results
              
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
                              second,
                            );
                            return `Quantification - ${date.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
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
                          onClick={handleSaveForPlotting}
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
                        <Button
                          size="small"
                          endIcon={
                            expandedResultPath === (result.path || result.name) ? (
                              <ExpandLess />
                            ) : (
                              <ExpandMore />
                            )
                          }
                          sx={{ fontSize: "0.75rem", py: 0.5 }}
                          onClick={() => toggleResultDetails(result)}
                        >
                          Details
                        </Button>
                        <MeshviewButton
                          atlas={registration.atlas}
                          clouds={[result.path]}
                        />
                        <Button
                          size="small"
                          startIcon={<Delete />}
                          color="error"
                          sx={{ fontSize: "0.75rem", py: 0.5 }}
                          onClick={() => handleDeleteResult(result.path)}
                        >
                          Delete
                        </Button>
                      </Box>
                      <Collapse
                        in={expandedResultPath === (result.path || result.name)}
                        timeout="auto"
                        unmountOnExit
                      >
                        {loadingResultDetails[result.path || result.name] ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 1.25, textAlign: "left" }}
                          >
                            Loading analysis details…
                          </Typography>
                        ) : resultDetailErrors[result.path || result.name] ? (
                          <Alert severity="info" sx={{ mt: 1.25, textAlign: "left" }}>
                            {resultDetailErrors[result.path || result.name]}
                          </Alert>
                        ) : resultDetails[result.path || result.name] ? (
                          <ResultDetails settings={resultDetails[result.path || result.name]} />
                        ) : null}
                      </Collapse>
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
        onUploadComplete={async () => {
          await getSegmentations(selectedBrain);
          await fetchAllSegmentationCounts([selectedBrain]);
        }}
      />
    </Box>
  );
};

export default Nutil;
