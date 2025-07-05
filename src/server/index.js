import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class MCPDisplayServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.mcpServer = new Server({
      name: 'mcp-display-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.clients = new Map();
    this.connectionLog = [];
    this.displayContent = null;
    
    this.setupExpress();
    this.setupWebSocket();
    this.setupMCPServer();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.static('dist'));
    
    // API endpoints
    this.app.get('/api/content', (req, res) => {
      res.json({ content: this.displayContent });
    });
    
    this.app.get('/api/connections', (req, res) => {
      res.json({ connections: this.connectionLog });
    });
    
    this.app.post('/api/clear', (req, res) => {
      this.displayContent = null;
      this.broadcastToClients({ type: 'clear' });
      res.json({ success: true });
    });
    
    // MCP HTTP transport endpoint
    this.app.post('/mcp', async (req, res) => {
      try {
        const request = req.body;
        const response = await this.mcpServer.request(request);
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      
      // Send current content to new client
      if (this.displayContent) {
        ws.send(JSON.stringify({
          type: 'content',
          data: this.displayContent
        }));
      }
      
      ws.on('close', () => {
        this.clients.delete(clientId);
      });
    });
  }

  setupMCPServer() {
    // Register tools
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'display_text',
            description: 'Display text content in the browser',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'The text to display'
                }
              },
              required: ['text']
            }
          },
          {
            name: 'display_image',
            description: 'Display base64 encoded image in the browser',
            inputSchema: {
              type: 'object',
              properties: {
                imageData: {
                  type: 'string',
                  description: 'Base64 encoded image data'
                },
                mimeType: {
                  type: 'string',
                  description: 'MIME type of the image (e.g., image/png, image/jpeg)',
                  default: 'image/png'
                }
              },
              required: ['imageData']
            }
          }
        ]
      };
    });

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Log the connection
      this.logConnection(name, args);
      
      switch (name) {
        case 'display_text':
          return this.handleDisplayText(args);
        case 'display_image':
          return this.handleDisplayImage(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  handleDisplayText(args) {
    const content = {
      type: 'text',
      data: args.text,
      timestamp: new Date().toISOString()
    };
    
    this.displayContent = content;
    this.broadcastToClients({ type: 'content', data: content });
    
    return {
      content: [{
        type: 'text',
        text: `Text displayed successfully: ${args.text.substring(0, 100)}${args.text.length > 100 ? '...' : ''}`
      }]
    };
  }

  handleDisplayImage(args) {
    const content = {
      type: 'image',
      data: args.imageData,
      mimeType: args.mimeType || 'image/png',
      timestamp: new Date().toISOString()
    };
    
    this.displayContent = content;
    this.broadcastToClients({ type: 'content', data: content });
    
    return {
      content: [{
        type: 'text',
        text: `Image displayed successfully (${args.mimeType || 'image/png'})`
      }]
    };
  }

  logConnection(toolName, args) {
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      tool: toolName,
      preview: toolName === 'display_text' 
        ? args.text.substring(0, 50) + (args.text.length > 50 ? '...' : '')
        : `Image (${args.mimeType || 'image/png'})`
    };
    
    this.connectionLog.unshift(logEntry);
    
    // Keep only last 100 entries
    if (this.connectionLog.length > 100) {
      this.connectionLog = this.connectionLog.slice(0, 100);
    }
    
    this.broadcastToClients({ type: 'connection', data: logEntry });
  }

  broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  start(port = 8080) {
    this.server.listen(port, () => {
      console.log(`MCP Display Server running on port ${port}`);
      console.log(`Web interface: http://localhost:${port}`);
      console.log(`MCP HTTP endpoint: http://localhost:${port}/mcp`);
    });
  }
}

// Start the server
const server = new MCPDisplayServer();
server.start(process.env.PORT || 8080); 