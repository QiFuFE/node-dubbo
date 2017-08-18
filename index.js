/**
 * Created by panzhichao on 16/8/2.
 */
'use strict';

const zookeeper = require('node-zookeeper-client');
const reg = require('./src/Register');
const Service = require('./src/Service');
require('./utils');

// let SERVICE_LENGTH = 0;

/**
 * @param {Object} opt {conn:'zk.dev.pajkdc.com:2181',
 * dubbo:{version:PZC,
 *        dversion:2.3.4.6,
 *        group:'xxx'},
 * dependencies:{}}
 * @constructor
 */

class NZD {

  constructor({
                dubboVer,
                application,
                register,
                root = 'dubbo',
                dependencies = {}
              }) {

    this.dubboVer = dubboVer;
    this.application = application;
    this.root = root;
    // SERVICE_LENGTH = Object.keys(dependencies).length;
    this.client = zookeeper.createClient(register, {
      sessionTimeout: 30000,
      spinDelay: 1000,
      retries: 5
    });

    this.client.connect();
    this.client.once('connected', () => {
      Object.keys(dependencies).forEach(key => {
        NZD.prototype[key] = new Service(this.client, this.dubboVer, dependencies[key], Object.keys(dependencies).length,this.root);
      });
      this._consumer();
    });
  }

}

NZD.prototype._consumer = reg.consumer;

module.exports = NZD;
