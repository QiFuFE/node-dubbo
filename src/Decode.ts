/**
 * Created by panzhichao on 16/8/18.
 */
'use strict';
import Response from './enum/ResponseStatus';

const Decoder = require('hessian.js').DecoderV2;

const RESPONSE_WITH_EXCEPTION = 0;
const RESPONSE_VALUE = 1;
const RESPONSE_NULL_VALUE = 2;

export default function decode(heap) {
    let flag, result;
    if (heap[3] !== Response.OK) {
        throw new Error(heap.slice(18, heap.length - 1).toString());
    }
    result = new Decoder(heap.slice(16, heap.length));
    flag = result.readInt();
    switch (flag) {
        case RESPONSE_NULL_VALUE:
            return null;
        case RESPONSE_VALUE:
            return result.read();
        case RESPONSE_WITH_EXCEPTION:
            let excep = result.read();
            !(excep instanceof Error) && (excep = new Error(excep));
            throw excep;
        default:
            throw new Error(`Unknown result flag, expect '0' '1' '2', get ${flag}`);
    }

    // });
}

