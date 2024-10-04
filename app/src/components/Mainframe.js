
import React from 'react';
import { Box } from '@mui/material';
import Fab from '@mui/material/Fab';
import { Menu, MenuItem } from '@mui/material';
import ChangeCircleOutlinedIcon from '@mui/icons-material/ChangeCircleOutlined';
import QuintTable from './QuintTable';


// Example response data
const responseData = {
    container: "ewb-f7b24062-268b-4ea7-af1e-b015cdd4645b",
    delimiter: "/",
    limit: 5000,
    marker: null,
    objects: [
        { subdir: ".nesysWorkflowFiles/", bytes: null, last_modified: null, objects_count: null },
        { hash: "1bdc078a64a182662e0a78291ecc44ac", last_modified: "2024-09-27T07:49:25.796510", bytes: 369619689, content_type: "image/tiff", name: "2877_NOP_tTA_lacZ_Xgal_s065.tif" },
        { hash: "fefdbf47f480daf11a2ad27f5a10e960", last_modified: "2024-09-11T07:23:41.624770", bytes: 10793, content_type: "text/markdown", name: "Technical Coordination 2024-09-10.md" },
        { hash: "66d806d4491111259f1240e4bf0ad394", last_modified: "2024-09-13T13:15:24.210030" },
        { hash: "47965c3ccca5003275651659551b9b52", last_modified: "2024-09-13T13:15:24.204900" },
        { hash: "dd0d072bf817572c0c3d8759fad0a7fb", last_modified: "2024-09-13T13:15:24.239940" }
    ],
    prefix: ""
};

const Mainframe = ({ url, native, menuItems }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };
    return (
        <Box
            sx={{
                width: '100%',
                height: '95.6vh',
                backgroundColor: '#333333',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
            }}
        >
            {native ? (
                // The native application goes here
                <Box sx={{
                    width: '98%',
                    height: '98%',
                    border: 'none',
                    bgcolor: 'white',
                    borderRadius: '4px',
                }}>
                    {/* <TableQ data={responseData} />*/}
                    <QuintTable />
                </Box>
            ) : (
                <Box
                    component="iframe"
                    sx={{
                        width: '98%',
                        height: '98%',
                        border: 'none',
                        bgcolor: 'white',
                        borderRadius: '4px',
                    }}
                    src={url || ''}
                    title="Mainframe Content"
                    allowFullScreen
                />
            )}
        </Box>
    )
};

export default Mainframe;
