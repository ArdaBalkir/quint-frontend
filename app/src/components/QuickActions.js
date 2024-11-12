import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Card, CardContent, Button, LinearProgress, Skeleton } from '@mui/material';
import { useState, useEffect } from 'react';
import { callDeepZoom } from '../actions/handleCollabs';

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AdditionalInfo = ({ braininfo, stats, isLoading }) => {
    let pyramidCount = stats[1]?.zip.length || 0;
    const [user, setUser] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            setUser(userInfo.username);
        } catch (error) {
            console.error('Error parsing userInfo:', error);
        }
    }, []);

    const processFiles = async (files, target) => {
        setIsProcessing(true);
        const bucketName = `${user}-rwb/`;
        let pyramidCount = 0;
        try {
            for (const file of files) {
                const result = await callDeepZoom(bucketName + file, bucketName + target);
                if (result.status === 200) {
                    pyramidCount++;
                }
            }
        } catch (error) {
            console.error('Error processing files:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!braininfo) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                <Typography variant="h5" color="textSecondary">
                    Choose a brain
                </Typography>
            </Box>
        );
    }

    const brainStats = stats[0] || {};

    if (isLoading) {
        return (
            <Box sx={{ p: 2 }}>
                <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
                <List>
                    {[1, 2, 3].map((item) => (
                        <ListItem key={item}>
                            <ListItemText
                                primary={<Skeleton width="40%" />}
                                secondary={<Skeleton width="60%" />}
                            />
                        </ListItem>
                    ))}
                </List>
                <Card sx={{ boxShadow: 'none', mb: 2, border: '1px solid #e0e0e0' }}>
                    <CardContent>
                        <Skeleton variant="rectangular" height={100} />
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ overflow: 'auto', p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                <Card sx={{ boxShadow: 'none', mb: 2, border: '1px solid #e0e0e0' }}>
                    <Typography
                        variant="h5"
                        color="primary"
                        gutterBottom
                        sx={{ fontWeight: 'bold' }}
                        textAlign='left'
                        padding={2}
                    >
                        {braininfo.name}
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemText
                                primary="Total Entries"
                                secondary={brainStats.files || 'N/A'}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Size of Brain"
                                secondary={brainStats.size ? formatFileSize(brainStats.size) : 'N/A'}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Last uploaded"
                                secondary={brainStats.last_modified ? brainStats.last_modified.toLocaleString() : 'N/A'}
                            />
                        </ListItem>
                    </List>
                </Card>
                <Card sx={{ boxShadow: 'none', mb: 2, border: '1px solid #e0e0e0' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography color="text.primary">
                                Tiff Files to be Converted: {brainStats.files - stats[1]?.zip.length || 0}
                                <br />
                                Currently in Zipped Files: {stats[1]?.zip.length || 0}
                            </Typography>
                            <Button
                                variant="outlined"
                                disabled={isProcessing}
                                onClick={() => processFiles(brainStats.tiffs, stats[1]?.name)}
                                sx={{
                                    borderColor: 'black',
                                    color: 'black',
                                    '&:hover': {
                                        borderColor: 'black',
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                    }
                                }}
                            >
                                {isProcessing ? 'Processing...' : 'Process Files'}
                            </Button>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Typography sx={{ mb: 1 }}>
                                Progress: {pyramidCount} / {brainStats.files || 0} files processed
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(pyramidCount / (brainStats.files || 1)) * 100}
                                sx={{
                                    height: 8,
                                    borderRadius: 4
                                }}
                            />
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default AdditionalInfo;