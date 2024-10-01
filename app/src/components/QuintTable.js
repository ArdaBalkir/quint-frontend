import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import axios from 'axios';

export default function QuintTable() {
    const [projects, setProjects] = React.useState([]);
    const [selectedProject, setSelectedProject] = React.useState(null);
    const [rows, setRows] = React.useState([]);
    const [columns, setColumns] = React.useState([]);

    React.useEffect(() => {
        // bucket get and look for dirs
        axios.get('/api/projects')
            .then(response => setProjects(response.data))
            .catch(error => console.error('Error fetching projects:', error));
    }, []);

    const handleProjectClick = (project) => {
        setSelectedProject(project);
        // Fetch project metadata
        axios.get(`/api/${project.name}/metadata`)
            .then(response => {
                const data = response.data;
                setRows(data.rows);
                setColumns(data.columns);
            })
            .catch(error => console.error('Error fetching project metadata:', error));
    };

    return (
        <Box sx={{ backgroundColor: 'white', padding: '2%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '90%', borderRadius: '4px' }}>
            <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <Typography variant="h6" color="black" gutterBottom>
                        Projects
                    </Typography>
                    <List>
                        {projects.map(project => (
                            <ListItem key={project.id} button onClick={() => handleProjectClick(project)}>
                                <ListItemText primary={project.name} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
                <Box sx={{ flex: 3, overflow: 'auto' }}>
                    {selectedProject && (
                        <DataGrid
                            sx={{ width: '100%', height: '100%' }}
                            rows={rows}
                            columns={columns}
                            initialState={{
                                pagination: {
                                    paginationModel: {
                                        pageSize: 5,
                                    },
                                },
                            }}
                            pageSizeOptions={[5]}
                            checkboxSelection
                            disableRowSelectionOnClick
                            disableColumnResize
                            rowHeight={42}
                        />
                    )}
                </Box>
                {/*
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <Typography variant="h6" color="black" gutterBottom>
                        Additional Information
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemText primary="Total Entries" secondary={rows.length} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Last Updated" secondary={new Date().toLocaleDateString()} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Data Source" secondary="Game of Thrones API" />
                        </ListItem>
                    </List>
                </Box>*/}
            </Box>
        </Box>
    );
}
