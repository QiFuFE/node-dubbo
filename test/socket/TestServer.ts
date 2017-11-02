import {createServer} from "net";

createServer(socket => {
    socket.setNoDelay(true);

    socket.on('data', chunk => {
        console.count('receive msg');
        console.log(`received msgId =>${chunk.slice(0, 1)[0]}\n`);
        socket.write(chunk.toString());
    })
        .on('error', err => {
            console.log(err);
        })
        .on('close', () => {
            console.log('closed');
        })
}).listen(9999);