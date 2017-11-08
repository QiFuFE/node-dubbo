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
import DubboDecode from './codec/DubboDecode';

const debug = debugFac('node-zookeeper-dubbo:RpcClient');

export interface DecodedMsg {
    isHeartBeat: boolean;
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

export class RpcClient {

    /**
     * 并发请求时的会话标识
     * @type {number}
     */
    private msgId = 0;


    /**
     * 连接集合
     * @type {Map}
     */
    private connections: Map<string, Promise<ReusableSocket>> = new Map();

    private encoder: DubboEncoder = null;
    private decode: (heap: Buffer) => DecodedMsg = null;


    private keepAlive = false;
    private timeout = 0;

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
            this.handleData(inboundMsg, reuseSock);
        }).on(SocketEvent.CLOSE, () => {
            this.connections.delete(`${host}:${port}`);
            debug("socket closed");
        });

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
                    debug(`socket err => ${e}`);
                    if (reuseSock.connecting) {
                        clearTimeout(connectTimer);
                        reject(e);
                    }
                    // FixMe: 然而并不知道是某个数据包出现了异常, So, 清空上下文, 讲道理, reuseSock 实例应当被辣鸡回收的好伐
                    reuseSock.context.forEach(cb => cb(e, null));
                    reuseSock.destroy();
                });
        });


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
                    client.context.delete(msgId);
                    // this.tryCloseSocket(/*client*/);
                    reject(new Error(`request timeout( ${this.timeout} ms)`));
                }, this.timeout);
            }
            //保存当前上下文，都是为了并发
            client.context.set(msgId, (err, paylord) => {
                debug(`remote call's callback for msg => ${msgId}`);
                clearTimeout(timer);
                if (err) {
                    return reject(err);
                }
                resolve(paylord);
            });

            //真正的写socket
            // todo: socket 出现异常, 超时 timer 未取消
            client.write(buf);
        });
    }


    /**
     * 处理返回数据，回调
     * @param msgBuf
     */
    private async handleData(msgBuf: Buffer, client: ReusableSocket): Promise<void> {
        debug(`receive call's response => ${msgBuf.length}`);
        let msgId = 0;
        let payload = null;
        try {
            let decoded = this.decode(msgBuf);
            if (decoded.isHeartBeat) {
                debug(`received heartbeat msgId => ${decoded.msgId}`);
                client.write(DubboEncoder.encodeHeartBeatEvent(decoded.msgId));
            } else {
                msgId = decoded.msgId;
                payload = decoded.payload;

                if (!client.context.has(msgId)) {
                    //找不到上下文，可能是因为超时，callback已执行，直接放弃当前数据
                    console.log("Can't find context. This should never happened!" + msgId);
                    //socket.destroy();
                    return;
                }
                client.context.get(msgId)(null, payload);
            }
        } catch (e) {
            if (e instanceof DecodeError || e instanceof RpcError || e instanceof JavaExceptionError) {
                debug(`remote call's response error for msg => ${e.msgId}`);
                client.context.get(e.msgId)(e, null);
            } else {
                console.error(e);
            }
        }
        if (msgId) {
            client.context.delete(msgId);
        }

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

let rpcClient = null;

export default function getRpcClient(dubboVersion, version, group, timeout) {
    if (rpcClient) {
        return rpcClient;
    }

    return rpcClient = new RpcClient({
        keepAlive: true,
        encoder: new DubboEncoder({
            dubboVersion,
            version,
            group,
            timeout,
        }),
        decode: DubboDecode,
        timeout: 3000
    });
}

