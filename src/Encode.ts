/**
 * Created by panzhichao on 16/8/18.
 */
'use strict';
const Encoder = require('hessian.js').EncoderV2;
const DEFAULT_LEN = 8388608; // 8 * 1024 * 1024 default body max length

export default class Encode {
    private opt: any;
    private buf: Buffer;

    constructor(opt) {
        this.opt = opt;
        const body = this._body(/*opt._method,*/ opt._args);
        const head = Encode._head(body.length);
        this.buf = Buffer.concat([head, body]);
    }

    get data(){
        return this.buf;
    }
    /**
     * 构造 dubbo 传输协议中的 head 部分
     * @param len 报文体具体数据的长度
     * @return {Buffer} head 部分的 Buffer 实例
     * @private
     */
    static _head(len) {
        //构造 16 字节的协议头部, 0xda, 0xbb 为协议魔数
        const head = [0xda, 0xbb, 0xc2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let i = 15;
        if (len > DEFAULT_LEN) {
            throw new Error(`Data length too large: ${len}, max payload: ${DEFAULT_LEN}`);
        }
        //填充至协议头部后4个字节.
        while (len >= 256) {
            head.splice(i--, 1, len % 256);
            len >>= 8;
        }
        head.splice(i, 1, len);
        return new Buffer(head);
    }

    /**
     *
     * @param args
     * @return {Buffer|Array.<T>|string}
     * @private
     */
    _body(/*method,*/ args) {
        const body = new Encoder();
        body.write(this.opt._dver || '2.5.3.6');
        body.write(this.opt._interface);
        body.write(this.opt._version);
        body.write(this.opt._method);
        if (this.opt._dver.startsWith('2.8')) {
            body.write(-1);  //for dubbox 2.8.X
        }
        body.write(Encode._argsType(args));
        if (args && args.length) {
            for (let i = 0, len = args.length; i < len; ++i) {
                body.write(args[i]);
            }
        }
        body.write(this._attachments());
        return body.byteBuffer._bytes.slice(0, body.byteBuffer._offset);
    }

    static _argsType(args) {
        if (!(args && args.length)) {
            return '';
        }

        const typeRef = {
            boolean: 'Z', int: 'I', short: 'S',
            long: 'J', double: 'D', float: 'F'
        };

        let parameterTypes = '';
        let type;

        for (let i = 0, l = args.length; i < l; i++) {
            type = args[i]['$class'];

            if (type.charAt(0) === '[') {
                parameterTypes += ~type.indexOf('.')
                    ? '[L' + type.slice(1).replace(/\./gi, '/') + ';'
                    : '[' + typeRef[type.slice(1)];
            } else {
                parameterTypes += type && ~type.indexOf('.')
                    ? 'L' + type.replace(/\./gi, '/') + ';'
                    : typeRef[type];
            }
        }

        return parameterTypes;
    }

    _attachments() {
        const implicitArgs = {
            'interface': this.opt._interface,
            path: this.opt._interface,
            timeout: this.opt._timeout
        };
        this.opt._version && (implicitArgs['version'] = this.opt._version);
        // this.opt._group && (implicitArgs['group'] = this.opt._group);

        return {
            $class: 'java.util.HashMap',
            $: implicitArgs
        }
    }
}

