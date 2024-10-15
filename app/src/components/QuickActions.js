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

const ProcessList = ({ processes }) => {
    return (
        <Box sx={{ gap: 4, padding: 2, flexGrow: 2, justifyContent: 'space-between' }}>
            {processes.map((process, index) => (
                <ProcessCard key={index} process={process} />
            ))}
        </Box>
    );
};

const AdditionalInfo = ({ rows }) => {
    return (
        <Box sx={{ flex: 1.8, overflow: 'auto', alignContent: 'flex-start', paddingLeft: 2, borderRadius: '4px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
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
            <ProcessList processes={processes} />
        </Box>
    );
};

export default AdditionalInfo;
