import * as React from 'react';
import { Box, Typography, Button, Tooltip, IconButton, CircularProgress, List, ListItem, ListItemText, ListItemButton, } from '@mui/material';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';

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

    // for the brain table
    const [rows, setRows] = React.useState([]);
    const [processes, setProcesses] = React.useState([]);


    const [isDialogOpen, setIsDialogOpen] = React.useState(false);



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

    };

    const handleBrainSelect = async (params) => {
        console.log('Params passed down', params);
        setSelectedBrain(params.row);
        console.log(`Selected brain: ${params.row.name}`);
        const stats = await fetchBrainStats(bucketName, params.row.path);
        setSelectedBrainStats(stats);
        console.log(`Selected brain stats:`, stats);
        // Keeping this for logging throughout

    }

    // Dialog functions
    const handleOpenDialog = () => setIsDialogOpen(true);
    const handleCloseDialog = () => setIsDialogOpen(false);


    return (
        <Box sx={{ backgroundColor: '#f9f9f9', padding: '2%', display: 'flex', flexDirection: 'row', alignItems: 'stretch', height: '90%', borderRadius: '4px' }}>
            <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
                {selectedProject === null ? (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', gap: 2 }}>
                        <Box sx={{ flexDirection: 'column', flexGrow: 1, }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                                <Typography variant="h6" align="left" gutterBottom>
                                    Projects
                                </Typography>
                                <IconButton sx={{ alignSelf: 'flex-start' }}>
                                    <AddIcon />
                                </IconButton>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                {projects.length === 0 ? (
                                    <>
                                        <CircularProgress size={15} />
                                        <Typography>getting projects...</Typography>
                                    </>
                                ) : (
                                    <List sx={{ width: '100%', }}>
                                        {projects.map((project, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    borderRadius: '4px',
                                                    mb: 1,
                                                    '&:hover': {
                                                        backgroundColor: '#f9f9f9',
                                                    },
                                                }}
                                            >
                                                <ListItemText primary={project.name} />

                                                <IconButton onClick={() => handleProjectSelect(project)}>
                                                    <ArrowForwardIcon />
                                                </IconButton>

                                                <IconButton onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`https://data-proxy.ebrains.eu/${bucketName}`, '_blank');
                                                }}>
                                                    <FolderRoundedIcon />
                                                </IconButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Box>
                        </Box>
                        <Box
                            component="iframe"
                            src="https://quint-webtools.readthedocs.io/en/latest/"
                            sx={{ display: 'flex', flexGrow: 1.5, borderRadius: 1 }}>
                        </Box>
                    </Box>
                ) : (
                    <>
                        <BrainTable
                            selectedProject={selectedProject}
                            rows={rows}
                            onBackClick={() => setSelectedProject(null)}
                            onAddBrainClick={handleOpenDialog}
                            onBrainSelect={handleBrainSelect}
                        />
                        <AdditionalInfo
                            braininfo={selectedBrain}
                            stats={selectedBrainStats}
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