import * as React from 'react';
import { Box, Typography, Button, Tooltip, IconButton, CircularProgress, List, ListItem, ListItemText, ListItemButton } from '@mui/material';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';

// Project handling
import { fetchBucketDir, fetchBrainStats } from '../actions/handleCollabs.js';
import CreationDialog from './CreationDialog.js';
import BrainTable from './BrainTable.js';
import AdditionalInfo from './QuickActions.js';

export default function QuintTable({ token }) {
    const [bucketName, setBucketName] = React.useState(null);
    const [projects, setProjects] = React.useState([]);
    const [selectedProject, setSelectedProject] = React.useState(null);
    const [selectedBrain, setSelectedBrain] = React.useState(null);
    const [selectedBrainStats, setSelectedBrainStats] = React.useState([]);
    const [updateTrigger, setUpdateTrigger] = React.useState(0);
    const [rows, setRows] = React.useState([]);
    const [processes, setProcesses] = React.useState([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isFetchingStats, setIsFetchingStats] = React.useState(false);

    const fetchAndUpdateProjects = (collabName) => {
        fetchBucketDir(token, collabName, null, '/')
            .then(projects => {
                console.log(projects);
                setProjects(projects);
                setUpdateTrigger(prev => prev + 1);
            })
            .catch(error => {
                console.error('Error fetching projects:', error);
            });
    };

    React.useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const userName = userInfo.username;
        const collabName = `${userName}-rwb`

        setBucketName(collabName);

        if (projects.length === 0 && bucketName) {
            fetchAndUpdateProjects(bucketName);
        }
    }, [bucketName, projects, token]);

    const handleProjectSelect = (project) => {
        setSelectedProject(project);

        if (project === null) {
            setSelectedBrain(null);
            setRows([]);
            return;
        }

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
        setIsFetchingStats(true);
        console.log(`Selected brain: ${params.row.name}`);
        try {
            const stats = await fetchBrainStats(token, bucketName, params.row.path);
            setSelectedBrainStats(stats);
            console.log(`Selected brain stats:`, stats);
        } catch (error) {
            console.error('Error fetching brain stats:', error);
        } finally {
            setIsFetchingStats(false);
        }
    }

    const handleOpenDialog = () => setIsDialogOpen(true);
    const handleCloseDialog = () => setIsDialogOpen(false);

    return (
        <Box sx={{ backgroundColor: '#f9f9f9', padding: '2%', display: 'flex', flexDirection: 'row', alignItems: 'stretch', height: '90%', borderRadius: '4px', gap: 2 }}>
            <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
                {selectedProject === null ? (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', gap: 2 }}>
                        <Box sx={{
                            flexDirection: 'column',
                            flexGrow: 1,
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: 2,
                            backgroundColor: 'white'
                        }}>
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 2,
                                justifyContent: 'space-between',
                                borderBottom: '1px solid #e0e0e0',
                                pb: 2,
                                mb: 2
                            }}>
                                <Typography variant="h6" align="left">
                                    Projects
                                </Typography>
                                <Box>
                                    <IconButton sx={{ alignSelf: 'flex-start' }}>
                                        <AddIcon />
                                    </IconButton>
                                    <IconButton onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://data-proxy.ebrains.eu/${bucketName}`, '_blank');
                                    }}>
                                        <FolderRoundedIcon />
                                    </IconButton>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                {projects.length === 0 ? (
                                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '100%', py: 4 }}>
                                        <CircularProgress size={20} />
                                        <Typography>Getting projects...</Typography>
                                    </Box>
                                ) : (
                                    <List sx={{
                                        width: '100%',
                                        '& .MuiListItem-root': {
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '4px',
                                            mb: 1,
                                            backgroundColor: 'white',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                backgroundColor: '#f5f5f5',
                                                transform: 'translateX(4px)'
                                            }
                                        }
                                    }}>
                                        {projects.map((project, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    px: 2,
                                                    py: 1
                                                }}
                                            >
                                                <ListItemText
                                                    primary={project.name}
                                                    sx={{
                                                        '& .MuiListItemText-primary': {
                                                            fontWeight: 500
                                                        }
                                                    }}
                                                />
                                                <IconButton
                                                    onClick={() => handleProjectSelect(project)}
                                                    sx={{
                                                        '&:hover': {
                                                            backgroundColor: '#e3f2fd'
                                                        }
                                                    }}
                                                >
                                                    <ArrowForwardIcon />
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
                            sx={{
                                display: 'flex',
                                flexGrow: 1.5,
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0'
                            }}>
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
                        <Box sx={{ width: '400px', flexShrink: 0, ml: 2 }}>
                            <AdditionalInfo
                                braininfo={selectedBrain}
                                stats={selectedBrainStats}
                                isLoading={isFetchingStats}
                            />
                        </Box>
                    </>
                )}
            </Box>

            <CreationDialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                project={selectedProject}
                updateProjects={fetchAndUpdateProjects}
                token={token}
            />
        </Box>
    );
}