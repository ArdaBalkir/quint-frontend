import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  Chip,
  CircularProgress,
  InputAdornment,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";

const KG_SEARCH_URL = "https://createzoom.apps.ebrains.eu/api/kg/search";
const KG_DOC_URL = "https://createzoom.apps.ebrains.eu/api/kg/document";
const PAGE_SIZE = 20;
const SEARCH_BODY = {
  accessibility: { size: 10 },
  services: { size: 1e9 },
  species: { size: 1e9 },
  experimentalApproach: { size: 1e9 },
  studiedBrainRegion: { size: 1e9 },
  techniques: { size: 1e9 },
  keywords: { size: 1e9 },
  contentTypes: { size: 1e9 },
};

function AccessChip({ value }) {
  const color =
    value === "free access"
      ? "success"
      : value === "controlled access"
        ? "warning"
        : "default";
  return (
    <Chip
      label={value}
      color={color}
      size="small"
      sx={{ fontSize: "0.65rem", height: 20 }}
    />
  );
}

function BadgeChip({ badge }) {
  const labels = {
    isTrending: "Trending",
    isNew: "New",
    hasInDepthMetaData: "Detailed",
    isLinkedToImageViewer: "Image Viewer",
  };
  return (
    <Chip
      label={labels[badge] ?? badge}
      size="small"
      variant="outlined"
      sx={{ fontSize: "0.65rem", height: 20 }}
    />
  );
}

const DATA_PROXY_BASE = "https://data-proxy.ebrains.eu/api/v1/buckets/";

function getViewDataItems(detail) {
  const vd = detail?.viewData ?? detail?.fields?.viewData;
  if (!vd || typeof vd !== "object") return [];
  return Object.entries(vd)
    .filter(([, val]) => (Array.isArray(val) ? val.length > 0 : !!val))
    .flatMap(([viewer, val]) =>
      (Array.isArray(val) ? val : [val]).map((item) => ({ viewer, ...item })),
    );
}

/** Extract bucket + objectPath from a viewer URL whose dziproot param points at data-proxy. */
function parseDzipRoot(item) {
  const rawUrl = item.url ?? item.value ?? "";
  let dziproot = rawUrl;
  try {
    const u = new URL(rawUrl);
    const dz = u.searchParams.get("dziproot");
    if (dz) dziproot = dz;
  } catch (_) {}
  if (!dziproot.startsWith(DATA_PROXY_BASE)) return null;
  const parts = dziproot
    .slice(DATA_PROXY_BASE.length)
    .replace(/\/$/, "")
    .split("/");
  if (parts.length < 2) return null;
  const bucket = parts[0];
  const objectPath = parts.slice(1).join("/");
  const label = parts[parts.length - 1];
  return { bucket, objectPath, label };
}

