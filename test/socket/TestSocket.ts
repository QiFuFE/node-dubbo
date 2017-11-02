import {Socket} from "net";

let client = new Socket();

client.connect(9999, 'localhost')
    .on('data', (data: Buffer) => {
        console.count('received msg');
        console.log(`received data msgId =>${data.slice(0, 1)[0]}\n`);
    })
    .on('close', (hadError) => {
        console.log(hadError);
    });
client.setNoDelay(true);

function send(msgId: number): void {
    client.write(Buffer.concat([Buffer.from([msgId]), Buffer.from('hello server'.repeat(1000))]));
}

for (let i = 1; i < 256; i++) {
    send(i);
}
