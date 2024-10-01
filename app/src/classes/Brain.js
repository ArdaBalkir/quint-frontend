import Bucket from './Bucket.js';
export class Brain {

    constructor(name, url) {
        this.name = name;
        this.url = url;
        this.rawFiles = url + "/raw";
        this.pyramidFiles = url + "/pyramid";
        this.metadata = url + "/metadata";
        this.jsons = url + "/jsons";
        this.utils = url + "/utils";
        this.Bucket = new Bucket(name, url);
    }

    getName() {
        return this.name;
    }

    getUrl() {
        return this.url;
    }

    uploadRawFile(file) {
        return this.Bucket.uploadFile(this.rawFiles, file);
    }
}