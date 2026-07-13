import logger from "../utils/logger.js";
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
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
  const [topNRegions, setTopNRegions] = useState(10);
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

  const summaryStats = useMemo(() => {
    if (!csvData?.rows?.length) return null;
    const rows = csvData.rows;
    const totalObjects = rows.reduce((s, r) => s + (parseFloat(r.object_count) || 0), 0);
    const topByArea = rows.reduce(
      (max, r) => (parseFloat(r.area_fraction) || 0) > (parseFloat(max.area_fraction) || 0) ? r : max,
      rows[0],
    );
    const topByCount = rows.reduce(
      (max, r) => (parseFloat(r.object_count) || 0) > (parseFloat(max.object_count) || 0) ? r : max,
      rows[0],
    );
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
    const rows = processedRows;
    const areaRows = rows.filter((r) => (parseFloat(r.area_fraction) || 0) > 0);
    const countRows = rows.filter((r) => (parseFloat(r.object_count) || 0) > 0);
    const sizeFor = (n) => {
      const width = Math.min(Math.max(700, n * 40 + 160), 2200);
      const height = Math.min(Math.max(Math.round(width * 0.55), 500), 750);
      return { width, height };
    };
    const areaSize = sizeFor(areaRows.length);
    const countSize = sizeFor(countRows.length);
    const makeLayout = (title, yTitle) => ({
      title: { text: title, automargin: true },
      xaxis: { automargin: true, tickangle: -45 },
      yaxis: { automargin: true, title: yTitle },
      margin: { l: 70, r: 20, t: 60, b: 160 },
      showlegend: false,
      plot_bgcolor: "#fafafa",
    });
    return (
      <>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Plot
            data={[{
              x: areaRows.map((r) => r.name),
              y: areaRows.map((r) => parseFloat(r.area_fraction) || 0),
              type: "bar",
              marker: { color: areaRows.map(regionColor) },
              hovertemplate: "<b>%{x}</b><br>Area Fraction: %{y:.4f}<extra></extra>",
            }]}
            layout={makeLayout("Area Fraction by Region", "Area Fraction")}
            style={{ width: `${areaSize.width}px`, height: `${areaSize.height}px` }}
            useResizeHandler
            config={{ responsive: true }}
          />
        </Box>
        <Box sx={{ mt: 3, width: "100%", overflowX: "auto" }}>
          <Plot
            data={[{
              x: countRows.map((r) => r.name),
              y: countRows.map((r) => parseFloat(r.object_count) || 0),
              type: "bar",
              marker: { color: countRows.map(regionColor) },
              hovertemplate: "<b>%{x}</b><br>Object Count: %{y:,}<extra></extra>",
            }]}
            layout={makeLayout("Object Count by Region", "Object Count")}
            style={{ width: `${countSize.width}px`, height: `${countSize.height}px` }}
            useResizeHandler
            config={{ responsive: true }}
          />
        </Box>
      </>
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
          title: { text: "Area Fraction vs Object Count", automargin: true },
          xaxis: { title: "Area Fraction", automargin: true, zeroline: true },
          yaxis: { title: "Object Count", automargin: true, zeroline: true },
          showlegend: false,
          hovermode: "closest",
          plot_bgcolor: "#fafafa",
          autosize: true,
        }}
        style={{ width: "100%", height: "700px" }}
        useResizeHandler
        config={{ responsive: true }}
      />
    );
  };

  const renderTreemap = () => {
    const rows = processedRows;
    const valueKey = sortBy === "name" ? "area_fraction" : sortBy;
    const valueLabel = valueKey === "area_fraction" ? "Area Fraction" : "Object Count";
    return (
      <Plot
        data={[{
          type: "treemap",
          labels: rows.map((r) => r.name),
          parents: rows.map(() => ""),
          values: rows.map((r) => parseFloat(r[valueKey]) || 0),
          marker: {
            colors: rows.map(regionColor),
            line: { width: 1.5, color: "white" },
          },
          textinfo: "label+percent root",
          hovertemplate: `<b>%{label}</b><br>${valueLabel}: %{value:.4f}<br>%{percentRoot:.1%} of total<extra></extra>`,
          tiling: { packing: "squarify" },
        }]}
        layout={{
          title: { text: `Region Map — ${valueLabel}`, automargin: true },
          margin: { l: 10, r: 10, t: 60, b: 10 },
          autosize: true,
        }}
        style={{ width: "100%", height: "700px" }}
        useResizeHandler
        config={{ responsive: true }}
      />
    );
  };

  const renderPieCharts = () => {
    const processPieData = (valueKey) => {
      const sorted = [...csvData.rows].sort(
        (a, b) => (parseFloat(b[valueKey]) || 0) - (parseFloat(a[valueKey]) || 0),
      );
      const top = sorted.slice(0, topNRegions);
      const rest = sorted.slice(topNRegions);
      const restSum = rest.reduce((s, r) => s + (parseFloat(r[valueKey]) || 0), 0);
      const labels = top.map((r) => r.name);
      const values = top.map((r) => parseFloat(r[valueKey]) || 0);
      const colors = top.map(regionColor);
      if (rest.length > 0 && restSum > 0) {
        labels.push(`Other (${rest.length} regions)`);
        values.push(restSum);
        colors.push("rgb(200,200,200)");
      }
      return { labels, values, colors };
    };
    return (
      <>
        <Plot
          data={[{ ...processPieData("area_fraction"), type: "pie", textinfo: "label+percent", textposition: "outside", automargin: true }]}
          layout={{ title: { text: `Area Fraction — Top ${topNRegions} Regions`, automargin: true }, showlegend: true, legend: { orientation: "v", x: 1, y: 0.5 }, autosize: true, margin: { l: 20, r: 20, t: 60, b: 20 } }}
          style={{ width: "100%", height: "700px" }}
          useResizeHandler
          config={{ responsive: true }}
        />
        <Box sx={{ mt: 4 }}>
          <Plot
            data={[{ ...processPieData("object_count"), type: "pie", textinfo: "label+percent", textposition: "outside", automargin: true }]}
            layout={{ title: { text: `Object Count — Top ${topNRegions} Regions`, automargin: true }, showlegend: true, legend: { orientation: "v", x: 1, y: 0.5 }, autosize: true, margin: { l: 20, r: 20, t: 60, b: 20 } }}
            style={{ width: "100%", height: "700px" }}
            useResizeHandler
            config={{ responsive: true }}
          />
        </Box>
      </>
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
              <Box sx={{ display: "flex", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
                {[
                  { label: "Regions", value: summaryStats.regionCount, accent: "#1976d2" },
                  { label: "Total Objects", value: summaryStats.totalObjects.toLocaleString(), accent: "#2e7d32" },
                  {
                    label: "Top by Area",
                    value: summaryStats.topByArea?.name,
                    accent: regionColor(summaryStats.topByArea || {}),
                  },
                  {
                    label: "Most Objects",
                    value: summaryStats.topByCount?.name,
                    accent: regionColor(summaryStats.topByCount || {}),
                  },
                ].map(({ label, value, accent }) => (
                  <Paper
                    key={label}
                    elevation={0}
                    sx={{ px: 2, py: 1.5, border: "1px solid #e0e0e0", borderLeft: `4px solid ${accent}`, minWidth: 130, maxWidth: 260 }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</Typography>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Controls bar */}
            <Paper
              elevation={0}
              sx={{ p: 1.5, mb: 2, border: "1px solid #e0e0e0", display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}
            >
              <ToggleButtonGroup
                value={chartType}
                exclusive
                onChange={(_, val) => val && setChartType(val)}
                size="small"
              >
                <ToggleButton value="bar" aria-label="horizontal bar">
                  <BarChartIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">Bar</Typography>
                </ToggleButton>
                <ToggleButton value="scatter" aria-label="scatter">
                  <BubbleChart fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">Scatter</Typography>
                </ToggleButton>
                <ToggleButton value="treemap" aria-label="treemap">
                  <GridView fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">Map</Typography>
                </ToggleButton>
                <ToggleButton value="pie" aria-label="pie">
                  <DonutLarge fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">Pie</Typography>
                </ToggleButton>
              </ToggleButtonGroup>

              {chartType !== "pie" && (
                <>
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

              {chartType === "pie" && (
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Top Regions</InputLabel>
                  <Select value={topNRegions} label="Top Regions" onChange={(e) => setTopNRegions(e.target.value)}>
                    <MenuItem value={5}>Top 5</MenuItem>
                    <MenuItem value={10}>Top 10</MenuItem>
                    <MenuItem value={15}>Top 15</MenuItem>
                    <MenuItem value={20}>Top 20</MenuItem>
                    <MenuItem value={csvData.rows.length}>All ({csvData.rows.length})</MenuItem>
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
            <Paper elevation={0} sx={{ p: 3, border: "1px solid #e0e0e0", width: "100%", maxWidth: "100%", overflow: "hidden", boxSizing: "border-box" }}>
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
