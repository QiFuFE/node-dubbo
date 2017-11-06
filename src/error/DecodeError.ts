export class DecodeError extends Error {
    constructor(msgId: number, s: string) {
        super(s);
        this.msgId = msgId;
        this.message = s;
    }
    msgId:number;
    name: string;
    message: string;
}