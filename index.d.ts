// dependencies - ，必填
// Foo - 自定义名称，这里方便起见用Foo作为事例，必填
// interface - ，必填
// version - 版本号，默认2.5.3.6
// timeout	-	超时时间，默认6000
// group	-	分组
// methodSignature	-	方法签名
interface NZDOptions {
    /**
     * dubbo版本
     */
    dubboVersion: string;
    application: {
        /**
         * 项目名称
         */
        name: string;
    };
    /**
     * zookeeper服务地址
     */
    register: string;
    group?: string;
    /**
     * 注册到zookeeper上的根节点名称
     */
    root?: string;
}

/**
 * 依赖的服务集
 */
interface Dependencies {
    [name: string]: Dependent;
}

/**
 *
 */
interface Dependent {
    /**
     * 服务地址
     */
    interface: string;
    /**
     * 版本号
     */
    version?: string;

    /**
     * 超时时间
     */
    timeout: number;
    /**
     * 分组
     */
    group: string;
    /**
     * 方法签名
     */
    methodSignature: {
        [signature: string]: Function;
    };
}
