/**
 * Created by panzhichao on 16/6/30.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const os = require("os");
const Path = require("path");
const util_1 = require("util");
const node_zookeeper_client_1 = require("node-zookeeper-client");
function isLoopback(addr) {
    return /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/
        .test(addr) ||
        /^fe80::1$/.test(addr) ||
        /^::1$/.test(addr) ||
        /^::$/.test(addr);
}
function ip() {
    const interfaces = os.networkInterfaces();
    return Object.keys(interfaces).map(nic => {
        const addresses = interfaces[nic].filter(({ family, address }) => {
            return family.toLowerCase() === 'ipv4' && !isLoopback(address);
        });
        return addresses.length ? addresses[0].address : undefined;
    }).filter(Boolean)[0];
}
/**
 * 检查consumer目录是否存在,存在直接返回,不存在则创建consumers目录节点
 * @param client
 * @param path
 * @return {Promise<void>}
 */
async function createConsumers(client, path) {
    let cpath = Path.dirname(path);
    let isExist = util_1.promisify(client.exists).bind(client);
    if (await isExist(cpath)) {
        return;
    }
    let create = util_1.promisify(client.create).bind(client);
    return create(cpath, node_zookeeper_client_1.CreateMode.PERSISTENT);
}
function consumer(dependencies) {
    const host = ip();
    const info = {
        protocol: 'consumer',
        slashes: true,
        host,
        query: {
            application: this.application.name,
            category: 'consumers',
            check: 'false',
            dubbo: this.dubboVersion,
            'interface': '',
            revision: '',
            version: '',
            side: 'consumer',
            timestamp: Date.now().toString()
        }
    };
    Object.entries(dependencies).map(([, { interface: interfaceS, group, version, }]) => {
        info.pathname = interfaceS;
        info.query['interface'] = interfaceS;
        info.query['revision'] = info.query['version'] = version;
        info.query['group'] = group;
        return `/${this.root}/${interfaceS}/consumers/${encodeURIComponent(url_1.format(info))}`;
    })
        .forEach(async (path) => {
        //检查consumers目录状态，确保存在之后再创建consumers目录下面的节点
        try {
            await createConsumers(this.client, path);
            let isExist = util_1.promisify(this.client.exists).bind(this.client);
            if (await isExist(path)) {
                console.log('Node exists.');
                return;
            }
            let create = util_1.promisify(this.client.create).bind(this.client);
            return create(path, node_zookeeper_client_1.CreateMode.EPHEMERAL);
        }
        catch (e) {
            console.error(e);
        }
    });
}
exports.default = consumer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJSZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUdILFlBQVksQ0FBQzs7QUFDYiw2QkFBc0M7QUFDdEMseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFDL0IsaUVBQStEO0FBRy9ELG9CQUFvQixJQUFJO0lBQ3BCLE1BQU0sQ0FBQywwREFBMEQ7U0FDeEQsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNmLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQUVEO0lBQ0ksTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3JDLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUMsRUFBRSxFQUFFO1lBQzNELE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEtBQUssTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUMvRCxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsS0FB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