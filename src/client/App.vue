<template>
  <div class="app-container">
    <!-- Main Display Area -->
    <main class="main-content">
      <div class="display-header">
        <h1>MCP Display</h1>
        <button @click="clearDisplay" class="clear-button">Clear Display</button>
      </div>
      
      <div class="display-area">
        <div v-if="!displayContent" class="empty-state">
          <div class="empty-icon">📺</div>
          <h2>Ready to Display</h2>
          <p>Waiting for content from MCP clients...</p>
        </div>
        
        <div v-else class="content-display">
          <div class="content-header">
            <span class="content-type">{{ displayContent.type.toUpperCase() }}</span>
            <span class="content-timestamp">{{ formatTimestamp(displayContent.timestamp) }}</span>
          </div>
          
          <div class="content-body">
            <div v-if="displayContent.type === 'text'" class="text-content">
              <pre>{{ displayContent.data }}</pre>
            </div>
            
            <div v-if="displayContent.type === 'image'" class="image-content">
              <img :src="getImageSrc(displayContent)" alt="MCP Display Image" />
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>Connection Log</h3>
        <span class="connection-count">{{ connectionLog.length }} connections</span>
      </div>
      
      <div class="connection-list">
        <div v-if="connectionLog.length === 0" class="empty-log">
          <p>No connections yet</p>
        </div>
        
        <div v-else>
          <div 
            v-for="connection in connectionLog" 
            :key="connection.id"
            class="connection-item"
          >
            <div class="connection-header">
              <span class="tool-name">{{ connection.tool }}</span>
              <span class="connection-time">{{ formatTime(connection.timestamp) }}</span>
            </div>
            <div class="connection-preview">{{ connection.preview }}</div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'App',
  setup() {
    const displayContent = ref(null)
    const connectionLog = ref([])
    const websocket = ref(null)
    
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}`
      
      websocket.value = new WebSocket(wsUrl)
      
      websocket.value.onopen = () => {
        console.log('WebSocket connected')
      }
      
      websocket.value.onmessage = (event) => {
        const message = JSON.parse(event.data)
        
        switch (message.type) {
          case 'content':
            displayContent.value = message.data
            break
          case 'connection':
            connectionLog.value.unshift(message.data)
            // Keep only last 100 entries
            if (connectionLog.value.length > 100) {
              connectionLog.value = connectionLog.value.slice(0, 100)
            }
            break
          case 'clear':
            displayContent.value = null
            break
        }
      }
      
      websocket.value.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      websocket.value.onclose = () => {
        console.log('WebSocket disconnected')
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
    }
    
    const clearDisplay = async () => {
      try {
        await fetch('/api/clear', { method: 'POST' })
        displayContent.value = null
      } catch (error) {
        console.error('Error clearing display:', error)
      }
    }
    
    const formatTimestamp = (timestamp) => {
      return new Date(timestamp).toLocaleString()
    }
    
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }
    
    const getImageSrc = (content) => {
      return `data:${content.mimeType};base64,${content.data}`
    }
    
    const loadInitialData = async () => {
      try {
        // Load current content
        const contentResponse = await fetch('/api/content')
        const contentData = await contentResponse.json()
        if (contentData.content) {
          displayContent.value = contentData.content
        }
        
        // Load connection log
        const connectionsResponse = await fetch('/api/connections')
        const connectionsData = await connectionsResponse.json()
        connectionLog.value = connectionsData.connections || []
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }
    
    onMounted(() => {
      loadInitialData()
      connectWebSocket()
    })
    
    onUnmounted(() => {
      if (websocket.value) {
        websocket.value.close()
      }
    })
    
    return {
      displayContent,
      connectionLog,
      clearDisplay,
      formatTimestamp,
      formatTime,
      getImageSrc
    }
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
  margin: 20px;
  margin-right: 10px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.display-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background-color: #fafafa;
  border-bottom: 1px solid #e1e5e9;
}

.display-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.clear-button {
  background-color: #ff4757;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.clear-button:hover {
  background-color: #ff3742;
}

.display-area {
  flex: 1;
  padding: 30px;
  overflow: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #333;
}

.content-display {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e1e5e9;
}

.content-type {
  background-color: #007bff;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.content-timestamp {
  color: #666;
  font-size: 14px;
}

.content-body {
  flex: 1;
  overflow: auto;
}

.text-content {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.text-content pre {
  white-space: pre-wrap;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.image-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.image-content img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.sidebar {
  width: 350px;
  background-color: white;
  margin: 20px;
  margin-left: 10px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #e1e5e9;
  border-radius: 12px 12px 0 0;
}

.sidebar-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.connection-count {
  color: #666;
  font-size: 14px;
}

.connection-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-log {
  text-align: center;
  color: #666;
  padding: 40px 20px;
}

.connection-item {
  padding: 15px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  margin-bottom: 10px;
  background-color: #fafafa;
}

.connection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tool-name {
  font-weight: 600;
  color: #007bff;
  font-size: 14px;
}

.connection-time {
  color: #666;
  font-size: 12px;
}

.connection-preview {
  color: #666;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}
</style> 