const NZD = require('../index');
const { String: jString, int: jInt,Long:jLong } = require('js-to-java');

const dependencies = {
  Customer: {
    interface: 'com.qf58.crm.extend.module.service.ClueService',
    version: '0.1.3',
    timeout: 6000,
    methodSignature: {
      getClueById: (id) => [jLong(id)],
    },
  },
};

// opt.java = require('js-to-java');

const Dubbo = new NZD({
  application: { name: 'node-consumer' },
  register: '172.16.11.118:2181',
  dubboVer: '2.5.2',
}, dependencies)
.on('init-done', async serviceLen => {
  console.log(this);
  console.log(serviceLen);
  try {
    console.log(await Dubbo.Customer.getClueById('822'));
  } catch (e) {
    console.error(e);
  }
});
