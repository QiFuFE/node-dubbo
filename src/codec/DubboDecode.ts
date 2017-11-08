/**
 * Created by panzhichao on 16/8/18.
 */


'use strict';
import Response from '../enum/ResponseStatus';
import {DecodedMsg} from "../RpcClient";
import {DecodeError} from "../error/DecodeError";
import * as assert from "assert";
import RpcError from "../error/RpcError";
import {JavaExceptionError} from 'hessian.js/lib/object';
import DubboMessageFlag from "../enum/DubboMsgFlag";

const HessianDecoder = require('hessian.js').DecoderV2;

const RESPONSE_WITH_EXCEPTION = 0;
const RESPONSE_VALUE = 1;
const RESPONSE_NULL_VALUE = 2;
const ErrorMsg = 'is not a valid dubbo package';


export default function decode(heap: Buffer): DecodedMsg {
    let flag, result;
    assert.equal(heap[0], 0xda, ErrorMsg) && assert.equal(heap[1], 0xbb, ErrorMsg);
    const flagByte = heap[2];
    const msgId = heap.readInt32BE(8);

    let decoded: DecodedMsg = {
        msgId,
        payload: null,
        isHeartBeat: false,
    };

    if ((flagByte & DubboMessageFlag.FLAG_REQUEST) === 0) {
        // decode response
        if (heap[3] !== Response.OK) {
            throw new Error(heap.slice(16, heap.length - 1).toString());
        }

        result = new HessianDecoder(heap.slice(16, heap.length));
        flag = result.readInt();
        switch (flag) {
            case RESPONSE_NULL_VALUE:
                break;
            case RESPONSE_VALUE:
                decoded.payload = result.read();
                break;
            case RESPONSE_WITH_EXCEPTION:
                let excep = result.read();
                !(excep instanceof Error) && (excep = new RpcError(msgId, excep));
                if (excep instanceof JavaExceptionError) {
                    excep.msgId = msgId;
                }
                throw excep;
            default:
                throw new DecodeError(msgId, `Unknown result flag, expect '0' '1' '2', get ${flag}`);
        }
    } else {
        // decode request
        if ((flagByte & DubboMessageFlag.FLAG_EVENT) !== 0) {
            decoded.isHeartBeat = true;
        }
    }

    return decoded;
}
