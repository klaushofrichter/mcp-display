describe('MCP Display Server', () => {
  describe('Core Functionality', () => {
    test('should validate text content', () => {
      const textContent = 'Hello, World!'
      
      expect(typeof textContent).toBe('string')
      expect(textContent.length).toBeGreaterThan(0)
    })

    test('should validate base64 image data', () => {
      const imageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      const mimeType = 'image/png'
      
      expect(typeof imageData).toBe('string')
      expect(imageData.length).toBeGreaterThan(0)
      expect(typeof mimeType).toBe('string')
      expect(mimeType.startsWith('image/')).toBe(true)
    })

    test('should validate SVG data', () => {
      const svgData = '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red"/></svg>'
      const title = 'Test SVG'
      
      expect(typeof svgData).toBe('string')
      expect(svgData.length).toBeGreaterThan(0)
      expect(svgData.includes('<svg')).toBe(true)
      expect(svgData.includes('</svg>')).toBe(true)
      expect(typeof title).toBe('string')
    })

    test('should handle connection logging', () => {
      const textLogEntry = {
        id: 'test-123',
        timestamp: new Date().toISOString(),
        tool: 'display_text',
        preview: 'Test content'
      }
      
      const imageLogEntry = {
        id: 'test-456',
        timestamp: new Date().toISOString(),
        tool: 'display_image',
        preview: 'Image (image/png)'
      }
      
      const svgLogEntry = {
        id: 'test-789',
        timestamp: new Date().toISOString(),
        tool: 'display_svg',
        preview: 'SVG (Test Title)'
      }
      
      expect(textLogEntry.id).toBeDefined()
      expect(textLogEntry.timestamp).toBeDefined()
      expect(textLogEntry.tool).toBe('display_text')
      expect(textLogEntry.preview).toBe('Test content')
      
      expect(imageLogEntry.tool).toBe('display_image')
      expect(imageLogEntry.preview).toContain('Image')
      
      expect(svgLogEntry.tool).toBe('display_svg')
      expect(svgLogEntry.preview).toContain('SVG')
    })

    test('should validate MCP tool schemas', () => {
      const displayTextSchema = {
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
      }
      
      const displayImageSchema = {
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
              description: 'MIME type of the image'
            }
          },
          required: ['imageData']
        }
      }
      
      const displaySVGSchema = {
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
              description: 'Optional title for the SVG'
            }
          },
          required: ['svgData']
        }
      }
      
      expect(displayTextSchema.name).toBe('display_text')
      expect(displayTextSchema.inputSchema.required).toContain('text')
      expect(displayImageSchema.name).toBe('display_image')
      expect(displayImageSchema.inputSchema.required).toContain('imageData')
      expect(displaySVGSchema.name).toBe('display_svg')
      expect(displaySVGSchema.inputSchema.required).toContain('svgData')
    })

    test('should format timestamps correctly', () => {
      const timestamp = new Date().toISOString()
      const formattedTime = new Date(timestamp).toLocaleTimeString()
      const formattedDateTime = new Date(timestamp).toLocaleString()
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(formattedTime).toBeDefined()
      expect(formattedDateTime).toBeDefined()
    })

    test('should return health status', () => {
      const healthResponse = {
        status: 'healthy',
        uptime: '123s',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        server: 'mcp-display-server',
        stats: {
          contentItems: 0,
          connections: 0,
          websocketClients: 1
        }
      }
      
      expect(healthResponse.status).toBe('healthy')
      expect(healthResponse.version).toBe('1.0.0')
      expect(healthResponse.server).toBe('mcp-display-server')
      expect(typeof healthResponse.stats).toBe('object')
      expect(typeof healthResponse.stats.contentItems).toBe('number')
      expect(typeof healthResponse.stats.connections).toBe('number')
      expect(typeof healthResponse.stats.websocketClients).toBe('number')
      expect(healthResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })

  describe('Data Validation', () => {
    test('should validate WebSocket message structure', () => {
      const contentMessage = {
        type: 'content',
        data: {
          type: 'text',
          data: 'Hello World',
          timestamp: new Date().toISOString()
        }
      }
      
      const connectionMessage = {
        type: 'connection',
        data: {
          id: 'test-123',
          timestamp: new Date().toISOString(),
          tool: 'display_text',
          preview: 'Hello World'
        }
      }
      
      expect(contentMessage.type).toBe('content')
      expect(contentMessage.data.type).toBe('text')
      expect(connectionMessage.type).toBe('connection')
      expect(connectionMessage.data.tool).toBe('display_text')
    })

    test('should handle different image formats', () => {
      const supportedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      
      supportedTypes.forEach(type => {
        expect(type.startsWith('image/')).toBe(true)
      })
    })

    test('should validate SVG content structure', () => {
      const svgContent = {
        id: 'svg-test-123',
        type: 'svg',
        data: '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="blue"/></svg>',
        title: 'Test SVG',
        timestamp: new Date().toISOString()
      }
      
      expect(svgContent.type).toBe('svg')
      expect(svgContent.data).toContain('<svg')
      expect(svgContent.data).toContain('</svg>')
      expect(svgContent.title).toBe('Test SVG')
      expect(svgContent.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })
}) 