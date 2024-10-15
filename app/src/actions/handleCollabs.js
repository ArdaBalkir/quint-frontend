
const BUCKET_URL = 'https://data-proxy.ebrains.eu/api/v1/buckets/'

const refreshToken = () => {
    let token = localStorage.getItem('accessToken')
    return token
}

// Works fine
export const fetchCollab = async (collabName) => {
    try {
        const token = refreshToken();
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

export const fetchBucketDir = async (bucketName, prefix, delimiter, limit = 1000, depth = 0) => {
    try {
        const token = refreshToken();
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
                let subEntries = []
                if (depth < 1) {
                    subEntries = await fetchBucketDir(bucketName, obj.subdir, '/', limit, depth + 1)
                }
                // muted directories
                return {
                    name: dirName,
                    type: 'directory',
                    subEntries: subEntries,
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

export const fetchBrainStats = async (bucketName, brainPrefix) => {
    let res = []
    const token = refreshToken();
    try {
        let url = `${BUCKET_URL}${bucketName}?`
        const params = new URLSearchParams();

        const workDirs = [
            'Metadata',
            'originalImages'
        ]
        for (const workDir of workDirs) {
            const params = new URLSearchParams()
            if (brainPrefix) params.append('prefix', `${brainPrefix}${workDir}/`)
            params.append('delimiter', '/')
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
                "name": brainPrefix,
                "files": data.objects.length,
                "size": data.objects.reduce((acc, obj) => acc + obj.bytes, 0),
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
export const uploadToPath = async (bucketName, projectName, brainName, file) => {
    const token = refreshToken();
    const objectName = `${projectName}/${brainName}/${file.name}`.replace(/\/+/g, '/');
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
