import React, { useState } from "react";
import { useNotification } from "../contexts/NotificationContext";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Icon,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Add from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import FolderOffOutlinedIcon from "@mui/icons-material/FolderOffOutlined";
import mBrain from "../mBrain.ico";
import { deleteItem } from "../actions/handleCollabs.ts";

const BrainList = ({
  rows,
  onBrainSelect,
  token,
  bucketName,
  onDeleteComplete,
}) => {
  const { showSuccess, showError } = useNotification();

  // Current brain selection, changes on click for the list item
  const [selectedBrain, setSelectedBrain] = useState(null);
  // Delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brainToDelete, setBrainToDelete] = useState(null);
  const [confirmInput, setConfirmInput] = useState("");

  const handleBrainSelect = (brain) => {
    setSelectedBrain(brain);
    onBrainSelect({ row: brain });
  };

  const handleDeleteClick = (brain) => {
    setBrainToDelete(brain);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    const deletingPath = `${bucketName}/${brainToDelete.path}`;
    deleteItem(deletingPath, token)
      .then(() => {
        showSuccess("Series deleted.");
        setDeleteDialogOpen(false);
        setBrainToDelete(null);
        setTimeout(() => {
          onDeleteComplete();
        }, 1000);
      })
      .catch((error) => {
        showError("Failed to delete series.");
        setDeleteDialogOpen(false);
        setBrainToDelete(null);
      });
  };

  if (rows.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          flexDirection: "row",
        }}
      >
        <Icon
          component={FolderOffOutlinedIcon}
          sx={{ fontSize: 25, color: "gray", mr: 3 }}
        />
        <Typography variant="body2" color="gray" gutterBottom>
          No series were found, please add a series.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <List
        sx={{
          width: "100%",
          bgcolor: "background.paper",
          borderRadius: 1,
          border: "none",
        }}
        dense
      >
        {rows.map((brain) => (
          <ListItem
            key={brain.id}
            disablePadding
            selected={selectedBrain && selectedBrain.id === brain.id}
            sx={{
              "&:last-child": { borderBottom: "none" },
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <ListItemButton
              selected={selectedBrain && selectedBrain.id === brain.id}
              onClick={() => handleBrainSelect(brain)}
              sx={{ flex: 1, borderRadius: 2, m: 0.5 }}
            >
              <ListItemIcon>
                <img
                  src={mBrain}
                  alt="Brain Icon"
                  style={{ width: "1.75rem", height: "1.75rem" }}
                />
              </ListItemIcon>
              <ListItemText
                primary={brain.name}
                primaryTypographyProps={{
                  sx: {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
            </ListItemButton>

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
                handleDeleteClick(brain);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setConfirmInput("");
        }}
      >
        <DialogTitle>
          Deleting series <b>{brainToDelete?.name}</b>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action is irreversible! You will lose all progress made on this
            series.
            <br />
            Please type <b>{brainToDelete?.name}</b> to confirm deletion.
          </DialogContentText>
          <Box mt={2}>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`Type "${brainToDelete?.name}"`}
              style={{ width: "100%", padding: 8, fontSize: 16 }}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setConfirmInput("");
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => {
              handleDeleteConfirm();
              setConfirmInput("");
            }}
            disabled={confirmInput !== brainToDelete?.name}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const BrainTable = ({
  selectedProject,
  rows,
  onBackClick,
  onAddBrainClick,
  onBrainSelect,
  token,
  bucketName,
  refreshProjectBrains,
}) => {
  return (
    <Box
      sx={{
        flex: 1,
        maxWidth: "25%",
        display: "flex",
        flexDirection: "column",
        p: 2,
        backgroundColor: "white",
        borderRadius: 1,
        border: "1px solid #e0e0e0",
        alignContent: "flex-start",
      }}
    >
      <Typography
        color="black"
        gutterBottom
        sx={{ mb: 2, fontSize: "1.2rem", fontWeight: 600, textAlign: "left" }}
      >
        {selectedProject.name}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            size="small"
            onClick={onBackClick}
            sx={{ maxWidth: 180 }}
            startIcon={<ArrowBack />}
          >
            to Projects
          </Button>
          <Button
            size="small"
            sx={{ maxWidth: 180 }}
            startIcon={<Add />}
            onClick={onAddBrainClick}
          >
            Add/Edit Series
          </Button>
        </Box>
      </Box>
      <BrainList
        rows={rows}
        onBrainSelect={onBrainSelect}
        token={token}
        bucketName={bucketName}
        onDeleteComplete={refreshProjectBrains}
      />
    </Box>
  );
};

export default BrainTable;
