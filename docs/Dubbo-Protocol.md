#### Dubbo 传输协议

> Dubbo缺省协议采用单一长连接和NIO异步通讯，适合于小数据量大并发的服务调用，以及服务消费者机器数远大于服务提供者机器数的情况。


##### 协议格式: 
    <header><bodydata>
![dubbo 示意图](http://cdn.58qf.com/blog-images/dubbo/dubbo-protocol.png)

```
+---------------------------------------------------------------+
|                                                               |
|                         Flag Byte                             |
|                                                               |
+------------+------------+---------+------+--------------------+
|            |            |         |      |                    |
|     1      |     1      |    1    |   0  |       0010         |
|            |            |         |      |                    |
+---------------------------------------------------------------+
|            |            |         |      |                    |
| is request | is two way | is ping | none | transport protocol |
|            |            |         |      |                    |
+------------+------------+---------+------+--------------------+
```

-
##### 协议头部: 
> header 是16个字节的定长数据, 由以下各部分组成:

1. 两个字节的为协议约定魔数 //short类型的MAGIC = (short) 0xdabb

2. 1个字节的标志位。低四位用来表示消息体数据用的序列化工具的类型（默认hessian），高四位中，第一位为1表示是request请求，第二位为1表示双向传输（即有返回response），第三位为1表示是心跳ping事件。如: `0b11000010`

3. 1个字节的状态位，消息类型为 `response` 时，设置请求响应状态, 详见 `src/enum/ResponseStatus.ts`

4. 8个字节的消息 id , 64位long类型, So, 然而 `node` 里面并不支持.

5. 4个字节表达消息体`body`长度, 32位int类型

-
 
##### 协议消息体:
 
> 消息体是本次远程调用的真正内容, 采用 `Hessian` 序列化, 具体由以下各部分组成:

1. dubbo的版本信息

2. 服务接口名如：com.user.UserService

3. 服务的版本号

4. 调用服务的方法名, 如: `getUserInfoById`

5. 调服务的方法的参数描述符如：[int.class, boolean[].class,Object.class] => "I[ZLjava/lang/Object;"

6. 遍历传输的参数值逐个序列化

7. 将整个附属信息map对象attachments序列化

以下是`java`客户端中序列化Request的body的具体代码：

```
protected void encodeRequestData(Channel channel, ObjectOutput out, Object data){
    RpcInvocation inv = (RpcInvocation) data;
    out.writeUTF(inv.getAttachment(Constants.DUBBO_VERSION_KEY,DUBBO_VERSION));
    out.writeUTF(inv.getAttachment(Constants.PATH_KEY));
    out.writeUTF(inv.getAttachment(Constants.VERSION_KEY));
    out.writeUTF(inv.getMethodName());
    out.writeUTF(ReflectUtils.getDesc(inv.getParamterTypes()));
    Object[] args = inv.getArguments();
    if(args != null)
    for(int i=0;i < args.length;i++){
        out.writeObject(encodeInvocationArgument(channel,inv,i));
    }
    out.writeObject(inv.getAttachments());
}
```

以下为`java`服务端中序列化Response的具体代码:

```
protected void encodeResponseData(Channel channel, ObjectOutput out, Object data) {
    Result result = (Result) data;
    Throwable th = result.getException();
    if(th == null){
        Object ret = result.getValue();
        if(ret == null){
            out.writeByte(RESPONSE_NULL_VALUE);
        } else {
            out.writeByte(RESPONSE_VALUE);
            out.writeByte(ret);
        }
    } else {
        out.writeByte(RESPONSE_WITH_EXCEPTION);
        out.writeByte(th);
    }
}
```


编码整体流程：

1. 判断消息类型是Request， Resonse如果不是调父类（可能是string telnet类型）

2. 获取序列化方式, 可以同URL指定，没有默认为hessian方式

3. 构建存储header的字节数组，大小是16

4. Header数组前两位写入dubbo协议魔数(short) `[0xda,0xbb]`

5. Header数组第三位， 一个字节4位与或方式存储，

    1. 哪种序列化方式

    2. 请求还是响应消息

    3. 请求时twoway还是oneway

    4. 是心跳，还是正常消息

    5. 如果是response， 响应的状态

6. 获取buffer的写入位置writerIndex， 加上消息头长度16，重新设置buffer的写入位置，这里是消息body的写入位置， 因为后面是先写body，要把header的位置空出来

7. 序列化消息body， （request， response参考前面的）写入buffer

8. 计算消息体大小writerIndex – startIndex

9. 检查消息体是否超过限制大小

10. 重置writeIndex就是第6点获取的值

11. 给消息头数组最后四位写入消息消body长度值int类型

12. 向buffer写入消息头数据

13. Buffer设置writerIndex=savedWriteIndex+ HEADER_LENGTH + len

 

 

解码整体流程：

1. 从channle获取可读取的字节数readable

2. readable跟header_length取小构建字节数组header[], readable < header_length说明不是一个全的dubbo协议消息(所以后面要判断消息头魔数)，或者只是一个telnet消息

3. 如果判断header[]的第一个和第二个字节不是dubbo协议魔数

    1. 如果可读取字节readable大于header_length, 重新构建header[], 读取全部可读取readable数据到header
    2. 遍历header中的字节判断中间是否有dubbo协议的魔数0xdabb， 如果有说明魔数开始的是dubbo协议的消息。重新设置buffer的读取位置从魔数开始, 截取header[]中从头开始到魔术位置的数据
    3. 调父类解码，可能就是telnet字符串解码

4. 如果是dubbo协议的消息 readable < header_length 说明读取header[]数据不全， 返回NEED_MORE_INPUT说明需要读取更多数据

5. 读取header[]最后四位一个int的数据，bodydata的长度len

6. 计算总消息大小tt = len + body_length

7. 如果可读取数据readable < tt, 数据不够返回NEED_MORE_INPUT

8. 由buffer和len构建ChannelBufferInputStream， 后面序列化工具会使用

9. 以下是解码消息体body data过程

-

1. header[2] 第三位获取标志位

2. 从标志位判断采用哪种序列化方式，获取具体的序列化工具

3. 读取header[4]开始的8位， 获取消息的id

4. 根据标志位判读消息为类型(请求 or 响应)
    1. 响应类型
        1. 构建resonse对象 new Response(id)
        2. 根据标志位如果是心跳，给response对象设置Event类型
        3. 从header[3]获取消息响应状态，给 response对象设置消息状态
        4. 如果是事件消息直接利用反序列化工具读取对象
        5. 如果不是构建消息接口DecodeableRpcResult result 序列化工具读取请求结果并设置到result的value属性上
        6. 如果响应状态不是ok， 反序列化errMessage并设置给response
    2. 请求类型
        1. 根据id构建Request(id)
        2. 根据状态位设置请求模式 twoway还是oneway
        3. 根据状态位设置请求是否是事件类型
        4. 如果是事件类型直接通过饭序列化工具读取
        5. 如果不是事件请求，构建DecodeableRpcInvocation


参考:
[Dubbo原理解析-编码解码之编码解码流程](http://blog.csdn.net/quhongwei_zhanqiu/article/details/41702829)
[dubbo协议报文格式](http://www.bijishequ.com/detail/526770)


