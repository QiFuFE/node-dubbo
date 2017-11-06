/*!
 * ExBuffer
 * yoyo 2012 https://github.com/play175/ExBuffer
 * new BSD Licensed
 */

/*
* 构造方法
* @param bufferLength 缓存区长度，默认512 byte
*/

import {EventEmitter} from "events";
import * as debugFac from 'debug';

const debug = debugFac('node-zookeeper-dubbo:ExBuffer');

export enum Endian {
    Big = 'BE',
    Little = 'LE',
}

export default class ExBuffer extends EventEmitter {
    private dataLenOffset: number;
    private readMethod: string;
    private bufferStack: Buffer;
    private headLen: number;
    private endian: string;
    private readOffset: number;
    private putOffset: number;
    private dataLen: number;

    static InboundEvent = 'inbound';

    /**
     *
     * @param {number} headLen
     * @param {number} dataLenOffset
     * @param {Endian} endian
     * @param {number} bufferLength
     */
    constructor(headLen = 2, dataLenOffset = 0, endian = Endian.Big, bufferLength = 512) {
        super();
        this.headLen = headLen;
        this.dataLenOffset = dataLenOffset;
        this.endian = endian;
        this.bufferStack = Buffer.alloc(bufferLength);//Buffer大于8kb 会使用slowBuffer，效率低
        this.readOffset = 0;
        this.putOffset = 0;
        this.dataLen = 0;
        this.readMethod = `readInt${(headLen - dataLenOffset) * 8}${this.endian}`;
    }

    /**
     * @description 送入一段Buffer
     * @param buffer
     * @param {number} offset
     * @param {number} len
     */
    put(buffer, offset = 0, len = buffer.length - offset) {
        debug(`received pieces data => ${len}`);
        //buf.copy(targetBuffer, [targetStart], [sourceStart], [sourceEnd])
        //当前缓冲区已经不能满足次数数据了
        if (len + this.getLen() > this.bufferStack.length) {
            const ex = Math.ceil((len + this.getLen()) / (1024));//每次扩展1kb
            const tmp = Buffer.alloc(ex * 1024);
            const exlen = tmp.length - this.bufferStack.length;
            this.bufferStack.copy(tmp);
            //fix bug : superzheng
            if (this.putOffset < this.readOffset) {
                if (this.putOffset <= exlen) {
                    tmp.copy(tmp, this.bufferStack.length, 0, this.putOffset);
                    this.putOffset += this.bufferStack.length;
                } else {
                    //fix bug : superzheng
                    tmp.copy(tmp, this.bufferStack.length, 0, exlen);
                    tmp.copy(tmp, 0, exlen, this.putOffset);
                    this.putOffset -= exlen;
                }
            }
            this.bufferStack = tmp;
        }
        if (this.getLen() == 0) {
            this.putOffset = this.readOffset = 0;
        }
        //判断是否会冲破this.buffer尾部
        if ((this.putOffset + len) > this.bufferStack.length) {
            //分两次存 一部分存在数据后面 一部分存在数据前面
            let len1 = this.bufferStack.length - this.putOffset;
            if (len1 > 0) {
                buffer.copy(this.bufferStack, this.putOffset, offset, offset + len1);
                offset += len1;
            }

            let len2 = len - len1;
            buffer.copy(this.bufferStack, 0, offset, offset + len2);
            this.putOffset = len2;
        } else {
            buffer.copy(this.bufferStack, this.putOffset, offset, offset + len);
            this.putOffset += len;
        }
        this.getData();
    };

    getData() {
        let count = 0;
        while (true) {
            count++;
            if (count > 1000) break;//1000次还没读完??

            if (this.dataLen == 0) {
                //还未读取到一个完整包中的数据长度
                if (this.getLen() < this.headLen) {
                    //连包头都读不了
                    break;
                }

                if (this.bufferStack.length - this.readOffset >= this.headLen) {
                    this.dataLen = this.bufferStack[this.readMethod](this.readOffset + this.dataLenOffset);
                    this.readOffset += this.headLen;
                } else {
                    let headBuf = Buffer.alloc(this.headLen);
                    let rlen = 0;
                    for (let i = 0; i < (this.bufferStack.length - this.readOffset); i++) {
                        headBuf[i] = this.bufferStack[this.readOffset++];
                        rlen++;
                    }
                    this.readOffset = 0;
                    for (let i = 0; i < (this.headLen - rlen); i++) {
                        headBuf[rlen + i] = this.bufferStack[this.readOffset++];
                    }
                    this.dataLen = headBuf[this.readMethod](0);
                }
            }
            // debug('this.dataLen:' + this.dataLen + ',unreadLen:' + this.getLen());

            if (this.getLen() >= this.dataLen) {
                const dBuff = Buffer.alloc(this.headLen + this.dataLen);
                if (this.readOffset + this.dataLen > this.bufferStack.length) {
                    // 取两部分
                    const len1 = this.bufferStack.length - this.readOffset;
                    if (len1 > 0) {
                        this.bufferStack.copy(dBuff, 0, this.readOffset, this.readOffset + len1);
                    }

                    this.readOffset = 0;
                    const len2 = this.dataLen - len1;
                    this.bufferStack.copy(dBuff, len1, this.readOffset, this.readOffset += len2);
                } else {
                    this.bufferStack.copy(dBuff, 0, this.readOffset - this.headLen, this.readOffset += this.dataLen);
                }
                try {
                    this.dataLen = 0;
                    debug(`emit data, has ${this.getLen()} data yet, bufferstack length is ${this.bufferStack.length} now`);
                    this.emit(ExBuffer.InboundEvent, dBuff);
                    if (this.readOffset === this.putOffset) {
                        break;
                    }
                } catch (e) {
                    this.emit("error", e);
                }
            } else {
                break;
            }
        }
    }

    //获取现在的数据长度
    getLen() {
        return (this.putOffset >= this.readOffset) ? (this.putOffset - this.readOffset) : (this.bufferStack.length - this.readOffset + this.putOffset);
    }
}