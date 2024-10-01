import React from 'react';




const TableQ = ({ data }) => {
    // Filter the directories from the response data
    const directories = data.objects.filter(item => item.subdir);

    return (
        <div>
            <h2>Directories</h2>
            <ul>
                {directories.map((dir, index) => (
                    <li key={index}>{dir.subdir}</li>
                ))}
            </ul>
        </div>
    );
};

export default TableQ;