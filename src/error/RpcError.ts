export default class RpcError extends Error {
    msgId: number;

    constructor(msgId: number, message: string) {
        super(message);
        this.msgId = msgId;
    }
}