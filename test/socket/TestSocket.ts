//测试客户端
import {connect} from "net";
import ExBuffer from '../../src/socket/ExBuffer';

const exBuffer = new ExBuffer();
let client = connect(8124, 'localhost').on('data', function (data) {
    exBuffer.put(data);//只要收到数据就往ExBuffer里面put
}).on('error', () => {
    console.log('connection error on socket');
}).on('close', () => {
    console.log('connection close on socket');
});

//当客户端收到完整的数据包时
exBuffer.on('data', function (buffer) {
    console.log('>> client receive data,length:' + buffer.length);
    console.log(buffer.toString());
    // client.destroy();
    throw new Error('123');
}).on('error', () => {
    console.log('connection error');
});

function send(i) {
    const data = '@'.repeat(i);
    const len = Buffer.byteLength(data);

    //写入2个字节表示本次包长
    const headBuf = new Buffer(2);
    headBuf.writeUInt16BE(len, 0);

    const bodyBuf = Buffer.from(data);

    client.write(Buffer.concat([headBuf, bodyBuf], 2 + len));
}


// for (let i = 0; i < 100; i++) {
send(10);
// }
setTimeout(() => {
    send(20);
}, 3000);
