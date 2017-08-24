const NZD = require('../index');
const { String: jString, int: jInt } = require('js-to-java');

const dependencies = {
  Customer: {
    interface: 'com.qf58.crm.extend.module.service.CustomerService',
    version: '1.0.0',
    timeout: 6000,
    methodSignature: {
      getCustomerByName: (name) => [jString(name)],
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
    console.log(await Dubbo.Customer.getCustomerByName('822'));
  } catch (e) {
    console.error(e);
  }
});
