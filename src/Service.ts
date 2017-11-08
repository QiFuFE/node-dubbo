// import * as debugFactory from 'debug';
import * as url from 'url';
import * as qs from 'querystring';
import * as Java from 'js-to-java';
import {Client} from "node-zookeeper-client";
import getRpcClient, {RpcClient} from './RpcClient';
import NZD from "../index";


let COUNT = 0;

// const debug = debugFactory('node-dubbo:service');

export default class Service {
    private rpcClient: RpcClient;
    private zk: Client;
    private hosts: Array<string>;
    version: string = '*';
    // private group: string;
    private interface: any;
    private signature: any;
    private root: string;
    private serviceLength: any;
    private nzd: any;

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
        // this.group = group;
        this.interface = interfaceC;
        this.signature = methodSignature;
        this.root = nzd.root;
        this.serviceLength = serviceLength;
        this.nzd = nzd;

        this.find(interfaceC);
        this.rpcClient = getRpcClient(nzd.dubboVersion, version, group, timeout);
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
                return console.log(`can\'t find any providers: ${this.root}/${path} , pls check dubbo zookeeper node!`);
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
                return console.log(`can\'t find  the zoo: ${this.root}/${path} ,pls check dubbo service!`);
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


    private async _execute(method, paylords) {
        let [host, port] = this.getRandomServer();
        return this.rpcClient.invoke(host, port, paylords, {
                _interface: this.interface,
                version: this.version,
                method,
            },
        );
    }

    // static getInstance(Cls) {
    //     return new Cls();
    // }
}
