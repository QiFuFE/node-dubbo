/**
 * @description Rpc Client
 */
'use strict';
import * as debugFac from 'debug';
import {SocketEvent} from "./enum/SocketEvent";
import ReusableSocket from "./socket/ReusableSocket";
import DubboEncoder, {CallMethodOpts} from "./codec/DubboEncoder";
import {DecodeError} from "./error/DecodeError";
import {JavaExceptionError} from 'hessian.js/lib/object';
import RpcError from "./error/RpcError";

const debug = debugFac('node-zookeeper-dubbo:RpcClient');

export interface DecoderCls {
    isValidCallResult: (bufChunk: Buffer) => number;
    decode: (msgBuf: Buffer) => DecodedMsg;
}

export interface DecodedMsg {
    msgId: number;
    payload: any;
}

//需要通过创建实例来使用
interface InitOptions {
    keepAlive: boolean;
    timeout: number;
    decode: (heap: Buffer) => DecodedMsg;
    encoder: DubboEncoder;
}

export default class RpcClient {

    /**
     * 并发请求时的会话标识
     * @type {number}
     */
    private msgId = 0;

    /**
     * 调用的上下文对象
     * @type {{}}
     */
    private context: Map<number, (err: Error, payload: any) => void> = new Map();

    /**
     * 全局唯一的一个socket
     * @type {Socket}
     */
    private connections: Map<string, Promise<ReusableSocket>> = new Map();

    /**
     * todo: 两个状态是否可以根据 socket.conneting 来替代?
     * @type {boolean}
     */
        // private between_close = false;

        // private calling_close = false;

    private encoder: DubboEncoder = null;
    private decode: (heap: Buffer) => DecodedMsg = null;


    private keepAlive = false;
    private timeout = 0;

    /**
     * 当前是否已连接(或正在连接)
     * @type {boolean}
     */
    isAlive = false;

    /*
            * 是否保持连接状态，如果为false，则每次socket空闲下来后就会关闭连接
            */
    constructor({keepAlive = false, timeout, decode, encoder}: InitOptions) {
        this.keepAlive = keepAlive;
        this.timeout = timeout;
        this.decode = decode;
        this.encoder = encoder;
    }

    /**
     * 获取对应的 socket 实例, 缓存中不存在则初始化
     * @param {string} host
     * @param {number} port
     * @return {Promise<"net".Socket>}
     */
    private getConnection(host: string, port: number): Promise<ReusableSocket> {
        //todo: 连接建立中, 同时触发多次初始化?
        let connName = `${host}:${port}`;
        if (this.connections.has(connName)) {
            return this.connections.get(connName);
        }

        let connPromise = this.initConnection(host, port);
        this.connections.set(`${host}:${port}`, connPromise);
        return connPromise;
    }

    /**
     * @description 初始化socket方法
     * @param {string} host
     * @param {number} port
     * @return {Promise<"net".Socket>}
     */
    private async initConnection(host: string, port: number): Promise<ReusableSocket> {
        debug(`init connection => ${host}:${port}`);
        let reuseSock = new ReusableSocket({
            headLen: 16,
            dataLenOffset: 12,
        });
        reuseSock.setKeepAlive(this.keepAlive);
        //reuseSock.setTimeout(cur.config.timeout);
        reuseSock.on('inbound', inboundMsg => {
            this.handleData(inboundMsg);
        }).on(SocketEvent.CLOSE, () => {
            // cur.isAlive = false;
            this.connections.delete(`${host}:${port}`);
            debug("socket closed");
            // if (cur.tmpGetTaskList.length) {
            //     //刚关闭socket，又来新请求
            //     cur.tmpGetTaskList.shift()();
            // }
        });

        // let bufferChunk = Buffer.from([]);
        // let socket = new Socket();
        // socket.setKeepAlive(this.keepAlive);
        //socket.setTimeout(cur.config.timeout);
        // var errorCall = function (msg) {
        //Timeout while connection or some connection error
        // debug(msg);
        // todo: actually, I don't know which request is error and which cb function I shall call. So call them all.
        // let cb;
        // while (cb = this.tmpGetTaskList.shift()) {
        //     cb(msg);
        // }
        // for (let key in this.context) {
        //     var ctx = cur.context[key];
        //     if (ctx && typeof(ctx.cb) == "function") {
        //         ctx.cb(msg);
        //         cur.context[key] = null;
        //     }
        // }
        //
        // socket.destroy();
        // };


        //连接也有可能会超时阻塞
        return new Promise<ReusableSocket>((resolve, reject) => {
            const connectTimeout = this.timeout * 3 || 3000;
            const connectTimer = setTimeout(() => {
                reject(new Error(`rpc_client:TCP connect timeout(${connectTimeout})`));
                reuseSock.destroy(/*传参则触发 error 事件 */);
            }, connectTimeout);
            reuseSock.connect(port, host, () => {
                //连接成功，把等待的数据发送掉
                debug("rpc_client connected");
                clearTimeout(connectTimer);
                resolve(reuseSock);
            })
                .on(SocketEvent.ERROR, e => {
                    debug(`socket err => ${e}`)
                    // todo: actually, I don't know which request is error and which cb function I shall call. So call them all.
                    if (reuseSock.connecting) {
                        clearTimeout(connectTimer);
                        reject(e);
                    }
                    reuseSock.destroy();
                });
        });


        // socket.on(SocketEvent.RECEIVE, data => {
        //todo: 空 Buffer 或其他参数的处理状况

        // if (!data || !Buffer.isBuffer(data) || data.length <= 0) {
        //     //error
        //     debug("buffer error:" + data);
        //     // errorCall(new Error("receive error, illegal data"));
        //     socket.end();
        // } else {

        // bufferChunk = Buffer.concat([bufferChunk, data]);
        // let packageSize = this.decoder.isValidCallResult(bufferChunk);
        // if (packageSize) {
        //     //网络有可能一次返回n个结果包，需要做判断，是不是很bt。。
        //     var totalSize = bufferChunk.length;
        //     if (packageSize == totalSize) {
        //         //只有一个包，这是大多数情况
        //         this.handleData(bufferChunk);
        //     }
        //     else {
        //         //存在多个包，这里要做一些buffer复制的操作，会消耗一定性能
        //
        //         while (true) {
        //             var buf = bufferChunk.slice(0, packageSize);
        //             this.handleData(buf);
        //             bufferChunk = bufferChunk.slice(packageSize, bufferChunk.length);
        //             packageSize = this.decoder.isValidCallResult(bufferChunk);
        //
        //             if (packageSize >= bufferChunk.length) {
        //                 //last one
        //                 this.handleData(bufferChunk);
        //                 break;
        //             }
        //             else if (packageSize == 0) {
        //                 //包还没接收完
        //                 return;
        //             }
        //         }
        //     }
        //
        //     //清空buffer，给下一次请求使用
        //     bufferChunk = Buffer.from([]);
        // }
        // else {
        //     //没接收完的话继续接收
        //     //console.log("keep looking");
        // }
        // }
        // })
    }


