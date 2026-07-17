import logger from "../utils/logger.js";
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  BarChart as BarChartIcon,
  BubbleChart,
  DonutLarge,
  FolderOpen,
  GridView,
  ArrowUpward,
  ArrowDownward,
  Remove,
} from "@mui/icons-material";
import Plot from "react-plotly.js";
import Papa from "papaparse";
import { fetchnutilResults } from "../actions/handleCollabs";
import { getBrainStats } from "../actions/brainRepository.ts";
import { useTabContext } from "../contexts/TabContext";

const Sandbox = ({ token, user }) => {
  // state for nutil results list
  const [nutilResults, setNutilResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedBrain, setSelectedBrain] = useState(null);
  const [brainEntries, setBrainEntries] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [metric, setMetric] = useState("area_fraction");
  const [topNRegions, setTopNRegions] = useState(0);
  const [sortBy, setSortBy] = useState("area_fraction");
  const [sortDir, setSortDir] = useState("desc");

  // csv data state
  const [csvData, setCsvData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBrainLoading, setIsBrainLoading] = useState(false);
  const [error, setError] = useState(null);

  const { switchToTab, setNativeSelection } = useTabContext();

  const goToProjects = () => {
    switchToTab(0);
    setNativeSelection({ native: true, app: "workspace" });
  };

  const regionColor = (row) =>
    `rgb(${Math.round(row.r || 0)},${Math.round(row.g || 0)},${Math.round(row.b || 0)})`;

  const processedRows = useMemo(() => {
    if (!csvData?.rows) return [];
    if (sortDir === "none") return [...csvData.rows];
    return [...csvData.rows].sort((a, b) => {
      if (sortBy === "name") {
        const aVal = a.name || "";
        const bVal = b.name || "";
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const aVal = parseFloat(a[sortBy]) || 0;
      const bVal = parseFloat(b[sortBy]) || 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [csvData, sortBy, sortDir]);

  const visibleRows = useMemo(() => {
    if (chartType === "scatter") return processedRows;
    const rows = processedRows.filter(
      (row) => (parseFloat(row[metric]) || 0) > 0,
    );
    return topNRegions > 0 ? rows.slice(0, topNRegions) : rows;
  }, [chartType, metric, processedRows, topNRegions]);

  const summaryStats = useMemo(() => {
    if (!csvData?.rows?.length) return null;
    const rows = csvData.rows;
    const totalObjects = rows.reduce((s, r) => s + (parseFloat(r.object_count) || 0), 0);
    const topByArea = [...rows]
      .sort((a, b) => (parseFloat(b.area_fraction) || 0) - (parseFloat(a.area_fraction) || 0))
      .slice(0, 3);
    const topByCount = [...rows]
      .sort((a, b) => (parseFloat(b.object_count) || 0) - (parseFloat(a.object_count) || 0))
      .slice(0, 3);
    return { totalObjects, topByArea, topByCount, regionCount: rows.length };
  }, [csvData]);

  // load saved data from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("sandboxSettings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        logger.debug("Loading sandbox settings", settings);
        if (settings.nutilResults) setNutilResults(settings.nutilResults);
        if (settings.selectedBrain) setSelectedBrain(settings.selectedBrain);
        if (settings.brainEntries) setBrainEntries(settings.brainEntries);
      } catch (err) {
        logger.error("Failed to load sandbox settings", err);
      }
    }

    // Load project name on mount
    try {
      const selectedProjectStr = localStorage.getItem("selectedProject");
      if (selectedProjectStr) {
        const selectedProject = JSON.parse(selectedProjectStr);
        setProjectName(selectedProject.name || "");
        logger.debug("Loaded project name", selectedProject.name);
      }
    } catch (err) {
      logger.warn("Failed to parse selectedProject from localStorage", err);
    }
  }, []);

  // fetch brain entries on mount
  useEffect(() => {
    const fetchBrainEntriesAsync = async () => {
      const bucketName = localStorage.getItem("bucketName");
      if (!bucketName || !token) return;

      setIsBrainLoading(true);
      try {
        const selectedProjectStr = localStorage.getItem("selectedProject");
        if (!selectedProjectStr) {
          setBrainEntries([]);
          return;
        }
        const selectedProject = JSON.parse(selectedProjectStr);
        const projectName = selectedProject?.name;
        if (!projectName) {
          setBrainEntries([]);
          return;
        }

        const { listBrains } = await import("../actions/brainRepository.ts");
        const brains = await listBrains(token, bucketName, projectName);
        setBrainEntries(brains || []);

        // auto-select first brain if none selected
        if (brains && brains.length > 0 && !selectedBrain) {
          setSelectedBrain(brains[0]);
        }
      } catch (err) {
        logger.error("Failed to fetch brain entries", err);
        setBrainEntries([]);
      } finally {
        setIsBrainLoading(false);
      }
    };

    fetchBrainEntriesAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // fetch nutil results when brain is selected
  useEffect(() => {
    const fetchNutilResultsList = async () => {
      if (!selectedBrain || !token) return;

      try {
        const bucketName = localStorage.getItem("bucketName");
        const resultsPath = `${selectedBrain.path}`;

        const response = await fetchnutilResults(
          token,
          bucketName,
          resultsPath,
        );

        if (response && response.length > 0) {
          const folderData = response[0];
          if (folderData.images && folderData.images.length > 0) {
            const results = folderData.images.map((item) => ({
              name:
                item.subdir || item.name || `Result ${item.hash || "Unknown"}`,
              created: item.last_modified || new Date().toISOString(),
              path: item.name || item.subdir,
              status: "completed",
            }));
            setNutilResults(results);
          } else {
            setNutilResults([]);
          }
        } else {
          setNutilResults([]);
        }
      } catch (err) {
        logger.error("Failed to fetch nutil results", err);
        setNutilResults([]);
      }
    };

    fetchNutilResultsList();
  }, [selectedBrain, token]);

  // fetch CSV data when a result is clicked
  const handleResultClick = async (result) => {
    setSelectedResult(result);
    setIsLoading(true);
    setError(null);
    setCsvData(null);

    try {
      const bucketName = localStorage.getItem("bucketName");

      // construct the CSV file URL - assuming counts.csv is in the result folder
      const csvPath = `${result.path}whole_series_report/counts.csv`;
      const csvUrl = `https://data-proxy.ebrains.eu/api/v1/buckets/${bucketName}/${csvPath}?redirect=false`;

      const signedUrlResponse = await fetch(csvUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!signedUrlResponse.ok) {
        throw new Error(`Failed to fetch CSV: ${signedUrlResponse.statusText}`);
      }

      const signedData = await signedUrlResponse.json();
      const signedUrl = signedData.url;

      const csvResponse = await fetch(signedUrl);
      if (!csvResponse.ok) {
        throw new Error(`Failed to download CSV: ${csvResponse.statusText}`);
      }

      const csvText = await csvResponse.text();

      // parse CSV with papaparse for proper handling of quotes, commas, etc.
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // automatically convert numbers
      });

      if (parsed.errors.length > 0) {
        throw new Error(`CSV parsing error: ${parsed.errors[0].message}`);
      }

      const headers = parsed.meta.fields;
      const rows = Array.isArray(parsed.data) ? parsed.data : [];

      if (!Array.isArray(rows) || rows.length === 0) {
        logger.warn("CSV parsing returned no valid rows", { parsed });
      }

      setCsvData({ headers, rows });
    } catch (err) {
      logger.error("Failed to fetch CSV data", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatResultName = (name) => {
    if (!name) return "Unnamed Result";
    const cleanPath = name.endsWith("/") ? name.slice(0, -1) : name;
    const fileName = cleanPath.split("/").pop() || "Unnamed Result";

    const timestampPattern =
      /^(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})$/;
    const match = fileName.match(timestampPattern);

    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      const date = new Date(year, month - 1, day, hour, minute, second);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    return fileName;
  };

  // ── Chart renderers ────────────────────────────────────────────────────────

  const renderBarCharts = () => {
    const metricLabel = metric === "area_fraction" ? "Area Fraction" : "Object Count";
    return (
      <Plot
        data={[{
          x: visibleRows.map((row) => row.name),
          y: visibleRows.map((row) => parseFloat(row[metric]) || 0),
          type: "bar",
          marker: { color: visibleRows.map(regionColor) },
          hovertemplate: `<b>%{x}</b><br>${metricLabel}: %{y}${metric === "area_fraction" ? ".4f" : ","}<extra></extra>`,
        }]}
        layout={{
          xaxis: { automargin: true, tickangle: -45 },
          yaxis: { automargin: true, title: metricLabel },
          margin: { l: 70, r: 28, t: 20, b: 150 },
          showlegend: false,
          plot_bgcolor: "#ffffff",
          paper_bgcolor: "#ffffff",
          autosize: true,
        }}
        style={{ width: "100%", height: `${Math.max(360, Math.min(680, visibleRows.length * 34 + 100))}px` }}
        useResizeHandler
        config={{ responsive: true, displaylogo: false }}
      />
    );
  };

  const renderScatterChart = () => {
    const rows = processedRows;
    const maxArea = Math.max(...rows.map((r) => parseFloat(r.area_fraction) || 0), 1);
    return (
      <Plot
        data={[{
          x: rows.map((r) => parseFloat(r.area_fraction) || 0),
          y: rows.map((r) => parseFloat(r.object_count) || 0),
          mode: "markers",
          type: "scatter",
          marker: {
            size: rows.map((r) =>
              Math.max(6, Math.sqrt((parseFloat(r.area_fraction) || 0) / maxArea) * 44),
            ),
            color: rows.map(regionColor),
            opacity: 0.82,
            line: { width: 1, color: "rgba(255,255,255,0.7)" },
          },
          text: rows.map((r) => r.name),
          hovertemplate:
            "<b>%{text}</b><br>Area Fraction: %{x:.4f}<br>Object Count: %{y:,}<extra></extra>",
        }]}
        layout={{
          xaxis: { title: "Area Fraction", automargin: true, zeroline: true },
          yaxis: { title: "Object Count", automargin: true, zeroline: true },
          showlegend: false,
          hovermode: "closest",
          plot_bgcolor: "#ffffff",
          paper_bgcolor: "#ffffff",
          autosize: true,
        }}
        style={{ width: "100%", height: "min(62vh, 620px)" }}
        useResizeHandler
        config={{ responsive: true, displaylogo: false }}
      />
    );
  };

  const renderTreemap = () => {
    const valueLabel = metric === "area_fraction" ? "Area Fraction" : "Object Count";
    return (
      <Plot
        data={[{
          type: "treemap",
          labels: visibleRows.map((r) => r.name),
          parents: visibleRows.map(() => ""),
          values: visibleRows.map((r) => parseFloat(r[metric]) || 0),
          marker: {
            colors: visibleRows.map(regionColor),
            line: { width: 1.5, color: "white" },
          },
          textinfo: "label+percent root",
          hovertemplate: `<b>%{label}</b><br>${valueLabel}: %{value:.4f}<br>%{percentRoot:.1%} of total<extra></extra>`,
          tiling: { packing: "squarify" },
        }]}
        layout={{
          margin: { l: 8, r: 8, t: 8, b: 8 },
          autosize: true,
          paper_bgcolor: "#ffffff",
        }}
        style={{ width: "100%", height: "min(62vh, 620px)" }}
        useResizeHandler
        config={{ responsive: true, displaylogo: false }}
      />
    );
  };

  const renderPieCharts = () => {
    const rows = [...csvData.rows].filter((row) => (parseFloat(row[metric]) || 0) > 0).sort((a, b) => (parseFloat(b[metric]) || 0) - (parseFloat(a[metric]) || 0));
    const regionLimit = topNRegions > 0 ? topNRegions : rows.length;
    const top = rows.slice(0, regionLimit);
    const rest = rows.slice(regionLimit);
    const labels = top.map((row) => row.name);
    const values = top.map((row) => parseFloat(row[metric]) || 0);
    const colors = top.map(regionColor);
    const restSum = rest.reduce((sum, row) => sum + (parseFloat(row[metric]) || 0), 0);
    const metricLabel = metric === "area_fraction" ? "Area Fraction" : "Object Count";
    if (restSum > 0) {
      labels.push(`Other (${rest.length} regions)`);
      values.push(restSum);
      colors.push("#cbd5e1");
    }
    return (
      <Plot
        data={[{ labels, values, marker: { colors }, type: "pie", textinfo: "label+percent", textposition: "outside", automargin: true, hovertemplate: `<b>%{label}</b><br>${metricLabel}: %{value}${metric === "area_fraction" ? ".4f" : ","}<br>%{percent:.1%}<extra></extra>` }]}
        layout={{ showlegend: false, autosize: true, margin: { l: 24, r: 24, t: 28, b: 28 }, paper_bgcolor: "#ffffff" }}
        style={{ width: "100%", height: "min(62vh, 620px)" }}
        useResizeHandler
        config={{ responsive: true, displaylogo: false }}
      />
    );
  };

  // ── Guards ──────────────────────────────────────────────────────────────────

  const bucketName = localStorage.getItem("bucketName");
  const hasProject = !!projectName;
  const hasBucket = !!bucketName;

  if (!hasProject || !hasBucket) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "calc(100vh - 42px)", gap: 2, backgroundColor: "#f5f5f5" }}>
        <FolderOpen sx={{ fontSize: 64, color: "text.disabled" }} />
        <Typography variant="h6" color="text.secondary">No project selected</Typography>
        <Typography variant="body2" color="text.secondary">Select a project and brain series in the Projects tab first.</Typography>
        <Button variant="contained" onClick={goToProjects}>Go to Projects</Button>
      </Box>
    );
  }

  if (isBrainLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 42px)", flexDirection: "column", gap: 2 }}>
        <Typography variant="body2" color="text.secondary" className="loading-shine">Loading brain data...</Typography>
      </Box>
    );
  }

  if (!isBrainLoading && brainEntries.length === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "calc(100vh - 42px)", gap: 2, backgroundColor: "#f5f5f5" }}>
        <BarChartIcon sx={{ fontSize: 64, color: "text.disabled" }} />
        <Typography variant="h6" color="text.secondary">No brain series found</Typography>
        <Typography variant="body2" color="text.secondary">Project &ldquo;{projectName}&rdquo; has no brain series yet.</Typography>
        <Button variant="outlined" onClick={goToProjects}>Go to Projects</Button>
      </Box>
    );
  }

  const dataValid =
    csvData &&
    ["name", "object_count", "area_fraction", "r", "g", "b"].every((c) =>
      csvData.headers.includes(c),
    ) &&
    Array.isArray(csvData.rows) &&
    csvData.rows.length > 0;

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 42px)", backgroundColor: "#f5f5f5" }}>
      {/* Left sidebar */}
      <Box sx={{ width: 320, borderRight: "1px solid #e0e0e0", backgroundColor: "white", display: "flex", flexDirection: "column" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0", textAlign: "left" }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>Quantification Results</Typography>
          <Typography variant="caption" color="text.secondary" display="block">{projectName || "No project selected"}</Typography>
          <Typography variant="caption" color="text.secondary">{selectedBrain ? selectedBrain.name : "No brain selected"}</Typography>
        </Box>

        {/* Brain selector */}
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Select Brain</InputLabel>
            <Select
              value={selectedBrain?.name || ""}
              label="Select Brain"
              onChange={(e) => {
                const brain = brainEntries.find((b) => b.name === e.target.value);
                setSelectedBrain(brain);
                setSelectedResult(null);
                setCsvData(null);
              }}
            >
              {Array.isArray(brainEntries) &&
                brainEntries.map((brain) => (
                  <MenuItem key={brain.name} value={brain.name}>{brain.name}</MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>

        {/* Results list */}
        <List sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
          {nutilResults.length > 0 ? (
            nutilResults.map((result, index) => (
              <ListItem
                key={index}
                button
                selected={selectedResult?.name === result.name}
                onClick={() => handleResultClick(result)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  "&:hover": { backgroundColor: "#f5f5f5" },
                  "&.Mui-selected": {
                    backgroundColor: "primary.light",
                    "&:hover": { backgroundColor: "primary.light" },
                  },
                }}
              >
                <ListItemIcon><BarChartIcon /></ListItemIcon>
                <ListItemText
                  primary={formatResultName(result.name)}
                  primaryTypographyProps={{ variant: "body2", sx: { fontSize: "0.875rem" } }}
                />
              </ListItem>
            ))
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">No results available</Typography>
              <Typography variant="caption" color="text.secondary">Run quantification in WebNutil to see results here</Typography>
            </Box>
          )}
        </List>
      </Box>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, minWidth: 0, p: 3, overflow: "auto" }}>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Typography color="error" variant="body2">Error: {error}</Typography>
          </Box>
        )}

        {!isLoading && !error && !csvData && !selectedResult && (
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", border: "2px dashed #ccc", borderRadius: 2 }}>
            <BarChartIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Select a quantification result</Typography>
            <Typography variant="body2" color="text.secondary">Click on a result from the left to view and analyze the data</Typography>
          </Box>
        )}

        {!isLoading && !error && csvData && !dataValid && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {!Array.isArray(csvData.rows) || csvData.rows.length === 0
              ? "No data rows found in CSV file"
              : 'Required columns "name", "object_count", "area_fraction", "r", "g", "b" not found in CSV data'}
          </Typography>
        )}

        {!isLoading && !error && dataValid && (
          <Box>
            {/* Summary stats */}
            {summaryStats && (
              <Paper
                elevation={0}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "minmax(210px, 0.7fr) repeat(2, minmax(0, 1fr))" },
                  mb: 2.5,
                  border: "1px solid #d9e2ec",
                  borderRadius: 1,
                  overflow: "hidden",
                  backgroundColor: "#ffffff",
                }}
              >
                <Box sx={{ display: "flex", gap: 3, alignItems: "center", px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Regions</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{summaryStats.regionCount}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Total objects</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{summaryStats.totalObjects.toLocaleString()}</Typography>
                  </Box>
                </Box>
                {[
                  { label: "Top area fraction", regions: summaryStats.topByArea },
                  { label: "Top object count", regions: summaryStats.topByCount },
                ].map(({ label, regions }) => (
                  <Box
                    key={label}
                    sx={{
                      minWidth: 0,
                      px: { xs: 1.5, sm: 2 },
                      py: 1.5,
                      borderLeft: { md: "1px solid #e2e8f0" },
                      borderTop: { xs: "1px solid #e2e8f0", md: "none" },
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>{label}</Typography>
                    <Box sx={{ display: "grid", gap: 0.5 }}>
                      {regions.map((region, index) => (
                        <Box key={`${label}-${region.name}`} sx={{ display: "grid", gridTemplateColumns: "16px minmax(0, 1fr)", gap: 0.75, alignItems: "start" }}>
                          <Typography variant="caption" color="text.secondary" sx={{ pt: "1px" }}>{index + 1}</Typography>
                          <Box sx={{ display: "flex", gap: 0.75, alignItems: "start", minWidth: 0 }}>
                            <Box sx={{ width: 8, height: 8, flex: "0 0 auto", mt: "5px", borderRadius: "50%", backgroundColor: regionColor(region) }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35, overflowWrap: "anywhere" }}>{region.name}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}

            {/* Controls bar */}
            <Paper elevation={0} sx={{ p: 1.5, mb: 2, border: "1px solid #d9e2ec", display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", borderRadius: 1, backgroundColor: "#f8fafc" }}>
              <ToggleButtonGroup
                value={chartType}
                exclusive
                onChange={(_, val) => val && setChartType(val)}
                size="small"
              >
                <Tooltip title="Bar chart"><ToggleButton value="bar" aria-label="Bar chart"><BarChartIcon fontSize="small" /></ToggleButton></Tooltip>
                <Tooltip title="Scatter plot"><ToggleButton value="scatter" aria-label="Scatter plot"><BubbleChart fontSize="small" /></ToggleButton></Tooltip>
                <Tooltip title="Treemap"><ToggleButton value="treemap" aria-label="Treemap"><GridView fontSize="small" /></ToggleButton></Tooltip>
                <Tooltip title="Pie chart"><ToggleButton value="pie" aria-label="Pie chart"><DonutLarge fontSize="small" /></ToggleButton></Tooltip>
              </ToggleButtonGroup>

              {chartType !== "scatter" && (
                <>
                  <ToggleButtonGroup value={metric} exclusive size="small" onChange={(_, value) => value && setMetric(value)}>
                    <ToggleButton value="area_fraction">Area fraction</ToggleButton>
                    <ToggleButton value="object_count">Objects</ToggleButton>
                  </ToggleButtonGroup>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                      <MenuItem value="area_fraction">Area Fraction</MenuItem>
                      <MenuItem value="object_count">Object Count</MenuItem>
                      <MenuItem value="name">Name</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={() =>
                      setSortDir((d) =>
                        d === "desc" ? "asc" : d === "asc" ? "none" : "desc",
                      )
                    }
                    title={
                      sortDir === "desc"
                        ? "Descending"
                        : sortDir === "asc"
                          ? "Ascending"
                          : "Unsorted (CSV order)"
                    }
                    sx={{ border: "1px solid #e0e0e0" }}
                  >
                    {sortDir === "desc" ? (
                      <ArrowDownward fontSize="small" />
                    ) : sortDir === "asc" ? (
                      <ArrowUpward fontSize="small" />
                    ) : (
                      <Remove fontSize="small" />
                    )}
                  </IconButton>
                </>
              )}

              {chartType !== "scatter" && (
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Show regions</InputLabel>
                  <Select value={topNRegions} label="Show regions" onChange={(e) => setTopNRegions(e.target.value)}>
                    <MenuItem value={0}>All ({csvData.rows.length})</MenuItem>
                    <MenuItem value={5}>Top 5</MenuItem>
                    <MenuItem value={10}>Top 10</MenuItem>
                    <MenuItem value={15}>Top 15</MenuItem>
                    <MenuItem value={20}>Top 20</MenuItem>
                  </Select>
                </FormControl>
              )}

              <Box sx={{ ml: "auto" }}>
                <Typography variant="caption" color="text.secondary">
                  {selectedResult ? formatResultName(selectedResult.name) : ""}
                </Typography>
              </Box>
            </Paper>

            {/* Chart */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, border: "1px solid #d9e2ec", width: "100%", maxWidth: "100%", overflow: "hidden", boxSizing: "border-box", borderRadius: 1, backgroundColor: "#ffffff" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", px: 0.5, pb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {chartType === "scatter" ? "Area fraction vs object count" : `${metric === "area_fraction" ? "Area fraction" : "Object count"} by region`}
                </Typography>
                {chartType !== "scatter" && <Typography variant="caption" color="text.secondary">Showing {visibleRows.length} regions</Typography>}
              </Box>
              {chartType === "bar" && renderBarCharts()}
              {chartType === "scatter" && renderScatterChart()}
              {chartType === "treemap" && renderTreemap()}
              {chartType === "pie" && renderPieCharts()}
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Sandbox;
