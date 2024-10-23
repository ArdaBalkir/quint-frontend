import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Card, CardContent, Button, LinearProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { callDeepZoom } from '../actions/handleCollabs';

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

const AdditionalInfo = ({ braininfo, stats }) => {

    let pyramidCount = stats[1]?.zip.length || 0;
    const [user, setUser] = useState(null);

    useEffect(() => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            setUser(userInfo.username);
        } catch (error) {
            console.error('Error parsing userInfo:', error);
        }
    }, []);

    const processFiles = async (files, target) => {
        const bucketName = `${user}-rwb/`;
        let pyramidCount = 0;
        for (const file of files) {
            const result = await callDeepZoom(bucketName + file, bucketName + target);
            if (result.status === 200) {
                pyramidCount++;
            }
        }
    };

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
            <Card sx={{ maxHeight: 300, overflow: 'auto' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Typography color="text" gutterBottom>
                            Tiff Files to be Converted: {brainStats.files - stats[1]?.zip.length}
                            <br />
                            Currently in Zipped Files: {stats[1]?.zip.length}
                        </Typography>
                        <Button
                            variant='outlined'
                            color='black'
                            // Allow a let usage here for the uplaods
                            onClick={() => processFiles(brainStats.tiffs, stats[1]?.name)}
                        >
                            Process Files
                        </Button>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Typography>
                            Progress: {pyramidCount} / {brainStats.files} files processed
                        </Typography>
                        <LinearProgress variant="determinate" value={(pyramidCount / brainStats.files) * 100} />
                    </Box>


                </CardContent>
            </Card>
        </Box>
    );
};
export default AdditionalInfo;
