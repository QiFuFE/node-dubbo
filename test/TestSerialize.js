const Encoder = require('../src/Encode').Encode;

const java = require('js-to-java');

const buffer = new Encoder({
  _method: 'getCustomerByName',
  _dver: '2.5.3',
  _interface: 'com.org.CustomerService',
  _version: '1.0.0',
  _args: [
    java('com.test.Object', { foo: 'bar' }),
    java('com.test.Object', { foo: 'bar' }),
    java('com.test.Object', { foo: 'bar' }),
    java('com.test.Object', { foo: 'bar' }),
    java('com.test.Object', { foo: 'bar' }),
    java('com.test.Object', { foo: 'bar' }),
  ]
});

const client = new require('net').Socket();

client.connect(8081, '127.0.0.1', () => client.write(buffer));

client.on('error', console.log)
.on('data', console.log)
.on('close', console.log);