import NZD from '../index';

const {Long: jLong} = require('js-to-java');

const dependencies = {
    Customer: {
        interface: 'com.qf58.crm.extend.module.service.ClueService',
        timeout: 6000,
        group: 'beta-a',
        methodSignature: {
            getClueById: (id) => [jLong(id)],
        },
    },
};


// opt.java = require('js-to-java');

const Dubbo = new NZD({
    application: {name: 'node-consumer'},
    register: '172.16.11.118:2181',
    dubboVersion: '2.5.3',
    root: 'beta-a',
}, dependencies)
    .on('init-done', async () => {
        try {
            for (let i = 0; i < 100; i+=2) {
                await (async () => {
                    await Dubbo.Customer.getClueById((10000 + i).toString());
                })()
            }
        } catch (e) {
            console.trace('');
        }
    });
