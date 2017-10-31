///<reference path="index.d.ts"/>
/**
 * Created by panzhichao on 16/8/2.
 * todo: 初始化完毕
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require("events");
const node_zookeeper_client_1 = require("node-zookeeper-client");
const Register_1 = require("./src/Register");
const Service_1 = require("./src/Service");
// let SERVICE_LENGTH = 0;
/**
 * @param {Object} opt {conn:'zk.dev.pajkdc.com:2181',
 * dubbo:{version:PZC,
 *        dversion:2.3.4.6,
 *        group:'xxx'},
 * dependencies:{}}
 * @constructor
 */
class NZD extends EventEmitter {
    /**
     * @param {Object} options 配置对象
     *  @param {Object} application
     *  @param {String} register
     *  @param {String} group
     *  @param {String} root
     * @param {Object} dependencies
     */
    constructor({ dubboVersion = '2.5.3', application, register, group, root, }, dependencies) {
        super();
        this.root = 'dubbo';
        this._consumer = Register_1.default;
        this.dubboVersion = dubboVersion;
        this.application = application;
        this.group = group;
        this.root = root;
        this.client = node_zookeeper_client_1.createClient(register, {
            sessionTimeout: 30000,
            spinDelay: 1000,
            retries: 5,
        });
        this.client.connect();
        this.client.once('connected', () => {
            Object.keys(dependencies).forEach(key => {
                NZD.prototype[key] = new Service_1.default(this, dependencies[key], Object.keys(dependencies).length);
            });
            this._consumer(dependencies);
        });
    }
}
exports.default = NZD;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpQ0FBaUM7QUFDakM7OztHQUdHO0FBQ0gsWUFBWSxDQUFDOztBQUNiLHVDQUF1QztBQUN2QyxpRUFBMkQ7QUFDM0QsNkNBQXNDO0FBQ3RDLDJDQUFvQztBQUdwQywwQkFBMEI7QUFHMUI7Ozs7Ozs7R0FPRztBQUVILFNBQXlCLFNBQVEsWUFBWTtJQVN6Qzs7Ozs7OztPQU9HO0lBQ0gsWUFBWSxFQUNJLFlBQVksR0FBRyxPQUFPLEVBQ3RCLFdBQVcsRUFDWCxRQUFRLEVBQ1IsS0FBSyxFQUNMLElBQUksR0FDSyxFQUFFLFlBQTBCO1FBQ2pELEtBQUssRUFBRSxDQUFDO1FBdEJaLFNBQUksR0FBVyxPQUFPLENBQUM7UUFJZixjQUFTLEdBQUcsa0JBQVEsQ0FBQztRQW1CekIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxvQ0FBWSxDQUFDLFFBQVEsRUFBRTtZQUNqQyxjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUUsSUFBSTtZQUNmLE9BQU8sRUFBRSxDQUFDO1NBQ2IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNwQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksaUJBQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEcsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUVKO0FBNUNELHNCQTRDQyJ9