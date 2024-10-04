import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography, Card, CardContent, CardActions, Button, Tooltip, IconButton, List, ListItem, ListItemText } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// Project handling
import { fetchCollab, fetchBucketDir, fetchBrainNums, fetchBrainStats } from '../actions/handleCollabs.js';
import ArrowBack from '@mui/icons-material/ArrowBack';

import CreationDialog from './CreationDialog.js';


export default function QuintTable() {
    // onMount
    const [bucketName, setBucketName] = React.useState(null);
    const [projects, setProjects] = React.useState([]);
    const [selectedProject, setSelectedProject] = React.useState(null);
    // For brain selection
    const [selectedBrain, setSelectedBrain] = React.useState(null);
    // for the quick action menu and stat displays
    const [selectedBrainStats, setSelectedBrainStats] = React.useState([]);

    const [rows, setRows] = React.useState([]);
    const [columns, setColumns] = React.useState([]);

    const [isDialogOpen, setIsDialogOpen] = React.useState(false);



    // onMount
    React.useEffect(() => {
        // fetch user name from local storage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const userName = userInfo.preferred_username;
        const collabName = `${userName}-rwb`

        setBucketName(collabName);

        if (projects.length === 0) {
            fetchBucketDir(collabName, null, '/')
                .then(projects => {
                    console.log(projects);
                    setProjects(projects);
                })
                .catch(error => {
                    console.error('Error fetching projects:', error);
                });
        }


    }, []);

    // To manage the project selection (after mount)
    const handleProjectSelect = (project) => {
        setSelectedProject(project);

        // Cleaning to disable any previous brain selection
        // after back to projects
        if (project === null) {
            setSelectedBrain(null);
            setRows([]);
            setColumns([]);
            return;
        }

        // Set rows based on subEntries (Brains)
        const newRows = project.subEntries.map((entry, index) => ({
            id: index,
            name: entry.name.split('/').pop(),
            type: entry.type,
            path: entry.path
        }));
        setRows(newRows);

        // Set columns for the DataGrid
        const newColumns = [
            { field: 'name', headerName: 'Name', flex: 1 },
            { field: 'type', headerName: 'Type', width: 120 },
            { field: 'path', headerName: 'Path', flex: 1 }
        ];
        setColumns(newColumns);
    };

    const handleBrainSelect = (params) => {
        // Fetch the brain data
        console.log('Params passed down', params);
        setSelectedBrain(params.row);
        console.log(`Selected brain: ${params.row.name}`);
        setSelectedBrainStats(fetchBrainStats(bucketName, params.row.path));
        console.log(`Selected brain stats: ${selectedBrainStats}`);
        // Keeping this for logging throughout

    }

    // Dialog functions
    const handleOpenDialog = () => setIsDialogOpen(true);
    const handleCloseDialog = () => setIsDialogOpen(false);


    return (
        <Box sx={{ backgroundColor: 'white', padding: '2%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '90%', borderRadius: '4px' }}>
            <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
                {selectedProject === null && (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6" align="left" gutterBottom>
                            Projects
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {projects.length === 0 ? (
                                <Typography>Getting projects...</Typography>
                            ) : (
                                projects.map((project, index) => (
                                    <Card key={index} elevation={1} sx={{ mb: 2, flexBasis: 'calc(33.333% - 16px)', minWidth: '250px', }}>
                                        <CardContent>
                                            <Typography sx={{ textAlign: 'left' }}>{project.name}</Typography>
                                            {project.type === 'directory' && (
                                                <>
                                                    <Typography variant="body2" sx={{ mt: 1, textAlign: 'left' }}>
                                                        Files: {project.subEntries.filter(entry => entry.type === 'file').length}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ textAlign: 'left' }}>
                                                        Folders: {project.subEntries.filter(entry => entry.type === 'directory').length}
                                                    </Typography>
                                                </>
                                            )}
                                        </CardContent>
                                        <CardActions sx={{ justifyContent: 'space-between' }}>
                                            <Tooltip title="Delete Project">
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        color: 'red',
                                                    }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Open project">
                                                <Button
                                                    size="small"
                                                    variant="text"
                                                    sx={{
                                                        color: 'black',
                                                    }}
                                                    onClick={() => handleProjectSelect(project)}
                                                >
                                                    Choose
                                                </Button>
                                            </Tooltip>
                                        </CardActions>
                                    </Card>
                                ))
                            )}

                        </Box>
                    </Box>
                )}
                <Box sx={{ flex: 3, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                    {selectedProject && (
                        <><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Button
                                size="small"
                                color='inherit'
                                onClick={() => setSelectedProject(null)}
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
                                onClick={handleOpenDialog}
                            >
                                Add Brain
                            </Button>
                            <Typography variant="h6" color="black" gutterBottom>
                                {selectedProject.name}
                            </Typography>
                        </Box>
                            <DataGrid
                                sx={{ width: '100%', height: 'calc(100% - 40px)' }}
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
                                disableColumnResize
                                rowHeight={42}
                                onRowClick={handleBrainSelect}
                                isRowSelectable={(params) => true}
                            />
                        </>
                    )}
                </Box>
                <CreationDialog
                    open={isDialogOpen}
                    onClose={handleCloseDialog}
                    project={selectedProject}
                />


                {selectedProject && (
                    <Box sx={{ flex: 1.5, overflow: 'auto' }}>
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
                    </Box>
                )}
            </Box> </Box>
    );
}
