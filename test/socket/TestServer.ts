import {createServer, Socket} from "net";
import ExBuffer from '../../src/ExBuffer';
//测试服务端
createServer(socket => {
    console.log('client connected');
    new Connection(socket);//有客户端连入时
}).listen(8124);

//服务端中映射客户端的类
function Connection(socket: Socket) {
    let exBuffer = new ExBuffer();
    exBuffer.on('data', onReceivePackData);
    socket.on('data', chunk => exBuffer.put(chunk))
        .on('error', () => console.log('connection error'))
        .on('close', hadError => console.log(`connection closed => hadError :${hadError}`));//只要收到数据就往ExBuffer里面put

    //当服务端收到完整的包时
    function onReceivePackData(buffer) {
        console.log('>> server receive data,length:' + buffer.length);
        console.log(buffer.toString());

        let len = Buffer.byteLength(buffer);

        //写入2个字节表示本次包长
        let headBuf = new Buffer(2);
        headBuf.writeUInt16BE(len, 0)

        // let bodyBuf = new Buffer(len);
        // bodyBuf.write(buffer);

        socket.write(Buffer.concat([headBuf, buffer]));
    }
}