    /**
     *
     * @param host
     * @param port
     * @param paylords
     * @param callMethodOpts
     * @return {Promise<any>}
     */
    async invoke(host, port, paylords, callMethodOpts: CallMethodOpts): Promise<any> {
        //并发情况下靠这个序列标识哪个返回是哪个请求
        let msgId = this.msgId++ % 10000;
        if (msgId === 0) {
            this.msgId = ++msgId + 1;
        }
        //编码
        let buf = this.encoder.encode(paylords, msgId, callMethodOpts);

        const client = await this.getConnection(host, port);

        return new Promise((resolve, reject) => {
            let timer = null;
            if (this.timeout) {
                timer = setTimeout(() => {
                    //返回超时
                    this.context[msgId] = null;
                    // this.tryCloseSocket(/*client*/);
                    reject(new Error(`request or decode timeout( ${this.timeout} ms)`));
                }, this.timeout);
            }
            //保存当前上下文，都是为了并发
            this.context.set(msgId, (err, paylord) => {
                debug(`excute call's callback for msg => ${msgId}`);
                clearTimeout(timer);
                if (err) {
                    return reject(err);
                }
                resolve(paylord);
            });
            //真正的写socket
            client.on(SocketEvent.ERROR, err => {
                if (this.context.has(msgId)) {
                    clearTimeout(timer);
                    this.context.delete(msgId);
                    reject(err);
                }
            }).write(buf);
        });
    }


    /**
     * 处理返回数据，回调
     * @param msgBuf
     */
    private handleData(msgBuf: Buffer): void {
        debug(`receive call's response => ${msgBuf.length}`);
        let msgId = 0;
        let payload = null;
        try {
            let decoded = this.decode(msgBuf);
            msgId = decoded.msgId;
            payload = decoded.payload;

            if (!this.context.has(msgId)) {
                //找不到上下文，可能是因为超时，callback已执行，直接放弃当前数据
                console.log("Can't find context. This should never happened!" + msgId);
                //socket.destroy();
                return;
            }
            this.context.get(msgId)(null, payload);
        } catch (e) {
            if (e instanceof DecodeError || e instanceof RpcError || e instanceof JavaExceptionError) {
                //todo: 统一封装 RpcError
                debug(`remote call's response error for msg => ${e.msgId}`);
                this.context.get(e.msgId)(e, null);
            } else {
                console.error(e);
            }
        }
        if (msgId) {
            this.context.delete(msgId);
        }

        // this.tryCloseSocket(null);//todo : 此处对应的 socket 实例销毁?

    }

    /**
     * 尝试关闭 socket
     * @param cur
     */
    // private tryCloseSocket(/*cur*/) {

    // if ((cur.calling_close || !cur.config.keepAlive) && cur.currentSession == 0 && cur.tmpGetTaskList.length == 0) {
    //     cur.between_close = true;
    //     cur.calling_close = false;
    //     cur.isAlive = false;
    //     //调用end()之后sock会自动close，消息回调会先触发end，再触发close
    //     cur.socket.end();
    // }
    // }

    /**
     * 关闭连接
     */
    // private close() {
    //     if (this.socket && this.currentSession == 0 && this.tmpGetTaskList.length == 0 && (!this.between_close)) {
    //         this.between_close = true;
    //         this.isAlive = false;
    //         this.socket.end();
    //     }
    //     else {
    //         //等所有请求处理完再关闭
    //         this.calling_close = true;
    //     }
    // }
}
