// import * as debugFactory from 'debug';
import * as url from 'url';
import * as qs from 'querystring';
import * as Java from 'js-to-java';
import {Client} from "node-zookeeper-client";
import getRpcClient, {RpcClient} from './RpcClient';
import NZD from "../index";
// import {promisify} from "util";


let COUNT = 0;

// const debug = debugFactory('node-zookeeper-dubbo:service');

export default class Service {
    private rpcClient: RpcClient;
    private zk: Client;
    private hosts: Array<string>;
    version: string = '*';
    private group: string;
    private interface: any;
    private signature: any;
    private root: string;
    private serviceLength: any;
    // private encodeParam: { _dver: any; _interface: any; _version: any; _group: any; _timeout: any };
    private nzd: any;

    // private static sock = Symbol('sock');

    constructor(nzd: NZD, {
                    version,
                    group,
                    interface: interfaceC,
                    methodSignature = {},
                    timeout = 6000
                }: Dependent,
                serviceLength) {
        this.zk = nzd.client;
        this.hosts = [];
        this.version = version;
        this.group = group;
        this.interface = interfaceC;
        this.signature = methodSignature;
        this.root = nzd.root;
        this.serviceLength = serviceLength;
        // this.encodeParam = {
        //     _dver: nzd.dubboVersion,
        //     _interface: interfaceC,
        //     _version: version,
        //     _group: group,
        //     _timeout: timeout
        // };
        // this.timeout = timeout;
        this.nzd = nzd;

        this.find(interfaceC);
        this.rpcClient = getRpcClient(nzd.dubboVersion, version, group, timeout);
        // this.rpcClient = new RpcClient({
        //     keepAlive: true,
        //     encoder: new DubboEncoder({
        //         dubboVersion: nzd.dubboVersion,
        //         version,
        //         group,
        //         timeout,
        //     }),
        //     decode: DubboDecode,
        //     timeout: 3000
        // });
    }


    private find(path, cb?: () => void) {
        this.hosts = [];
        this.zk.getChildren(`/${this.root}/${path}/providers`, event => {
            console.log('Got watcher event: %s', event);
            this.find(path);
        }, (err, children) => {
            if (err) {
                console.log(
                    'Failed to list children of %s due to: %s.',
                    path,
                    err
                );
                return;
            }
            if (children && !children.length) {
                return console.log(`can\'t find any providers: ${path} group: ${this.group}, pls check dubbo zookeeper node!`);
            }

            for (let i = 0, l = children.length; i < l; i++) {
                let zoo = qs.parse(decodeURIComponent(children[i]));
                const {'default.version': version, methods} = zoo;
                if (!version) {
                    this.hosts.push(url.parse(Object.keys(zoo)[0]).host);
                    (methods as string).split(',').forEach(method => {
                        this[method] = (...args: Array<any>) => {
                            if (args.length && this.signature[method]) {
                                args = this.signature[method].apply(this, args);
                                if (typeof args === 'function') args = args(Java);
                            }
                            return this._execute(method, args);
                        };
                    });

                }
            }

            if (!this.hosts.length) {
                return console.log(`can\'t find  the zoo: ${path} group: ${this.group},pls check dubbo service!`);
            }
            if (typeof cb === 'function') {
                return cb();
            }


            if (++COUNT === this.serviceLength) {
                this.nzd.emit('init-done', this.serviceLength);
                console.log('\x1b[32m%s\x1b[0m', 'Dubbo service init done');
            }
        });

    }

    _flush(cb) {
        this.find(this.interface, cb);
    }


    private getRandomServer(): [string, number] {
        if (!this.hosts.length) {
            throw new Error('now more server available!');
        }
        let [host, port] = this.hosts[Math.random() * this.hosts.length | 0].split(':');
        return [host, Number.parseInt(port, 10)];
    }

    // getConnection(): Promise<Socket> {
    //     if (this[Service.sock] && (this[Service.sock] as Socket).connecting) {
    //         return Promise.resolve(this[Service.sock]);
    //     }
    //
    //     const client = new Socket();
    //     let [host, port] = this.getRandomServer();
    //     return new Promise((resolve, reject) => {
    //         client.connect(port, host)
    //             .on('connect', () => resolve(client))
    //             .on('error', reject);
    //     });
    // }

    private async _execute(method, paylords) {
        // const encode = new Encode({...this.encodeParam, _args: paylords, _method: method});
        // debug(JSON.stringify(this.encodeParam, null, 4));
        let [host, port] = this.getRandomServer();
        return this.rpcClient.invoke(host, port, paylords, {
                _interface: this.interface,
                version: this.version,
                method,
            },
        );
        // new Promise((resolve, reject) => {
        //     const client = new net.Socket();
        //     let [host, port] = this.getRandomServer();
        //     const chunks = [];
        //     let heap;
        //     let bl = 16;
        //
        //     client.connect(port, host, () => client.write(encode.data))
        //         .on('error', async err => {
        //             console.log(err);
        //             this._flush(() => {
        //                 let [host, port] = this.getRandomServer();
        //                 client.connect(port, host, () => client.write(encode.data));
        //             })
        //         })
        //         .on('data', chunk => {
        //             if (!chunks.length) {
        //                 const arr = Array.prototype.slice.call(chunk.slice(0, 16));
        //                 let i = 0;
        //                 while (i < 3) {
        //                     bl += arr.pop() * Math.pow(256, i++);
        //                 }
        //             }
        //             chunks.push(chunk);
        //             heap = Buffer.concat(chunks);
        //             (heap.length >= bl) && client.destroy();
        //         })
        //         .on('close', err => {
        //             if (!err) {
        //                 try {
        //                     const result = decode(heap);
        //                     resolve(result);
        //                 } catch (e) {
        //                     reject(e);
        //                 }
        //             }
        //         });
        // });
    }

    static getInstance(Cls){
        return new Cls();
    }
}
