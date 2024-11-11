import React from 'react';
import { Box, Typography, Button, List, ListItem, ListItemButton, ListItemText, IconButton, ListItemIcon } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Add from '@mui/icons-material/Add';
import mBrain from '../mBrain.ico'

const BrainList = ({ rows, onBrainSelect }) => {
    const [selectedBrain, setSelectedBrain] = React.useState(null);

    // Choose brains to fetch stats for upon click
    const handleBrainSelect = (brain) => {
        setSelectedBrain(brain);
        onBrainSelect({ row: brain });
    };

    return (
        <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }} dense>
            {rows.map((brain) => (
                <ListItem
                    key={brain.id}
                    disablePadding
                    sx={{
                        borderBottom: '1px solid #e0e0e0',
                        '&:last-child': { borderBottom: 'none' }
                    }}
                >
                    <ListItemButton
                        selected={selectedBrain && selectedBrain.id === brain.id}
                        onClick={() => handleBrainSelect(brain)}
                    >
                        <ListItemIcon>
                            <img src={mBrain} alt="Brain Icon" style={{ width: '28px', height: '28px' }} />
                        </ListItemIcon>
                        <ListItemText primary={brain.name} secondary='Mouse Brain' />
                    </ListItemButton>
                </ListItem>
            ))}
        </List>
    );
};

const BrainTable = ({ selectedProject, rows, onBackClick, onAddBrainClick, onBrainSelect }) => {
    return (
        <Box sx={{ flex: 2, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
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
