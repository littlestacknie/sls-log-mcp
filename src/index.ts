#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import ALY from 'aliyun-sdk';

// 从环境变量获取配置
const accessKeyId = process.env.SLS_ACCESS_KEY_ID;
const secretAccessKey = process.env.SLS_SECRET_ACCESS_KEY;
const endpoint = process.env.SLS_ENDPOINT;
const projectName = process.env.SLS_PROJECT_NAME;
const logstoreName = process.env.SLS_LOGSTORE_NAME;

if (!accessKeyId || !secretAccessKey) {
  throw new Error('SLS_ACCESS_KEY_ID and SLS_SECRET_ACCESS_KEY environment variables are required');
}

// 配置日志服务客户端
const sls = new ALY.SLS({
  accessKeyId,
  secretAccessKey,
  endpoint,
  apiVersion: '2015-06-01'
});

class SLSLogServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'sls-log-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // 错误处理
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_logs',
          description: '获取阿里云日志服务(SLS)的日志',
          inputSchema: {
            type: 'object',
            properties: {
              from: {
                type: 'number',
                description: '开始时间戳(秒)',
              },
              to: {
                type: 'number',
                description: '结束时间戳(秒)',
              },
              line: {
                type: 'number',
                description: '返回日志行数',
                default: 10
              },
              topic: {
                type: 'string',
                description: '日志主题',
                default: ''
              },
              query: {
                type: 'string',
                description: '查询关键词',
                default: ''
              }
            },
            required: ['from', 'to'],
          },
        },
      ],
    }));

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'get_logs') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `未知工具: ${request.params.name}`
        );
      }

      // 定义工具参数类型
      interface LogQueryParams {
        from: number;
        to: number;
        line?: number;
        topic?: string;
        query?: string;
      }

      // 验证参数类型
      const args = request.params.arguments;
      if (!args || typeof args !== 'object' || 
          typeof args.from !== 'number' || 
          typeof args.to !== 'number') {
        throw new McpError(
          ErrorCode.InvalidParams,
          '参数必须包含from和to数字类型字段'
        );
      }

      // 安全类型转换
      const safeArgs = args as unknown as LogQueryParams;
      const { from, to, line = 10, topic = '', query = '' } = safeArgs;

      try {
        const params = {
          projectName,
          logStoreName: logstoreName,
          from,
          to,
          topic,
          query,
          line
        };

        const logs = await new Promise((resolve, reject) => {
          sls.getLogs(params, (err: any, resData: any) => {
            if (err) {
              console.error('获取日志失败:', err);
              reject(err);
            }
            resolve(resData);
          });
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify((logs as any).body),
            },
          ],
        };
      } catch (error) {
        if (error instanceof Error) {
          return {
            content: [
              {
                type: 'text',
                text: `获取日志失败: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SLS日志MCP服务器已启动');
  }
}

const server = new SLSLogServer();
server.run().catch(console.error);


