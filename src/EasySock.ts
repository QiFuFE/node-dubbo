/**
 * @fileoverview 一个方便进行socket网络操作的模块，解决socket复用，长连接、短连接，并发请求等问题
 * @author vicyao
 *
 */
'use strict';
import * as debugFac from 'debug';
import {Socket} from "net";
import {SocketEvent} from "./enum/SocketEvent";

const debug = debugFac('node-zookeeper-dubbo:sock');

interface Decoder extends Function {
    isValidCallResult: Function;
}

//需要通过创建实例来使用
interface InitOptions {
    keepAlive: boolean;
    timeout: number;
    decoder: Decoder;
    encoder: (paylords: any, msgId: number) => Buffer;
}

export default class EasySock {

    /**
     * 并发请求时的会话标识
     * @type {number}
     */
    private msgId = 0;

    /**
     *保存请求的回调函数
     * @type {{}}
     */
    private context = {};

    /**
     * 全局唯一的一个socket
     * @type {Socket}
     */
    private connections: Map<string, Socket> = new Map();

    /**
     * todo: 两个状态是否可以根据 socket.conneting 来替代?
     * @type {boolean}
     */
        // private between_connect = false;
        // private between_close = false;

        // private calling_close = false;
    private currentSession = 0;
    // private tmpGetTaskList = [];

    private encoder: (paylords: any, msgId: number) => Buffer = null;
    private decoder = null;


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
    constructor({keepAlive = false, timeout, decoder, encoder}: InitOptions) {
        this.keepAlive = keepAlive;
        this.timeout = timeout;
        this.decoder = decoder;
        this.encoder = encoder;
    }

    /**
     * 获取对应的 socket 实例, 缓存中不存在则初始化
     * @param {string} host
     * @param {number} port
     * @return {Promise<"net".Socket>}
     */
    private async getConnection(host: string, port: number): Promise<Socket> {
        let connetionName = `${host}:${port}`;
        if (this.connections.has(connetionName)) {
            return this.connections.get(connetionName);
        }

        let connection = await this.initConnection(host, port);
        this.connections.set(`${host}:${port}`, connection);
        return connection.once(SocketEvent.CLOSE, () => {
            this.connections.delete(connetionName);
        });
    }

    /**
     * @description 初始化socket方法
     * @param {string} host
     * @param {number} port
     * @return {Promise<"net".Socket>}
     */
    private async initConnection(host: string, port: number): Promise<Socket> {
        let bufferChunk = Buffer.from([]);

        let socket = new Socket();
        socket.setKeepAlive(this.keepAlive);

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
        //         cur.currentSession--;
        //     }
        // }
        //
        // socket.destroy();
        // };

        const connectTimeout = this.timeout * 3 || 3000;

        socket.on(SocketEvent.RECEIVE, data => {
            if (!data || !Buffer.isBuffer(data) || data.length <= 0) {
                //error
                debug("buffer error:" + data);
                // errorCall(new Error("receive error, illegal data"));
                socket.end();
            } else {

                bufferChunk = Buffer.concat([bufferChunk, data]);
                let packageSize = this.decoder.isReceiveComplete(bufferChunk);
                if (packageSize) {
                    //网络有可能一次返回n个结果包，需要做判断，是不是很bt。。
                    var totalSize = bufferChunk.length;
                    if (packageSize == totalSize) {
                        //只有一个包，这是大多数情况
                        this.handleData(bufferChunk);
                    }
                    else {
                        //存在多个包，这里要做一些buffer复制的操作，会消耗一定性能

                        while (true) {
                            var buf = bufferChunk.slice(0, packageSize);
                            this.handleData(buf);
                            bufferChunk = bufferChunk.slice(packageSize, bufferChunk.length);
                            packageSize = this.decoder.isReceiveComplete(bufferChunk);

                            if (packageSize >= bufferChunk.length) {
                                //last one
                                this.handleData(bufferChunk);
                                break;
                            }
                            else if (packageSize == 0) {
                                //包还没接收完
                                return;
                            }
                        }
                    }

                    //清空buffer，给下一次请求使用
                    bufferChunk = Buffer.from([]);
                }
                else {
                    //没接收完的话继续接收
                    //console.log("keep looking");
                }
            }
        })
            .on(SocketEvent.CLOSE, () => {
                // cur.between_close = false;
                // cur.socket = null;
                // cur.isAlive = false;
                this.currentSession = 0;
                debug("easy_sock closed");
                // if (cur.tmpGetTaskList.length) {
                //     //刚关闭socket，又来新请求
                //     cur.tmpGetTaskList.shift()();
                // }
            });

        //连接也有可能会超时阻塞
        return new Promise<Socket>((resolve, reject) => {
            const connectTimer = setTimeout(() => {
                reject(new Error(`easy_sock:TCP connect timeout(${connectTimeout})`));
                socket.destroy(/*传参则触发 error 事件 */);
            }, connectTimeout);
            socket.connect(port, host, () => {
                //连接成功，把等待的数据发送掉
                debug("easy_sock connected");
                clearTimeout(connectTimer);
                resolve(socket);
            })
                .on(SocketEvent.ERROR, e => {
                    // todo: actually, I don't know which request is error and which cb function I shall call. So call them all.
                    reject(e);
                    socket.destroy();
                });
        });

    }


