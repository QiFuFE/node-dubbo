/**
 * Created by panzhichao on 16/6/30.
 */
'use strict';
import {format, UrlObject} from 'url';
import * as os from 'os';
import * as Path from 'path';
import {promisify} from 'util';
import {Client, Stat, CreateMode} from "node-zookeeper-client";
import NZD from "../index";

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
        const addr = interfaces[nic].find(({family, address}) => {
            return family.toLowerCase() === 'ipv4' && !isLoopback(address);
        });
        return addr ? addr.address : null;
    }).filter(Boolean)[0];
}

/**
 * 检查consumer目录是否存在,存在直接返回,不存在则创建consumers目录节点
 * @param client
 * @param path
 * @return {Promise<void>}
 */
async function createConsumers(client: Client, path: string): Promise<void> {
    let cpath = Path.dirname(path);
    let isExist = promisify<string, Stat>(client.exists as (path, cb) => void).bind(client);
    if (await isExist(cpath)) {
        return;
    }
    let create = promisify<string, number, void>(client.create as (path, mode, cb) => void).bind(client);
    return create(cpath, CreateMode.PERSISTENT);
}

export default function consumer(this: NZD, dependencies: Dependencies) {
    const host = ip();

    const info: UrlObject = {
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

    Object.entries(dependencies).map(([, {interface: interfaceS, group, version,}]) => {
        info.pathname = interfaceS;
        info.query['interface'] = interfaceS;
        info.query['revision'] = info.query['version'] = version;
        info.query['group'] = group;
        return `/${this.root}/${interfaceS}/consumers/${encodeURIComponent(format(info))}`;
    })
        .forEach(async path => {
            //检查consumers目录状态，确保存在之后再创建consumers目录下面的节点
            try {
                await createConsumers(this.client, path);
                let isExist = promisify<string, Stat>(this.client.exists as (path, cb) => void).bind(this.client);
                if (await isExist(path)) {
                    console.log('Node exists.');
                    return;
                }
                let create = promisify<string, number, void>(this.client.create as (path, mode, cb) => void).bind(this.client);
                return create(path, CreateMode.EPHEMERAL);
            } catch (e) {
                console.error(e);
            }
        });
}
