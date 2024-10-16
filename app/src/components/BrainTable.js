import React from 'react';
import { Box, Typography, Button, List, ListItem, ListItemButton, ListItemText, IconButton } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Add from '@mui/icons-material/Add';

const BrainList = ({ rows, onBrainSelect }) => {
    const [selectedBrain, setSelectedBrain] = React.useState(null);

    const handleBrainSelect = (brain) => {
        setSelectedBrain(brain);
        onBrainSelect({ row: brain });
    };

    return (
        <List sx={{ width: '100%', bgcolor: 'background.paper', dense: true }}>
            {rows.map((brain) => (
                <ListItem
                    key={brain.id}
                    disablePadding
                >
                    <ListItemButton
                        selected={selectedBrain && selectedBrain.id === brain.id}
                        onClick={() => handleBrainSelect(brain)}
                    >
                        <ListItemText primary={brain.name} secondary='Mouse Brain' />
                    </ListItemButton>
                </ListItem>
            ))}
        </List>
    );
};

const BrainTable = ({ selectedProject, rows, onBackClick, onAddBrainClick, onBrainSelect }) => {
    return (
        <Box sx={{ flex: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        size="small"
                        color='inherit'
                        onClick={onBackClick}
                        sx={{ maxWidth: 180 }}
                        startIcon={<ArrowBack />}
                    >
                        Back to Projects
                    </Button>
                    <Button
                        size="small"
                        color='inherit'
                        sx={{ maxWidth: 180 }}
                        startIcon={<Add />}
                        onClick={onAddBrainClick}
                    >
                        Add Brain
                    </Button>
                </Box>
                <Typography variant="h6" color="black" gutterBottom>
                    {selectedProject.name}
                </Typography>
            </Box>
            <BrainList rows={rows} onBrainSelect={onBrainSelect} />
        </Box>
    );
};

export default BrainTable;
