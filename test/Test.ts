import NZD from '../index';

const {String: jString} = require('js-to-java');

const dependencies = {
    // Customer: {
    //     interface: 'com.qf58.crm.extend.module.service.ClueService',
    //     timeout: 6000,
    //     group: 'beta-a',
    //     methodSignature: {
    //         getClueById: (id) => [jLong(id)],
    //     },
    // },
    Demo: {
        interface: 'com.alibaba.dubbo.demo.DemoService',
        timeout: 6000,
        // group: 'dubbo',
        methodSignature: {
            sayHello: (name) => [jString(name)],
        }
    }
};

// opt.java = require('js-to-java');

const Dubbo = new NZD({
    application: {name: 'node-consumer'},
    register: '172.16.11.118:2181',
    dubboVersion: '2.5.3',
    // root: 'beta-a',
}, dependencies)
    .on('init-done', () => {
        let i = 0;
        setInterval(async () => {
            try {
                await Dubbo.Demo.sayHello('zhangchuang' + i++);
            } catch (e) {
                console.info(e.toString());
            }
            // console.log(await Dubbo.Customer.getClueById(('l').toString()));
            // console.count('remote invoke success');
        });
    });


setInterval(() => {
    const {rss, heapTotal, heapUsed} = process.memoryUsage();
    console.info(`rss => ${rss / 1024 / 1024}
    heapTotal => ${heapTotal / 1024 / 1024}
    heapUsed => ${heapUsed / 1024 / 1024}`);
}, 10000);