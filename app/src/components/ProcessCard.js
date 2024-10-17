import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, CircularProgress, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import LinearProgress from '@mui/material/LinearProgress';

function LinearProgressWithLabel(props) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" {...props} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" sx={{ color: 'gray' }}>
                    {`${Math.round(props.value)}%`}
                </Typography>
            </Box>
        </Box>
    );
}

const ProcessCard = ({ process }) => {
    return (
        <Accordion sx={{ alignContent: 'left' }}>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1a-content"
                id="panel1a-header"
                sx={{ justifyContent: 'space-between', flexGrow: 1, width: '100%' }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '95%' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {process?.title || 'Process Title'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ marginLeft: 2 }}>
                        Progress: {process?.progress || '0%'}
                    </Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                        {process?.description || 'Placeholder description'}
                    </Typography>
                </Box>
                <LinearProgressWithLabel value={process?.progress || 0} />
            </AccordionDetails>
        </Accordion>
    );
};

export default ProcessCard;
