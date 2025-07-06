import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

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
    
    this.setupExpress();
    this.setupWebSocket();
  }

  setupExpress() {
    this.app.use(cors());
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
    
    // MCP HTTP transport endpoint
    this.app.post('/mcp', async (req, res) => {
      try {
        const request = req.body;
        
        // Create a truncated version for logging
        const logRequest = this.truncateRequestForLogging(request);
        console.log('MCP Request received:', JSON.stringify(logRequest, null, 2));
        
        // Handle MCP protocol messages
        const response = await this.handleMCPRequest(request);
        res.json(response);
      } catch (error) {
        console.error('MCP Request error:', error);
        res.status(500).json({ 
          jsonrpc: '2.0',
          id: req.body.id || null,
          error: { 
            code: -32000,
            message: error.message 
          }
        });
      }
    });
  }

  truncateRequestForLogging(request) {
    // Create a deep copy of the request for logging
    const logRequest = JSON.parse(JSON.stringify(request));
    
    // If this is a display_image call, truncate the imageData
    if (logRequest.method === 'tools/call' && 
        logRequest.params?.name === 'display_image' && 
        logRequest.params?.arguments?.imageData) {
      
      const imageData = logRequest.params.arguments.imageData;
      const truncatedData = imageData.substring(0, 100) + '... [truncated ' + (imageData.length - 100) + ' more characters]';
      logRequest.params.arguments.imageData = truncatedData;
    }
    
    // If this is a display_svg call, truncate the svgData if it's very long
    if (logRequest.method === 'tools/call' && 
        logRequest.params?.name === 'display_svg' && 
        logRequest.params?.arguments?.svgData) {
      
      const svgData = logRequest.params.arguments.svgData;
      if (svgData.length > 500) {
        const truncatedData = svgData.substring(0, 500) + '... [truncated ' + (svgData.length - 500) + ' more characters]';
        logRequest.params.arguments.svgData = truncatedData;
      }
    }
    
    return logRequest;
  }

  async handleMCPRequest(request) {
    const { method, params, id } = request;
    
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'mcp-display-server',
              version: '1.0.0'
            }
          }
        };
      
      case 'notifications/initialized':
        // Client has finished initialization
        return null; // No response needed for notifications
      
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
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
              },
              {
                name: 'display_svg',
                description: 'Display SVG graphics in the browser',
                inputSchema: {
                  type: 'object',
                  properties: {
                    svgData: {
                      type: 'string',
                      description: 'SVG markup as a string'
                    },
                    title: {
                      type: 'string',
                      description: 'Optional title for the SVG',
                      default: ''
                    }
                  },
                  required: ['svgData']
                }
              }
            ]
          }
        };
      
      case 'tools/call':
        const { name, arguments: args } = params;
        
        // Log the connection
        this.logConnection(name, args);
        
        let result;
        switch (name) {
          case 'display_text':
            result = this.handleDisplayText(args);
            break;
          case 'display_image':
            result = this.handleDisplayImage(args);
            break;
          case 'display_svg':
            result = this.handleDisplaySVG(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return {
          jsonrpc: '2.0',
          id: id,
          result: result
        };
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      
      // Send current content to new client
      if (this.displayContent.length > 0) {
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



  handleDisplayText(args) {
    const content = {
      id: uuidv4(),
      type: 'text',
      data: args.text,
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array (newest first)
    this.displayContent.unshift(content);
    
    // Limit to max items
    if (this.displayContent.length > this.maxContentItems) {
      this.displayContent = this.displayContent.slice(0, this.maxContentItems);
    }
    
    this.broadcastToClients({ type: 'content', data: this.displayContent });
    
    return {
      content: [{
        type: 'text',
        text: `Text displayed successfully: ${args.text.substring(0, 100)}${args.text.length > 100 ? '...' : ''}`
      }]
    };
  }

  handleDisplayImage(args) {
    const content = {
      id: uuidv4(),
      type: 'image',
      data: args.imageData,
      mimeType: args.mimeType || 'image/png',
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array (newest first)
    this.displayContent.unshift(content);
    
    // Limit to max items
    if (this.displayContent.length > this.maxContentItems) {
      this.displayContent = this.displayContent.slice(0, this.maxContentItems);
    }
    
    this.broadcastToClients({ type: 'content', data: this.displayContent });
    
    return {
      content: [{
        type: 'text',
        text: `Image displayed successfully (${args.mimeType || 'image/png'})`
      }]
    };
  }

  handleDisplaySVG(args) {
    const content = {
      id: uuidv4(),
      type: 'svg',
      data: args.svgData,
      title: args.title || '',
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array (newest first)
    this.displayContent.unshift(content);
    
    // Limit to max items
    if (this.displayContent.length > this.maxContentItems) {
      this.displayContent = this.displayContent.slice(0, this.maxContentItems);
    }
    
    this.broadcastToClients({ type: 'content', data: this.displayContent });
    
    return {
      content: [{
        type: 'text',
        text: `SVG displayed successfully${args.title ? ` (${args.title})` : ''}`
      }]
    };
  }

  logConnection(toolName, args) {
    let preview;
    
    if (toolName === 'display_text') {
      preview = args.text.substring(0, 50) + (args.text.length > 50 ? '...' : '');
    } else if (toolName === 'display_image') {
      preview = `Image (${args.mimeType || 'image/png'})`;
    } else if (toolName === 'display_svg') {
      preview = `SVG${args.title ? ` (${args.title})` : ''}`;
    } else {
      preview = `${toolName}`;
    }
    
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      tool: toolName,
      preview: preview
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
const server = new MCPDisplayServer();
server.start(process.env.PORT || 8080); 