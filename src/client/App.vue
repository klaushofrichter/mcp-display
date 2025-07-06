<template>
  <div class="app-container">
    <!-- Sidebar - moved to left -->
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
    
    <!-- Main Display Area - now takes remaining space -->
    <main class="main-content">
      <div class="display-header">
        <h1>MCP Display</h1>
        <button @click="clearDisplay" class="clear-button">Clear Display</button>
      </div>
      
      <div class="display-area">
        <div v-if="displayContent.length === 0" class="empty-state">
          <div class="empty-icon">📺</div>
          <h2>Ready to Display</h2>
          <p>Waiting for content from MCP clients...</p>
        </div>
        
        <div v-else class="content-list">
          <div 
            v-for="item in displayContent" 
            :key="item.id"
            class="content-item"
          >
            <div class="content-header">
              <div class="content-meta">
                <span class="content-type">{{ item.type.toUpperCase() }}</span>
                <span class="content-timestamp">{{ formatTimestamp(item.timestamp) }}</span>
              </div>
              <div class="content-inline">
                <div v-if="item.type === 'text'" class="text-content-inline">
                  <pre>{{ item.data }}</pre>
                </div>
                <div v-if="item.type === 'image'" class="image-content-inline">
                  <img 
                    :src="getImageSrc(item)" 
                    alt="MCP Display Image"
                    style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);"
                  />
                </div>
                <div v-if="item.type === 'svg'" class="svg-content-inline">
                  <div class="svg-title" v-if="item.title">{{ item.title }}</div>
                  <div 
                    v-html="item.data"
                    style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: auto;"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'App',
  setup() {
    const displayContent = ref([])
    const connectionLog = ref([])
    const websocket = ref(null)
    
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      // Connect to the same host and port as the web page, with /ws path
      const wsUrl = `${protocol}//${window.location.host}/ws`
      
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
            displayContent.value = []
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
        displayContent.value = []
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
          displayContent.value = Array.isArray(contentData.content) ? contentData.content : []
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
* {
  box-sizing: border-box;
}

.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #f5f5f5;
  gap: 0;
  padding: 0;
  margin: 0;
}

.sidebar {
  width: 350px;
  min-width: 350px;
  max-width: 350px;
  background-color: white;
  margin: 20px 0 20px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: white;
  margin: 20px 20px 20px 10px;
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
  flex-shrink: 0;
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
  flex-shrink: 0;
}

.clear-button:hover {
  background-color: #ff3742;
}

.display-area {
  flex: 1;
  padding: 30px;
  overflow: auto;
  min-height: 0;
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

.content-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-item {
  background-color: #fafafa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e1e5e9;
}

.content-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  flex-shrink: 0;
  gap: 20px;
}

.content-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  flex-shrink: 0;
}

.content-inline {
  flex: 1;
  min-width: 0;
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



.text-content-inline {
  background-color: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.text-content-inline pre {
  white-space: pre-wrap;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin: 0;
}

.image-content-inline {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background-color: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.image-content-inline img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.svg-content-inline {
  background-color: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.svg-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  font-size: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e1e5e9;
}

.svg-content-inline svg {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.sidebar-header {
  padding: 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #e1e5e9;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
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
  min-height: 0;
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