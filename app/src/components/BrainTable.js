import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography, Button } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Add from '@mui/icons-material/Add';

const BrainTable = ({ selectedProject, rows, columns, onBackClick, onAddBrainClick, onBrainSelect }) => {
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
            <DataGrid
                sx={{ width: '100%', height: 'calc(100% - 40px)' }}
                rows={rows}
                columns={columns}
                initialState={{}}
                pageSizeOptions={10}
                disableColumnResize
                rowHeight={42}
                onRowClick={onBrainSelect}
                isRowSelectable={(params) => true}
            />
        </Box>
    );
};

export default BrainTable;
