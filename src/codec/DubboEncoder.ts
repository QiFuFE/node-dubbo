/**
 * Created by panzhichao on 16/8/18.
 */


'use strict';
import ResponseStatus from "../enum/ResponseStatus";

const Encoder = require('hessian.js').EncoderV2;
const DEFAULT_LEN = 8388608; // 8 * 1024 * 1024 default body max length

export interface DubboEncoderOpts {
    dubboVersion: string;
    group: string;
    version: string;
    timeout: number;
}

export interface CallMethodOpts {
    _interface: string;
    version?: string;
    method: string;
}

export default class DubboEncoder {

    private dubboVersion: string;
    private timeout: number;

    constructor({dubboVersion, timeout}: DubboEncoderOpts) {
        this.dubboVersion = dubboVersion || '2.5.3.6';
        this.timeout = timeout;
    }

    public encode(rmiArgs, msgId: number, methodOpts: CallMethodOpts) {
        const body = this._body(rmiArgs, methodOpts);
        const head = DubboEncoder._head(msgId, body.length);
        return Buffer.concat([head, body], 16 + body.length);
    }

    /**
     * 构造 dubbo 传输协议中的 head 部分
     * @param msgId 消息 id 64位 long 类型
     * @param len 报文体具体数据的长度
     * @param isHeartBeat 是否为心跳响应包
     * @return {Buffer} head 部分的 Buffer 实例
     * @private
     */
    static _head(msgId: number, len: number, isHeartBeat = false) {
        //构造 16 字节的协议头部, 0xda, 0xbb 为协议魔数, 第三个字节 0b11000010
        const headBuf = Buffer.from([0xda, 0xbb, 0xc2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        if (isHeartBeat) {
            headBuf[2] = 0x22;
            headBuf[3] = ResponseStatus.OK;
        }
        // let flagByte = MessageFlag.FLAG_REQUEST
        if (len > DEFAULT_LEN) {
            throw new Error(`Data length too large: ${len}, max payload: ${DEFAULT_LEN}`);
        }
        // node 不支持64位整数/(ㄒoㄒ)/~~ , 直接从第9
        headBuf.writeUInt32BE(msgId, 8);
        //填充至协议头部后4个字节.
        headBuf.writeUInt32BE(len, 12);
        return headBuf;
    }

    /**
     *
     * @param rmiArgs
     * @param {string} _interface
     * @param {string} version
     * @param {string} method
     * @return {string | T[] | ArrayBuffer | Int8Array | Uint8Array | Uint8ClampedArray | any}
     * @private
     */
    _body(rmiArgs, {_interface, version = '0.0.0', method}: CallMethodOpts) {
        const attachments = {
            'interface': _interface,
            path: _interface,
            version,
            timeout: this.timeout,
        };

        const body = new Encoder();
        body.write(this.dubboVersion);
        body.write(_interface);
        body.write(version);
        body.write(method);
        if (this.dubboVersion.startsWith('2.8')) {
            body.write(-1);  //for dubbox 2.8.X
        }
        body.write(DubboEncoder._argsType(rmiArgs));
        if (rmiArgs && rmiArgs.length) {
            for (let i = 0, len = rmiArgs.length; i < len; ++i) {
                body.write(rmiArgs[i]);
            }
        }
        body.write({
            $class: 'java.util.HashMap',
            $: attachments
        });
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


    static encodeHeartBeatEvent(msgId: number) {
        const body = Buffer.from([78]);
        return Buffer.concat([DubboEncoder._head(msgId, 1, true), body], 17);
    }
}

