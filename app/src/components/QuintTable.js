import * as React from 'react';
import { Box, Typography, Card, CardContent, CardActions, Button, Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// Project handling
import { fetchBucketDir, fetchBrainStats } from '../actions/handleCollabs.js';
import CreationDialog from './CreationDialog.js';
import BrainTable from './BrainTable.js';
import AdditionalInfo from './QuickActions.js';

export default function QuintTable() {
    // onMount
    const [bucketName, setBucketName] = React.useState(null);
    const [projects, setProjects] = React.useState([]);
    const [selectedProject, setSelectedProject] = React.useState(null);
    // For brain selection
    const [selectedBrain, setSelectedBrain] = React.useState(null);
    // for the quick action menu and stat displays
    const [selectedBrainStats, setSelectedBrainStats] = React.useState([]);
    const [updateTrigger, setUpdateTrigger] = React.useState(0);


    const [rows, setRows] = React.useState([]);
    const [columns, setColumns] = React.useState([]);

    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const [processes, setProcesses] = React.useState([]);

    // There is a problem with the update trigger but otherwise go back and forth works fine for pyramiding and the rest
    const fetchAndUpdateProjects = (collabName) => {
        fetchBucketDir(collabName, null, '/')
            .then(projects => {
                console.log(projects);
                setProjects(projects);
                setUpdateTrigger(prev => prev + 1);
            })
            .catch(error => {
                console.error('Error fetching projects:', error);
            });
    };


    // onMount
    React.useEffect(() => {
        // fetch user name from local storage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const userName = userInfo.username;
        const collabName = `${userName}-rwb`

        setBucketName(collabName);


        if (projects.length === 0) {
            if (projects.length === 0) {
                fetchAndUpdateProjects(collabName);
            }
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

        const newColumns = [
            { field: 'name', headerName: 'Name', flex: 1 },
            { field: 'type', headerName: 'Type', width: 120 },
            { field: 'path', headerName: 'Path', flex: 1 }
        ];
        setColumns(newColumns);
    };

    const handleBrainSelect = (params) => {
        console.log('Params passed down', params);
        setSelectedBrain(params.row);
        console.log(`Selected brain: ${params.row.name}`);
        // setSelectedBrainStats(fetchBrainStats(bucketName, params.row.path));
        console.log(`Selected brain stats: ${selectedBrainStats}`);
        // Keeping this for logging throughout

    }

    // Dialog functions
    const handleOpenDialog = () => setIsDialogOpen(true);
    const handleCloseDialog = () => setIsDialogOpen(false);


    return (
        <Box sx={{ backgroundColor: 'white', padding: '2%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '90%', borderRadius: '4px' }}>
            <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
                {selectedProject === null ? (
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
                ) : (
                    <>
                        <BrainTable
                            selectedProject={selectedProject}
                            rows={rows}
                            columns={columns}
                            onBackClick={() => setSelectedProject(null)}
                            onAddBrainClick={handleOpenDialog}
                            onBrainSelect={handleBrainSelect}
                        />
                        <AdditionalInfo
                            rows={rows}
                        />
                    </>
                )}
            </Box>
            <CreationDialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                project={selectedProject}
                updateProjects={fetchAndUpdateProjects}
            />
        </Box>
    );
}