# SLS Log Server

阿里云日志服务(SLS)查询工具 - MCP服务器实现

## 安装

```bash
npm install sls-log-server
```

## 配置

在.env文件中配置阿里云访问密钥:

```ini
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_REGION=cn-hangzhou
ALIYUN_PROJECT=your-project-name
ALIYUN_LOGSTORE=your-logstore-name
```

## 作为MCP服务器使用

1. 安装到MCP配置中
2. 启动服务:
```bash
npm start
```

## API说明

### get_logs 工具

查询日志接口:

参数:
- from: 开始时间戳(秒)
- to: 结束时间戳(秒) 
- line: 返回日志行数(默认10)
- topic: 日志主题(可选)
- query: 查询关键词(可选)

示例:
```json
{
  "from": 1743754321,
  "to": 1743754921,
  "line": 5
}
```

## 开发

```bash
npm run dev  # 开发模式(监听文件变化)
npm run build  # 构建项目
```

## License

MIT
