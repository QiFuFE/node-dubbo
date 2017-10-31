"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debugFactory = require("debug");
const net = require("net");
const url = require("url");
const qs = require("querystring");
const Decode_1 = require("./Decode");
const Encode_1 = require("./Encode");
const Java = require("js-to-java");
let COUNT = 0;
const debug = debugFactory('node-zookeeper-dubbo:service');
class Service {
    constructor(nzd, { version, group, interface: interfaceC, methodSignature = {}, timeout = 6000 }, serviceLength) {
        this.version = '*';
        this.zk = nzd.client;
        this.hosts = [];
        this.version = version;
        this.group = group;
        this.interface = interfaceC;
        this.signature = methodSignature;
        this.root = nzd.root;
        this.serviceLength = serviceLength;
        this.encodeParam = {
            _dver: nzd.dubboVersion,
            _interface: interfaceC,
            _version: version,
            _group: group,
            _timeout: timeout
        };
        this.nzd = nzd;
        this.find(interfaceC);
    }
    find(path, cb) {
        this.hosts = [];
        this.zk.getChildren(`/${this.root}/${path}/providers`, event => {
            console.log('Got watcher event: %s', event);
            this.find(path);
        }, (err, children) => {
            if (err) {
                console.log('Failed to list children of %s due to: %s.', path, err);
                return;
            }
            if (children && !children.length) {
                return console.log(`can\'t find any providers: ${path} group: ${this.group}, pls check dubbo zookeeper node!`);
            }
            for (let i = 0, l = children.length; i < l; i++) {
                let zoo = qs.parse(decodeURIComponent(children[i]));
                const { 'default.version': version, methods } = zoo;
                if (!version) {
                    this.hosts.push(url.parse(Object.keys(zoo)[0]).host);
                    methods.split(',').forEach(method => {
                        this[method] = (...args) => {
                            if (args.length && this.signature[method]) {
                                args = this.signature[method].apply(this, args);
                                if (typeof args === 'function')
                                    args = args(Java);
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
    _execute(method, args) {
        const encode = new Encode_1.default(Object.assign({}, this.encodeParam, { _args: args, _method: method }));
        debug(JSON.stringify(this.encodeParam, null, 4));
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            let host = this.hosts[Math.random() * this.hosts.length | 0].split(':');
            const chunks = [];
            let heap;
            let bl = 16;
            let port = Number.parseInt(host[1], 10);
            client.connect(port, host[0], () => client.write(encode.data))
                .on('error', async (err) => {
                console.log(err);
                this._flush(() => {
                    host = this.hosts[Math.random() * this.hosts.length | 0].split(':');
                    client.connect(port, host[0], () => client.write(encode.data));
                });
            })
                .on('data', chunk => {
                if (!chunks.length) {
                    const arr = Array.prototype.slice.call(chunk.slice(0, 16));
                    let i = 0;
                    while (i < 3) {
                        bl += arr.pop() * Math.pow(256, i++);
                    }
                }
                chunks.push(chunk);
                heap = Buffer.concat(chunks);
                (heap.length >= bl) && client.destroy();
            })
                .on('close', err => {
                if (!err) {
                    try {
                        const result = Decode_1.default(heap);
                        resolve(result);
                    }
                    catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }
}
exports.default = Service;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzQ0FBc0M7QUFDdEMsMkJBQTJCO0FBQzNCLDJCQUEyQjtBQUMzQixrQ0FBa0M7QUFDbEMscUNBQThCO0FBQzlCLHFDQUE4QjtBQUM5QixtQ0FBbUM7QUFJbkMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FBRWQsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFFM0Q7SUFjSSxZQUFZLEdBQUcsRUFBRSxFQUNELE9BQU8sRUFDUCxLQUFLLEVBQ0wsU0FBUyxFQUFFLFVBQVUsRUFDckIsZUFBZSxHQUFHLEVBQUUsRUFDcEIsT0FBTyxHQUFHLElBQUksRUFDTixFQUNaLGFBQWE7UUFqQmpCLFlBQU8sR0FBVyxHQUFHLENBQUM7UUFrQjFCLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQztRQUM1QixJQUFJLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRztZQUNmLEtBQUssRUFBRSxHQUFHLENBQUMsWUFBWTtZQUN2QixVQUFVLEVBQUUsVUFBVTtZQUN0QixRQUFRLEVBQUUsT0FBTztZQUNqQixNQUFNLEVBQUUsS0FBSztZQUNiLFFBQVEsRUFBRSxPQUFPO1NBQ3BCLENBQUM7UUFDRixJQUFJLENBQUMsR0FBRyxHQUFH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