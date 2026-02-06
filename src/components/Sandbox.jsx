import logger from "../utils/logger.js";
import { useState, useEffect } from "react";
import {
  Box,
  CircularProgress,
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
} from "@mui/material";
import { BarChart } from "@mui/icons-material";
import Plot from "react-plotly.js";
import Papa from "papaparse";
import { fetchPyNutilResults } from "../actions/handleCollabs";
import { getBrainStats } from "../actions/brainRepository.ts";

const Sandbox = ({ token, user }) => {
  // state for nutil results list
  const [nutilResults, setNutilResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedBrain, setSelectedBrain] = useState(null);
  const [brainEntries, setBrainEntries] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [chartType, setChartType] = useState("bar"); // 'bar' or 'pie'
  const [topNRegions, setTopNRegions] = useState(10); // Number of top regions to show in pie chart

  // csv data state
  const [csvData, setCsvData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Process data for pie chart - show top N regions, group rest into "Other"
   */
  const processPieChartData = (rows, valueKey, topN = 10) => {
    // Sort rows by value descending
    const sortedRows = [...rows].sort(
      (a, b) => (parseFloat(b[valueKey]) || 0) - (parseFloat(a[valueKey]) || 0)
    );

    // Take top N
    const topRows = sortedRows.slice(0, topN);
    const restRows = sortedRows.slice(topN);

    // Calculate sum of rest
    const restSum = restRows.reduce(
      (sum, row) => sum + (parseFloat(row[valueKey]) || 0),
      0
    );

    // Prepare data
    const labels = topRows.map((row) => row["name"]);
    const values = topRows.map((row) => parseFloat(row[valueKey]) || 0);
    const colors = topRows.map(
      (row) =>
        `rgb(${Math.round(row["r"] || 0)},${Math.round(
          row["g"] || 0
        )},${Math.round(row["b"] || 0)})`
    );

    // Add "Other" if there are rest rows
    if (restRows.length > 0 && restSum > 0) {
      labels.push(`Other (${restRows.length} regions)`);
      values.push(restSum);
      colors.push("rgb(200, 200, 200)"); // Gray color for "Other"
    }

    return { labels, values, colors };
  };

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
      try {
        const bucketName = localStorage.getItem("bucketName");
        if (!bucketName || !token) return;

        const brains = await getBrainStats(token, bucketName);
        setBrainEntries(brains || []);

        // auto-select first brain if none selected
        if (brains && brains.length > 0 && !selectedBrain) {
          setSelectedBrain(brains[0]);
        }
      } catch (err) {
        logger.error("Failed to fetch brain entries", err);
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

        const response = await fetchPyNutilResults(
          token,
          bucketName,
          resultsPath
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

  return (
    <Box
      sx={{
        display: "flex",
        height: "calc(100vh - 42px)",
        backgroundColor: "#f5f5f5",
      }}
    >
      {/* Left sidebar - Results list */}
      <Box
        sx={{
          width: 320,
          borderRight: "1px solid #e0e0e0",
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{ p: 2, borderBottom: "1px solid #e0e0e0", textAlign: "left" }}
        >
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            Quantification Results
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {projectName || "No project selected"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedBrain ? selectedBrain.name : "No brain selected"}
          </Typography>
        </Box>

        {/* Brain selector */}
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Select Brain</InputLabel>
            <Select
              value={selectedBrain?.name || ""}
              label="Select Brain"
              onChange={(e) => {
                const brain = brainEntries.find(
                  (b) => b.name === e.target.value
                );
                setSelectedBrain(brain);
                setSelectedResult(null);
                setCsvData(null);
              }}
            >
              {Array.isArray(brainEntries) &&
                brainEntries.map((brain) => (
                  <MenuItem key={brain.name} value={brain.name}>
                    {brain.name}
                  </MenuItem>
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
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "primary.light",
                    "&:hover": {
                      backgroundColor: "primary.light",
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <BarChart />
                </ListItemIcon>
                <ListItemText
                  primary={formatResultName(result.name)}
                  primaryTypographyProps={{
                    variant: "body2",
                    sx: { fontSize: "0.875rem" },
                  }}
                />
              </ListItem>
            ))
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No results available
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Run quantification in WebNutil to see results here
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, p: 3, overflow: "auto" }}>
        {isLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Typography color="error" variant="body2">
              Error: {error}
            </Typography>
          </Box>
        )}

        {!isLoading && !error && !csvData && !selectedResult && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              border: "2px dashed #ccc",
              borderRadius: 2,
            }}
          >
            <BarChart sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Select a quantification result
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click on a result from the left to view and analyze the data
            </Typography>
          </Box>
        )}

        {!isLoading && !error && csvData && (
          <Box>
            <Paper elevation={0} sx={{ p: 3, border: "1px solid #e0e0e0" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                    {selectedResult
                      ? formatResultName(selectedResult.name)
                      : "Quantification Data"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {csvData.rows.length} regions analyzed
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Chart Type</InputLabel>
                    <Select
                      value={chartType}
                      label="Chart Type"
                      onChange={(e) => setChartType(e.target.value)}
                    >
                      <MenuItem value="bar">Bar Chart</MenuItem>
                      <MenuItem value="pie">Pie Chart</MenuItem>
                    </Select>
                  </FormControl>
                  {chartType === "pie" && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Top Regions</InputLabel>
                      <Select
                        value={topNRegions}
                        label="Top Regions"
                        onChange={(e) => setTopNRegions(e.target.value)}
                      >
                        <MenuItem value={5}>Top 5</MenuItem>
                        <MenuItem value={10}>Top 10</MenuItem>
                        <MenuItem value={15}>Top 15</MenuItem>
                        <MenuItem value={20}>Top 20</MenuItem>
                        <MenuItem value={csvData.rows.length}>
                          All ({csvData.rows.length})
                        </MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Box>
              </Box>
              {csvData.headers.includes("name") &&
                csvData.headers.includes("object_count") &&
                csvData.headers.includes("area_fraction") &&
                csvData.headers.includes("r") &&
                csvData.headers.includes("g") &&
                csvData.headers.includes("b") &&
                Array.isArray(csvData.rows) &&
                csvData.rows.length > 0 && (
                  <>
                    {chartType === "bar" ? (
                      <>
                        <Plot
                          data={[
                            {
                              x: csvData.rows.map((row) => row["name"]),
                              y: csvData.rows.map(
                                (row) => parseFloat(row["area_fraction"]) || 0
                              ),
                              type: "bar",
                              name: "Area Fraction",
                              marker: {
                                color: csvData.rows.map(
                                  (row) =>
                                    `rgb(${Math.round(
                                      row["r"] || 0
                                    )},${Math.round(
                                      row["g"] || 0
                                    )},${Math.round(row["b"] || 0)})`
                                ),
                              },
                            },
                          ]}
                          layout={{
                            title: {
                              text: "Area Fraction by Region",
                              automargin: true,
                            },
                            xaxis: {
                              tickangle: -45,
                              automargin: true,
                            },
                            yaxis: { automargin: true },
                            showlegend: false,
                          }}
                          style={{ width: "100%", height: "900px" }}
                          config={{ responsive: true }}
                        />
                        <Box sx={{ mt: 4 }}>
                          <Plot
                            data={[
                              {
                                x: csvData.rows.map((row) => row["name"]),
                                y: csvData.rows.map(
                                  (row) => parseFloat(row["object_count"]) || 0
                                ),
                                type: "bar",
                                name: "Object Count",
                                marker: {
                                  color: csvData.rows.map(
                                    (row) =>
                                      `rgb(${Math.round(
                                        row["r"] || 0
                                      )},${Math.round(
                                        row["g"] || 0
                                      )},${Math.round(row["b"] || 0)})`
                                  ),
                                },
                              },
                            ]}
                            layout={{
                              title: {
                                text: "Object Count by Region",
                                automargin: true,
                              },
                              xaxis: {
                                tickangle: -45,
                                automargin: true,
                              },
                              yaxis: { automargin: true },
                              showlegend: false,
                            }}
                            style={{ width: "100%", height: "700px" }}
                            config={{ responsive: true }}
                          />
                        </Box>
                      </>
                    ) : (
                      <>
                        <Plot
                          data={[
                            {
                              ...processPieChartData(
                                csvData.rows,
                                "area_fraction",
                                topNRegions
                              ),
                              type: "pie",
                              textinfo: "label+percent",
                              textposition: "outside",
                              automargin: true,
                            },
                          ]}
                          layout={{
                            title: {
                              text: `Area Fraction Distribution (Top ${topNRegions} Regions)`,
                              automargin: true,
                            },
                            showlegend: true,
                            legend: { orientation: "v", x: 1, y: 0.5 },
                          }}
                          style={{ width: "100%", height: "700px" }}
                          config={{ responsive: true }}
                        />
                        <Box sx={{ mt: 4 }}>
                          <Plot
                            data={[
                              {
                                ...processPieChartData(
                                  csvData.rows,
                                  "object_count",
                                  topNRegions
                                ),
                                type: "pie",
                                textinfo: "label+percent",
                                textposition: "outside",
                                automargin: true,
                              },
                            ]}
                            layout={{
                              title: {
                                text: `Object Count Distribution (Top ${topNRegions} Regions)`,
                                automargin: true,
                              },
                              showlegend: true,
                              legend: { orientation: "v", x: 1, y: 0.5 },
                            }}
                            style={{ width: "100%", height: "700px" }}
                            config={{ responsive: true }}
                          />
                        </Box>
                      </>
                    )}
                  </>
                )}
              {(!csvData.headers.includes("name") ||
                !csvData.headers.includes("object_count") ||
                !csvData.headers.includes("area_fraction") ||
                !csvData.headers.includes("r") ||
                !csvData.headers.includes("g") ||
                !csvData.headers.includes("b") ||
                !Array.isArray(csvData.rows) ||
                csvData.rows.length === 0) && (
                <Typography variant="body2" color="text.secondary">
                  {!Array.isArray(csvData.rows) || csvData.rows.length === 0
                    ? "No data rows found in CSV file"
                    : 'Required columns "name", "object_count", "area_fraction", "r", "g", "b" not found in CSV data'}
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Sandbox;
