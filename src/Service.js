const net = require('net');
const url = require('url');
const qs = require('querystring');
const decode = require('./Decode');
const Encode = require('./Encode').Encode;
let Java = require('js-to-java');

let COUNT = 0;

class Service {

  constructor(zk, _dver = '2.5.3.6', {
                version,
                group, interface: interfaceC, methodSignature = {}, timeout = 6000
              },
              serviceLength, root) {
    this._zk = zk;
    this._hosts = [];
    this._version = version;
    this._group = group;
    this._interface = interfaceC;
    this._signature = methodSignature;
    this.root = root;
    this._serviceLength = serviceLength;
    this._encodeParam = {
      _dver,
      _interface: interfaceC,
      _version: version,
      _group: group,
      _timeout: timeout
    };

    this._find(interfaceC);
  }

  _find(path, cb) {
    this._hosts = [];
    this._zk.getChildren(`/${this.root}/${path}/providers`, () => {
      this._find(path);
    }, (err, children) => {
      if (err) {
        if (err.code === -4) {
          console.log(err);
        }
        return console.log(err);
      }
      if (children && !children.length) {
        return console.log(`can\'t find  the zoo: ${path} group: ${this._group},,pls check dubbo service!`);
      }

      for (let i = 0, l = children.length; i < l; i++) {
        let zoo = qs.parse(decodeURIComponent(children[i]));
        const { 'default.version': version, group, methods } = zoo;
        console.log(version);
        if (version === this._version && group === this._group) {
          this._hosts.push(url.parse(Object.keys(zoo)[0]).host);
          methods.split(',').forEach(method => {
            this[method] = (...args) => {
              if (args.length && this._signature[method]) {
                args = this._signature[method].apply(this, args);
                if (typeof args === 'function') args = args(Java);
              }
              return this._execute(method, args);
            };
          });

        }
      }

      if (!this._hosts.length) {
        return console.log(`can\'t find  the zoo: ${path} group: ${this._group},pls check dubbo service!`);
      }
      if (typeof cb === 'function') {
        return cb();
      }
      if (++COUNT === this._serviceLength) {
        console.log('\x1b[32m%s\x1b[0m', 'Dubbo service init done');
      }
    });

  }

  _flush(cb) {
    this._find(this._interface, cb)
  }

  _execute(method, args) {
    this._encodeParam._method = method;
    this._encodeParam._args = args;
    const buffer = new Encode(this._encodeParam);
    console.log(JSON.stringify(this._encodeParam, null, 4));
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let host = this._hosts[Math.random() * this._hosts.length | 0].split(':');
      const chunks = [];
      let heap;
      let bl = 16;
      client.connect(host[1], host[0], () => client.write(buffer));

      client.on('error', err => {
        console.log(err);
        this._flush(() => {
          host = this._hosts[Math.random() * this._hosts.length | 0].split(':');
          client.connect(host[1], host[0], () => client.write(buffer));
        })
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
          decode(heap, (err, result) => {
            if (err) {
              return reject(err);
            }
            return resolve(result);
          })
        }

      });
    });
  }
}

module.exports = Service;