///<reference path="index.d.ts"/>
/**
 * Created by panzhichao on 16/8/2.
 */
'use strict';
import * as EventEmitter from 'events';
import {createClient, Client} from 'node-zookeeper-client';
import consumer from './src/Register';
import Service from './src/Service';


// let SERVICE_LENGTH = 0;

/**
 * @param {Object} opt {conn:'zk.dev.pajkdc.com:2181',
 * dubbo:{version:PZC,
 *        dversion:2.3.4.6,
 *        group:'xxx'},
 * dependencies:{}}
 * @constructor
 */

export default class NZD extends EventEmitter {
    client: Client;
    root: string;
    dubboVersion: string;
    application: { name: string };
    private _consumer = consumer;
    [serviceName: string]: any;

    /**
     * @param {Object} options 配置对象
     *  @param {Object} application
     *  @param {String} register
     *  @param {String} root
     * @param {Object} dependencies
     */
    constructor({
                    dubboVersion = '2.5.3',
                    application,
                    register,
                    root = 'dubbo',
                }: NZDOptions, dependencies: Dependencies) {
        super();
        this.dubboVersion = dubboVersion;
        this.application = application;
        this.root = root;
        this.client = createClient(register, {
            sessionTimeout: 30000,
            spinDelay: 1000,
            retries: 5,
        });

        this.client.connect();
        this.client.once('connected', () => {
            Object.keys(dependencies).forEach(key => {
                NZD.prototype[key] = new Service(this, dependencies[key], Object.keys(dependencies).length);
            });
            this._consumer(dependencies);
        });
    }

}


