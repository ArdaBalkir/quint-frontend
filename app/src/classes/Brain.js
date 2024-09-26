
export class Brain {

    constructor(name, url) {
        this.name = name;
        this.url = url;
        this.rawFiles = url + "/raw";
        this.pyramidFiles = url + "/pyramid";
    }

    getName() {
        return this.name;
    }

    getUrl() {
        return this.url;
    }
}