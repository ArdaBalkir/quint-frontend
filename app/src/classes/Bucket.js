class Bucket {
    constructor(name) {

        this.url = "https://data-proxy.ebrains.eu/api/v1/buckets/" + name;
    }

    async listObjects(bucketName) {
        const response = await fetch(`${this.url}${bucketName}`);
        return response.json();
    }

    async updateBucket(bucketName) {
        const response = await fetch(`${this.url}${bucketName}`, {
            method: 'PUT'
        });
        return response.json();
    }

    async deleteBucket(bucketName) {
        const response = await fetch(`${this.url}${bucketName}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    async getBucketStats(bucketName) {
        const response = await fetch(`${this.url}${bucketName}/stat`);
        return response.json();
    }

    async copyBucketContent(bucketName, destinationBucketName) {
        const response = await fetch(`${this.url}${bucketName}/copy`, {
            method: 'PUT',
            body: JSON.stringify({ destination: destinationBucketName })
        });
        return response.json();
    }

    async copyObject(bucketName, objectName, destinationBucketName, destinationObjectName) {
        const response = await fetch(`${this.url}${bucketName}/${objectName}/copy`, {
            method: 'PUT',
            body: JSON.stringify({ destinationBucket: destinationBucketName, destinationObject: destinationObjectName })
        });
        return response.json();
    }

    async getObjectDownloadUrl(bucketName, objectName) {
        const response = await fetch(`${this.url}${bucketName}/${objectName}`);
        return response.json();
    }

    async getObjectUploadUrl(bucketName, objectName) {
        const response = await fetch(`${this.url}${bucketName}/${objectName}`, {
            method: 'PUT'
        });
        return response.json();
    }

    async deleteObject(bucketName, objectName) {
        const response = await fetch(`${this.url}${bucketName}/${objectName}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    async renameObject(bucketName, objectName, newObjectName) {
        const response = await fetch(`${this.url}${bucketName}/${objectName}`, {
            method: 'PATCH',
            body: JSON.stringify({ newName: newObjectName })
        });
        return response.json();
    }
}