    /**
     *
     * @param host
     * @param port
     * @param paylords
     * @return {Promise<any>}
     */
    async write(host, port, paylords): Promise<any> {
        //当在这两个状态的时候，先保留请求，等连接成功后再执行
        // if (this.between_connect || this.between_close) {
        //
        //     this.tmpGetTaskList.push(err => {
        //         if (err) {
        //             callback(err);
        //         }
        //         else {
        //             this.write(data, callback);
        //         }
        //     });
        //     return;
        // }

        //并发情况下靠这个序列标识哪个返回是哪个请求
        let msgId = this.msgId++ % 10000;
        //编码
        let buf = this.encoder(paylords, msgId);

        const client = await this.getConnection(host, port);

        let timer = null;
        if (this.timeout) {
            timer = setTimeout(() => {
                //返回超时
                this.context[msgId] = null;
                this.currentSession--;
                this.tryCloseSocket(/*client*/);
                throw new Error(`request or decode timeout( ${this.timeout} ms)`);
            }, this.timeout);
        }

        return new Promise((resolve, reject) => {
            this.context[msgId] = {
                msgId,
                cb(err, paylord) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    if (err) {
                        return reject(err);
                    }
                    resolve(paylord);
                }
            };
            this.currentSession++;
            //真正的写socket
            client.write(buf);
        });
        //保存当前上下文，都是为了并发

        // } else {
        //     //第一次请求，初始化
        //     this.tmpGetTaskList.push(function () {
        //         self.write(data, callback);
        //     });
        //     initSocket(self);
        // }
    }

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

    /**
     * 处理返回数据，回调
     * @param cur
     * @param msgBuf
     */
    private handleData(msgBuf) {

        let {seq, paylord, error} = this.decoder(msgBuf);

        // try {
        //     result = this.decoder(msgBuf);
        // } catch (e) {
        //     debug("decoder error:");
        //     // cur.socket.destroy(); todo: 对应的 socket 实例销毁
        // }
        //
        // if (typeof result != "object") {
        //     //error
        //     debug("easy_sock:handle error:" + result);
        //     cur.socket.destroy();
        //     return;
        // }

        let ctx = this.context[seq];
        if (!ctx) {
            //找不到上下文，可能是因为超时，callback已执行，直接放弃当前数据
            //console.log("Can't find context. This should never happened!" + result.msgId);
            //socket.destroy();
            return;
        }

        this.context[seq] = null;
        this.currentSession--; //todo: socket 实例的 session 计数?

        // this.tryCloseSocket(null);//todo : 此处对应的 socket 实例销毁?

        ctx.cb(error, paylord);
    }

    /**
     * 尝试关闭 socket
     * @param cur
     */
    private tryCloseSocket(/*cur*/) {

        // if ((cur.calling_close || !cur.config.keepAlive) && cur.currentSession == 0 && cur.tmpGetTaskList.length == 0) {
        //     cur.between_close = true;
        //     cur.calling_close = false;
        //     cur.isAlive = false;
        //     //调用end()之后sock会自动close，消息回调会先触发end，再触发close
        //     cur.socket.end();
        // }
    }

}
