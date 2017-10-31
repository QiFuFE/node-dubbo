"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const { Long: jLong } = require('js-to-java');
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
const Dubbo = new index_1.default({
    application: { name: 'node-consumer' },
    register: '172.16.11.118:2181',
    dubboVersion: '2.5.3',
    root: 'beta-a',
}, dependencies)
    .on('init-done', async (serviceLen) => {
    console.log(this);
    console.log(serviceLen);
    try {
        console.log(await Dubbo.Customer.getClueById('10002'));
    }
    catch (e) {
        console.error(e);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxvQ0FBMkI7QUFFM0IsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFNUMsTUFBTSxZQUFZLEdBQUc7SUFDakIsUUFBUSxFQUFFO1FBQ04sU0FBUyxFQUFFLGdEQUFnRDtRQUMzRCxPQUFPLEVBQUUsSUFBSTtRQUNiLEtBQUssRUFBRSxRQUFRO1FBQ2YsZUFBZSxFQUFFO1lBQ2IsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNuQztLQUNKO0NBQ0osQ0FBQztBQUVGLG9DQUFvQztBQUVwQyxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQUcsQ0FBQztJQUNsQixXQUFXLEVBQUUsRUFBQyxJQUFJLEVBQUUsZUFBZSxFQUFDO0lBQ3BDLFFBQVEsRUFBRSxvQkFBb0I7SUFDOUIsWUFBWSxFQUFFLE9BQU87SUFDckIsSUFBSSxFQUFFLFFBQVE7Q0FDakIsRUFBRSxZQUFZLENBQUM7S0FDWCxFQUFFLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBQyxVQUFVLEVBQUMsRUFBRTtJQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEIsSUFBSSxDQUFDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyJ9