export default class DubboService {
    private dubboVersion: string = '2.5.3';

    constructor(version) {
        this.dubboVersion = version;
    }

    getVersion(){
        return this.dubboVersion;
    }
}

