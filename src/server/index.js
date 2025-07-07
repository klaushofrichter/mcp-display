import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

class MCPDisplayServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });
    
    this.clients = new Map();
    this.connectionLog = [];
    this.displayContent = [];
    this.maxContentItems = 100;
    this.startTime = new Date();
    this.transports = new Map();
    this.mcpServer = null;
  }

  async createMcpServer() {
    const mcpServer = new McpServer({
      name: 'mcp-display-server',
      version: '1.0.0',
    });

    mcpServer.registerTool(
      'display_text',
      {
        description: 'Display text content in the browser',
        inputSchema: z.object({
          text: z.string().describe('The text to display'),
        }),
      },
      async (args) => {
        this.logConnection('display_text', args);
        return this.handleDisplayText(args);
      }
    );

    mcpServer.registerTool(
      'display_image',
      {
        description: 'Display base64 encoded image in the browser',
        inputSchema: z.object({
          imageData: z.string().describe('Base64 encoded image data'),
          mimeType: z.string().describe('MIME type of the image (e.g., image/png, image/jpeg)').default('image/png'),
        }),
      },
      async (args) => {
        this.logConnection('display_image', args);
        return this.handleDisplayImage(args);
      }
    );

    mcpServer.registerTool(
      'display_svg',
      {
        description: 'Display SVG graphics in the browser',
        inputSchema: z.object({
          svgData: z.string().describe('SVG markup as a string'),
          title: z.string().describe('Optional title for the SVG').default(''),
        }),
      },
      async (args) => {
        this.logConnection('display_svg', args);
        return this.handleDisplaySVG(args);
      }
    );
    return mcpServer;
  }

  setupExpress() {
    this.app.use(cors({
      exposedHeaders: ['mcp-session-id'],
    }));
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.static('dist'));
    
    // API endpoints
    this.app.get('/api/health', (req, res) => {
      const uptime = Math.floor((new Date() - this.startTime) / 1000);
      res.json({
        status: 'healthy',
        uptime: `${uptime}s`,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        server: 'mcp-display-server',
        stats: {
          contentItems: this.displayContent.length,
          connections: this.connectionLog.length,
          websocketClients: this.clients.size
        }
      });
    });
    
    this.app.get('/api/content', (req, res) => {
      res.json({ content: this.displayContent });
    });
    
    this.app.get('/api/connections', (req, res) => {
      res.json({ connections: this.connectionLog });
    });
    
    this.app.post('/api/clear', (req, res) => {
      this.displayContent = [];
      this.broadcastToClients({ type: 'clear' });
      res.json({ success: true });
    });
    
    this.app.post('/mcp', async (req, res) => {
      console.log('--- MCP Request Received ---');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Body:', JSON.stringify(req.body, null, 2));
      console.log('--------------------------');
      
      const sessionId = req.headers['mcp-session-id'];
      let transport;

      if (typeof sessionId === 'string' && this.transports.has(sessionId)) {
        transport = this.transports.get(sessionId);
      } else if (!sessionId && req.body?.method === 'initialize') {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: uuidv4,
          onsessioninitialized: (newSessionId) => {
            this.transports.set(newSessionId, transport);
            transport.onclose = () => {
              this.transports.delete(newSessionId);
            };
          },
        });
        await this.mcpServer.connect(transport);
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    });

    const handleSessionRequest = async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      if (typeof sessionId !== 'string' || !this.transports.has(sessionId)) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      const transport = this.transports.get(sessionId);
      await transport.handleRequest(req, res);
    };
    
    this.app.get('/mcp', handleSessionRequest);
    this.app.delete('/mcp', handleSessionRequest);
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      
      ws.on('close', () => {
        this.clients.delete(clientId);
      });
      
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });
    });
  }

  handleDisplayText(args) {
    const { text } = args;
    const contentItem = {
      id: uuidv4(),
      type: 'text',
      data: text,
      timestamp: new Date().toISOString()
    };
    
    this.displayContent.unshift(contentItem);
    if (this.displayContent.length > this.maxContentItems) {
      this.displayContent.pop();
    }
    
    this.broadcastToClients({
      type: 'content',
      data: [contentItem]
    });
    
    return {
      content: [{ type: 'text', text: `Displayed text of length ${text.length}` }]
    };
  }
  
  handleDisplayImage(args) {
    const { imageData, mimeType } = args;
    const contentItem = {
      id: uuidv4(),
      type: 'image',
      data: imageData,
      mimeType: mimeType,
      timestamp: new Date().toISOString()
    };
    
    this.displayContent.unshift(contentItem);
    if (this.displayContent.length > this.maxContentItems) {
      this.displayContent.pop();
    }
    
    this.broadcastToClients({
      type: 'content',
      data: [contentItem]
    });
    
    return {
      content: [{ type: 'text', text: 'Image displayed' }]
    };
  }

  handleDisplaySVG(args) {
    const { svgData, title } = args;
    const contentItem = {
      id: uuidv4(),
      type: 'svg',
      data: svgData,
      title: title,
      timestamp: new Date().toISOString()
    };

    this.displayContent.unshift(contentItem);
    if (this.displayContent.length > this.maxContentItems) {
      this.displayContent.pop();
    }
    
    this.broadcastToClients({
      type: 'content',
      data: [contentItem]
    });

    return {
      content: [{ type: 'text', text: 'SVG displayed' }]
    };
  }

  logConnection(toolName, args) {
    const truncatedArgs = JSON.parse(JSON.stringify(args));
    
    if (toolName === 'display_image' && truncatedArgs.imageData) {
      const imageData = truncatedArgs.imageData;
      if (imageData.length > 100) {
        truncatedArgs.imageData = imageData.substring(0, 100) + '... [truncated ' + (imageData.length - 100) + ' more characters]';
      }
    }
    
    if (toolName === 'display_svg' && truncatedArgs.svgData) {
      const svgData = truncatedArgs.svgData;
      if (svgData.length > 500) {
        truncatedArgs.svgData = svgData.substring(0, 500) + '... [truncated ' + (svgData.length - 500) + ' more characters]';
      }
    }

    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      tool: toolName,
      args: truncatedArgs
    };
    
    this.connectionLog.unshift(logEntry);
    if (this.connectionLog.length > this.maxContentItems) {
      this.connectionLog.pop();
    }
    
    this.broadcastToClients({
      type: 'connection',
      data: [logEntry]
    });
  }
  
  broadcastToClients(message) {
    console.log(`Broadcasting message type '${message.type}' to ${this.clients.size} clients.`);
    const messageString = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageString);
      }
    }
  }

  async start(port = 8080) {
    this.mcpServer = await this.createMcpServer();
    this.setupExpress();
    this.setupWebSocket();

    this.server.listen(port, () => {
      console.log(`MCP Display Server running on http://localhost:${port}`);
      
      // In development, show the correct URLs (through Vite proxy)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Web interface: http://localhost:3000`);
        console.log(`MCP HTTP endpoint: http://localhost:3000/mcp`);
        console.log(`API endpoints: http://localhost:3000/api/*`);
        console.log(`(Proxied from Vite dev server to port ${port})`);
      } else {
        console.log(`Web interface: http://localhost:${port}`);
        console.log(`MCP HTTP endpoint: http://localhost:${port}/mcp`);
      }
    });
  }
}

// Start the server
const mcpDisplayServer = new MCPDisplayServer();
mcpDisplayServer.start(process.env.PORT || 8080); 