import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import ProcessCard from './ProcessCard';

const processes = [{
    title: 'Pyramid File Creator',
    description: '',
    progress: 100

},
{
    title: 'Align Images',
    description: 'Description of Process 2',
    progress: 65
},
{
    title: 'Some other process',
    description: 'Description of Process 3',
    progress: 10
}]

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ProcessList = ({ processes }) => {
    return (
        <Box sx={{ gap: 4, padding: 2, flexGrow: 2, justifyContent: 'space-between' }}>
            {processes.map((process, index) => (
                <ProcessCard key={index} process={process} />
            ))}
        </Box>
    );
};

const AdditionalInfo = ({ braininfo, stats }) => {
    if (!braininfo) {
        return (
            <Box sx={{ flex: 1.8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="h5" color="textSecondary">
                    Choose a brain
                </Typography>
            </Box>
        );
    }

    const brainStats = stats[0] || {};
    return (
        <Box sx={{ flex: 1.8, overflow: 'auto', alignContent: 'flex-start', paddingLeft: 2, borderRadius: '4px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold' }} textAlign='left' marginLeft={2}>
                    {braininfo.name}
                </Typography>
                <List>
                    <ListItem>
                        <ListItemText primary="Total Entries" secondary={brainStats.files} />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Size of Brain" secondary={formatFileSize(brainStats.size)} />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Path" secondary={brainStats.name} />
                    </ListItem>
                </List>
            </Box>
            <ProcessList processes={processes} />
        </Box>
    );
};
export default AdditionalInfo;
