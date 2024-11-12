
const BUCKET_URL = 'https://data-proxy.ebrains.eu/api/v1/buckets/'
const DEEPZOOM_URL = process.env.REACT_APP_DEEPZOOM_URL

// Works fine
export const fetchCollab = async (token, collabName) => {
    try {
        const response = await fetch(`https://wiki.ebrains.eu/rest/v1/collabs/${collabName}`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
        console.log(response)
        if (!response.ok) {
            throw new Error('Failed to fetch collab')
        }

        return await response.json()
    } catch (error) {
        console.error('Error:', error)
        throw error
    }
}

export const fetchBucketDir = async (token, bucketName, prefix, delimiter, limit = 1000) => {
    try {
        let url = `${BUCKET_URL}${bucketName}?`
        const params = new URLSearchParams()

        if (prefix) params.append('prefix', prefix)
        if (delimiter) params.append('delimiter', delimiter)
        if (limit) params.append('limit', limit)

        url += params.toString()

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
        if (!response.ok) {
            throw new Error('Failed to fetch bucket directory')
        }
        const data = await response.json()


        // Assign logic here so just touch here
        const entries = await Promise.all(data.objects.map(async obj => {
            if (obj.subdir) {
                // Placing the name
                const dirName = obj.subdir.split('/').slice(-2, -1)[0] || obj.subdir
                console.log('Directory:', dirName)

                // Fetching the subEntries for the Brains

                return {
                    name: dirName,
                    type: 'directory',
                    path: prefix ? `${prefix}${dirName}/` : `${dirName}/`
                }
            }
            return null
        }))

        return entries.filter(entry => entry !== null)
    } catch (error) {
        console.error('Error fetching bucket directory:', error)
        throw error
    }
}

export const fetchBrainStats = async (token, bucketName, brainPrefix) => {
    let res = []
    try {
        let url = `${BUCKET_URL}${bucketName}?`
        const params = new URLSearchParams();

        const workDirs = [
            'raw_images',
            'zipped_images',
        ]

        for (const workDir of workDirs) {
            const params = new URLSearchParams()
            if (brainPrefix) params.append('prefix', `${brainPrefix}${workDir}/`)
            params.append('limit', 1000)
            const workDirUrl = `${url}${params.toString()}`

            const response = await fetch(workDirUrl, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            })
            if (!response.ok) {
                throw new Error(`Failed to fetch bucket directory for ${workDir}`)
            }
            const data = await response.json()
            const stats = {
                "name": brainPrefix + workDir,
                "files": data.objects.length,
                "size": data.objects.reduce((acc, obj) => acc + obj.bytes, 0),
                "tiffs": data.objects.filter(obj => obj.name.endsWith('.tif')).map(obj => obj.name),
                "zip": data.objects.filter(obj => obj.name.endsWith('.zip')).map(obj => obj.name),
            }
            res.push(stats)
        }

    } catch (error) {
        console.error('Error fetching bucket directory:', error)
        throw error
    }
    return res
}
// For initial upload of brains
export const uploadToPath = async (token, bucketName, projectName, brainName, file) => {
    const objectName = `${projectName}/${brainName}/raw_images/${file.name}`.replace(/\/+/g, '/');
    const getUrlEndpoint = `${BUCKET_URL}${bucketName}/${objectName}`;

    // Step 1:
    const urlResponse = await fetch(getUrlEndpoint, {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json'
        }
    });

    if (!urlResponse.ok) {
        throw new Error(`Failed to get upload URL for ${file.name}`);
    }

    const { url: uploadUrl } = await urlResponse.json();

    // Step 2: 
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file ${file.name}`);
    }

    return { url: uploadUrl, status: uploadResponse.status === 204 };
}

export const callDeepZoom = async (token, sourceName, targetName) => {
    try {
        const response = await fetch(DEEPZOOM_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                "path": sourceName,
                "bucketname": targetName,
                "token": token
            })
        });

        if (!response.ok) {
            throw new Error(`DeepZoom request failed: ${response.body}, ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error calling DeepZoom:', error);
        throw error;
    }
}
