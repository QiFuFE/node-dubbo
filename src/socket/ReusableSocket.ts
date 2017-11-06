import {Socket, SocketConstructorOpts} from "net";
import ExBuffer, {Endian} from "./ExBuffer";
import {SocketEvent} from "../enum/SocketEvent";

export interface ExBufferOptions {
    headLen?: number;
    dataLenOffset?: number;
    endian?: Endian;
    bufferLength?: number;
}

// @ts-ignore: 重载方法识别错误
export default class ReusableSocket extends Socket {
    private exBuf: ExBuffer;

    constructor({headLen, dataLenOffset, endian, bufferLength}: ExBufferOptions = {}, options?: SocketConstructorOpts) {
        super(options);
        this.exBuf = new ExBuffer(headLen, dataLenOffset, endian, bufferLength);
        this.exBuf.on(ExBuffer.InboundEvent, data => {
            this.emit(ExBuffer.InboundEvent, data);
        }).on('error', err => {
            console.error(err, 'on ReuseableSocket.exBuffer error Event');
        });
    }


    connect(port: number, host: string, connectionListener?: Function): this {
        return super.connect(port, host, () => {
            if (connectionListener) {
                connectionListener();
            }
            this.on(SocketEvent.RECEIVE, data => {
                this.exBuf.put(data);
            });
        });
    }

}