function getDataEntries(viewDataItems) {
  const seen = new Set();
  const entries = [];
  for (const item of viewDataItems) {
    const parsed = parseDzipRoot(item);
    if (!parsed) continue;
    const key = `${parsed.bucket}/${parsed.objectPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(parsed);
  }
  return entries;
}

const ITEM_SX = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  border: "1px solid #e0e0e0",
  borderRadius: 1,
  mb: 1,
  p: 1.5,
  cursor: "pointer",
  transition: "all 0.15s ease",
  "&:hover": {
    backgroundColor: "#f5f5f5",
    borderColor: "#bdbdbd",
    transform: "translateX(2px)",
  },
};

export default function KgDatasetDialog({
  open,
  onClose,
  onSelectViewData,
  token,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [datasets, setDatasets] = useState([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [from, setFrom] = useState(0);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [datasetDetail, setDatasetDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const abortRef = useRef(null);
  const authHeaders = (extra) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  });

  const fetchDatasets = useCallback(
    async (q, fromIdx, replace) => {
      abortRef.current?.abort();
      const ctrl = (abortRef.current = new AbortController());
      fromIdx === 0 ? setLoadingList(true) : setLoadingMore(true);
      try {
        const params = new URLSearchParams({
          type: "Dataset",
          from: fromIdx,
          size: PAGE_SIZE,
        });
        if (q.trim()) params.set("q", q.trim());
        const resp = await fetch(`${KG_SEARCH_URL}?${params}`, {
          method: "POST",
          signal: ctrl.signal,
          headers: authHeaders(),
          body: JSON.stringify(SEARCH_BODY),
        });
        if (!resp.ok) throw new Error("KG search failed");
        const data = await resp.json();
        const hits = Array.isArray(data.hits) ? data.hits : [];
        const total = data.total ?? data.totalHits ?? null;
        setTotalHits(total ?? fromIdx + hits.length);
        setDatasets((prev) => (replace ? hits : [...prev, ...hits]));
        setFrom(fromIdx + hits.length);
      } catch (err) {
        if (err.name !== "AbortError") console.error("KG search error", err);
      } finally {
        setLoadingList(false);
        setLoadingMore(false);
      }
    },
    [token],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    setDatasets([]);
    setFrom(0);
    setTotalHits(0);
    setSelectedDataset(null);
    setDatasetDetail(null);
    fetchDatasets("", 0, true);
    return () => abortRef.current?.abort();
  }, [open, token, fetchDatasets]);

  const handleSearch = (e) => {
    e.preventDefault();
    setDatasets([]);
    setFrom(0);
    fetchDatasets(searchQuery, 0, true);
  };

  const handleSelectDataset = async (dataset) => {
    setSelectedDataset(dataset);
    setLoadingDetail(true);
    setDatasetDetail(null);
    try {
      const resp = await fetch(`${KG_DOC_URL}/${dataset.id}`, {
        headers: authHeaders(),
      });
      if (!resp.ok) throw new Error("Failed to load dataset details");
      setDatasetDetail(await resp.json());
    } catch (err) {
      console.error("KG detail error", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const viewDataItems = datasetDetail ? getViewDataItems(datasetDetail) : [];
  const dataEntries = getDataEntries(viewDataItems);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: "80vh", display: "flex", flexDirection: "column" },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1.5,
          px: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {selectedDataset && (
            <IconButton
              size="small"
              onClick={() => {
                setSelectedDataset(null);
                setDatasetDetail(null);
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Typography variant="h6" fontSize="1rem" fontWeight={600}>
            {selectedDataset
              ? selectedDataset.title
              : "Import from EBRAINS Knowledge Graph"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent
        sx={{ p: 0, flex: 1, overflow: "hidden", display: "flex" }}
      >
        {!selectedDataset ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
            }}
          >
            <Box sx={{ p: 2, pb: 1, borderBottom: "1px solid #e0e0e0" }}>
              <form onSubmit={handleSearch}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search EBRAINS datasets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton type="submit" size="small">
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </form>
              {totalHits > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  {totalHits.toLocaleString()} datasets found
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
              {loadingList ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <>
                  <List disablePadding>
                    {datasets.map((ds) => (
                      <ListItem
                        key={ds.id}
                        onClick={() => handleSelectDataset(ds)}
                        sx={ITEM_SX}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            mb: 0.5,
                            flexWrap: "wrap",
                          }}
                        >
                          {ds.fields?.dataAccessibility?.value && (
                            <AccessChip
                              value={ds.fields.dataAccessibility.value}
                            />
                          )}
                          {ds.badges?.map((b) => (
                            <BadgeChip key={b} badge={b} />
                          ))}
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ mb: 0.25 }}
                        >
                          {ds.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ds.fields?.releasedAt?.value &&
                            `Released ${ds.fields.releasedAt.value}`}
                          {ds.fields?.custodians?.[0]?.value &&
                            ` · ${ds.fields.custodians[0].value}`}
                        </Typography>
                        {ds.tags?.data?.length > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.5,
                              mt: 0.75,
                              flexWrap: "wrap",
                            }}
                          >
                            {ds.tags.data.slice(0, 4).map((tag, i) => (
                              <Chip
                                key={i}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.6rem", height: 18 }}
                              />
                            ))}
                            {ds.tags.total > 4 && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ lineHeight: "18px" }}
                              >
                                +{ds.tags.total - 4} more
                              </Typography>
                            )}
                          </Box>
                        )}
                      </ListItem>
                    ))}
                  </List>
                  {from < totalHits && (
                    <Box sx={{ textAlign: "center", py: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => fetchDatasets(searchQuery, from, false)}
                        disabled={loadingMore}
                        startIcon={
                          loadingMore ? (
                            <CircularProgress size={14} />
                          ) : undefined
                        }
                        sx={{ textTransform: "none" }}
                      >
                        {loadingMore
                          ? "Loading..."
                          : `Load more (${(totalHits - from).toLocaleString()} remaining)`}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 2.5,
                borderRight: "1px solid #e0e0e0",
              }}
            >
              {loadingDetail ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : datasetDetail ? (
                <>
                  <Box
                    sx={{ display: "flex", gap: 0.75, mb: 1, flexWrap: "wrap" }}
                  >
                    {datasetDetail.fields?.dataAccessibility?.value && (
                      <AccessChip
                        value={datasetDetail.fields.dataAccessibility.value}
                      />
                    )}
                    {datasetDetail.badges?.map((b) => (
                      <BadgeChip key={b} badge={b} />
                    ))}
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Released: {datasetDetail.fields?.releasedAt?.value ?? "N/A"}
                  </Typography>
                  {datasetDetail.fields?.custodians?.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 1.5 }}
                    >
                      Custodians:{" "}
                      {datasetDetail.fields.custodians
                        .map((c) => c.value)
                        .join(", ")}
                    </Typography>
                  )}
                  {datasetDetail.fields?.description?.value && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 1.5, lineHeight: 1.65 }}
                    >
                      {datasetDetail.fields.description.value}
                    </Typography>
                  )}
                  {datasetDetail.fields?.keywords?.length > 0 && (
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                      }}
                    >
                      {datasetDetail.fields.keywords.map((k, i) => (
                        <Chip
                          key={i}
                          label={k.value ?? k}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <Typography color="error">
                  Failed to load dataset details.
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                width: "36%",
                overflowY: "auto",
                p: 2,
                backgroundColor: "#fafafa",
                flexShrink: 0,
              }}
            >
              {!loadingDetail && (
                <>
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    sx={{
                      color: "text.secondary",
                      textTransform: "uppercase",
                      fontSize: "0.68rem",
                      letterSpacing: 0.8,
                      mb: 1.5,
                    }}
                  >
                    Available Data{" "}
                    {dataEntries.length > 0 && `(${dataEntries.length})`}
                  </Typography>
                  {dataEntries.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        No importable data found for this dataset.
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {dataEntries.map((entry, i) => (
                        <ListItem
                          key={i}
                          onClick={() => onSelectViewData(datasetDetail, entry)}
                          sx={{
                            ...ITEM_SX,
                            "&:hover": {
                              backgroundColor: "#f0fff4",
                              borderColor: "#07a644",
                              transform: "translateX(2px)",
                            },
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {entry.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ wordBreak: "break-all" }}
                          >
                            {entry.objectPath}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
