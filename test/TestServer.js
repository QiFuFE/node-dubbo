const net = require('net');

net.createServer(socket => {
  console.log('connected');

  let chunks = null;
  socket.on('end', function () {

    console.log('socket disconnected');
  });

  socket.on('data', function (chunk) {
    chunks = Buffer.concat([chunks, chunk]);
    console.log(chunk);
  })
  .on('error', err => {
    console.log(err);
  });
})
.listen(8081, () => {
  console.log('opened server on 8081');
})
.on('error', err => {
  console.log(err);
});

