export default class DubboService {
    private dubboVersion: string = '2.5.3';

    constructor(version) {
        this.dubboVersion = version;
    }

    hello() {
        console.log('hello');
    }
}

