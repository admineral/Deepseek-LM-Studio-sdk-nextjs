'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Model {
  id: string;
  object: string;
  owned_by: string;
}

interface ModelsResponse {
  data: Model[];
  object: string;
}

interface ConnectionStep {
  id: 'init' | 'models' | 'status' | 'ready';
  label: string;
  status: 'waiting' | 'checking' | 'success' | 'error';
  message: string;
}

interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

interface LoadedModel {
  identifier: string;
  path: string;
}

interface ModelInfo {
  id: string;
  object: string;
  type: string;
  publisher: string;
  arch: string;
  compatibility_type: string;
  quantization: string;
  state: 'loaded' | 'not-loaded';
  max_context_length: number;
}

class ChatClient {
  private baseUrl: string;
  private currentModel: string;
  private loadedModels: Set<string>;

  constructor(baseUrl: string = 'http://127.0.0.1:1234') {
    this.baseUrl = baseUrl;
    this.currentModel = '';
    this.loadedModels = new Set();
  }

  async getModels(): Promise<ModelsResponse> {
    const response = await fetch(`${this.baseUrl}/api/v0/models`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const data = await response.json();
    // Filter out embedding models
    data.data = data.data.filter((model: Model) => model.type !== 'embeddings');
    return data;
  }

  llm = {
    load: async (modelPath: string) => {
      // First check model state
      const response = await fetch(`${this.baseUrl}/api/v0/models/${modelPath}`);
      if (!response.ok) {
        throw new Error('Failed to get model info');
      }
      const modelInfo: ModelInfo = await response.json();
      
      // If model is already loaded, just update our state
      if (modelInfo.state === 'loaded') {
        this.currentModel = modelPath;
        this.loadedModels.add(modelPath);
        return true;
      }
      
      // Try to load the model by making a test request
      const testResponse = await fetch(`${this.baseUrl}/api/v0/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelPath,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
          stream: false
        })
      });
      
      if (!testResponse.ok) {
        throw new Error('Failed to load model');
      }

      this.currentModel = modelPath;
      this.loadedModels.add(modelPath);
      return true;
    },

    unload: async (modelPath: string) => {
      // Check current state
      const response = await fetch(`${this.baseUrl}/api/v0/models/${modelPath}`);
      if (!response.ok) {
        throw new Error('Failed to get model info');
      }
      const modelInfo: ModelInfo = await response.json();
      
      // If model is already unloaded, just update our state
      if (modelInfo.state === 'not-loaded') {
        if (this.currentModel === modelPath) {
          this.currentModel = '';
        }
        this.loadedModels.delete(modelPath);
        return true;
      }

      // Just manage internal state since there's no unload endpoint
      if (this.currentModel === modelPath) {
        this.currentModel = '';
      }
      this.loadedModels.delete(modelPath);
      return true;
    },

    listLoaded: async () => {
      const response = await fetch(`${this.baseUrl}/api/v0/models`);
      if (!response.ok) {
        throw new Error('Failed to list models');
      }
      const data = await response.json();
      return data.data.filter((model: ModelInfo) => model.state === 'loaded');
    }
  };

  // Update isTextEmbeddingModel to be public since it's used in the component
  isTextEmbeddingModel(modelId: string): boolean {
    return modelId.toLowerCase().includes('embedding') || 
           modelId.toLowerCase().includes('embed') ||
           modelId.toLowerCase().includes('encoder');
  }

  setModel(modelId: string) {
    this.currentModel = modelId;
  }

  async checkModelStatus(modelId: string): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
          stream: false
        })
      });
      return true;
    } catch {
      return false;
    }
  }

  getLoadedModels(): LoadedModel[] {
    return Array.from(this.loadedModels).map(path => ({
      identifier: path,
      path: path
    }));
  }

  async sendMessage(messages: Message[], onToken?: (token: string) => void) {
    if (!this.currentModel) throw new Error('No model selected');
    
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.currentModel,
        messages,
        temperature: 0.7,
        stream: true
      }),
    });

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            const data = JSON.parse(line.slice(6));
            const token = data.choices[0]?.delta?.content || '';
            content += token;
            onToken?.(token);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return content;
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'Always answer in rhymes.' },
    { role: 'assistant', content: "Hello! I'm your AI assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [availableModels, setAvailableModels] = useState<ModelsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatClient = useRef(new ChatClient());
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [steps, setSteps] = useState<ConnectionStep[]>([
    { id: 'init', label: 'Initialize Connection', status: 'waiting', message: 'Waiting to connect...' },
    { id: 'models', label: 'Check Available Models', status: 'waiting', message: 'Waiting for models...' },
    { id: 'ready', label: 'System Ready', status: 'waiting', message: 'Waiting to complete...' }
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([]);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const addLog = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { 
      id: generateUUID(),
      type, 
      message, 
      timestamp 
    }]);
  };

  const updateStep = (stepId: ConnectionStep['id'], status: ConnectionStep['status'], message: string) => {
    setSteps(current => 
      current.map(step => 
        step.id === stepId ? { ...step, status, message } : step
      )
    );
  };

  const checkConnection = async () => {
    try {
      // Initialize
      updateStep('init', 'checking', 'Connecting to LM Studio...');
      addLog('info', '🔄 Initializing connection to LM Studio');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get Models
      updateStep('init', 'success', 'Connected successfully');
      addLog('success', '✓ Connection established');
      updateStep('models', 'checking', 'Scanning for models...');
      addLog('info', '🔍 Scanning for available models');
      
      const downloadedModels = await chatClient.current.getModels();
      const llmModels = downloadedModels.data.filter(model => !chatClient.current.isTextEmbeddingModel(model.id));
      
      addLog('info', `📦 Found ${llmModels.length} models`);
      
      updateStep('models', 'success', `Found ${llmModels.length} models`);
      setAvailableModels({ data: llmModels, object: downloadedModels.object });
      setLoadedModels([]);  // Start with no loaded models
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Ready
      updateStep('ready', 'success', 'System ready for use');
      addLog('success', '✨ System is ready for use');
      setConnectionStatus('connected');
      setErrorMessage(null);
      
    } catch (error) {
      console.error('Connection error:', error);
      const currentStep = steps.find(step => step.status === 'checking');
      if (currentStep) {
        updateStep(currentStep.id, 'error', 'Failed');
        addLog('error', `❌ Failed at ${currentStep.label}`);
      }
      setConnectionStatus('error');
      addLog('error', '⚠️ Connection failed - Please check LM Studio');
      setErrorMessage(
        'Failed to connect to LM Studio. Please make sure:\n' +
        '1. LM Studio is running\n' +
        '2. The local server is started\n' +
        '3. Port 1234 is available'
      );
      setTimeout(checkConnection, 5000);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll when messages length changes (new message added)
    if (messages.length > 2) { // More than initial system and assistant messages
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (selectedModel) {
      chatClient.current.setModel(selectedModel);
    }
  }, [selectedModel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || connectionStatus !== 'connected' || !selectedModel) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let assistantMessage = '';
      await chatClient.current.sendMessage([...messages, userMessage], (token) => {
        assistantMessage += token;
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1].role === 'assistant') {
            newMessages[newMessages.length - 1].content = assistantMessage;
          } else {
            newMessages.push({ role: 'assistant', content: assistantMessage });
          }
          return newMessages;
        });
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setErrorMessage('Failed to get response from LM Studio. Please check your connection.');
      setConnectionStatus('connecting');
      checkConnection();
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelSelect = async (modelId: string) => {
    try {
      if (selectedModel === modelId) {
        // Unload the current model
        setIsLoading(true);
        await chatClient.current.llm.unload(modelId);
        setSelectedModel('');
        addLog('info', `🔄 Unloaded model: ${modelId}`);
      } else {
        // Load new model
        setIsLoading(true);
        addLog('info', `📥 Loading model: ${modelId}`);
        
        await chatClient.current.llm.load(modelId);
        
        chatClient.current.setModel(modelId);
        setSelectedModel(modelId);
        addLog('success', `✨ Loaded model: ${modelId}`);
      }
    } catch (error) {
      console.error('Model operation failed:', error);
      addLog('error', `❌ Failed to ${selectedModel === modelId ? 'unload' : 'load'} model: ${modelId}`);
      setErrorMessage(`Failed to ${selectedModel === modelId ? 'unload' : 'load'} model. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Connection Status Component
  const LogWindow = () => (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connection Log</h3>
          {connectionStatus === 'connected' && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              http://127.0.0.1:1234
            </span>
          )}
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${
          connectionStatus === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          connectionStatus === 'connecting' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {connectionStatus.toUpperCase()}
        </div>
      </div>

      {(connectionStatus !== 'connected' || errorMessage) && (
        <>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-[300px] overflow-y-auto space-y-2 font-mono text-sm">
            {logs.map(log => (
              <div 
                key={log.id}
                className={`flex items-start space-x-2 animate-[fadeIn_0.3s_ease-out] ${
                  log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                  log.type === 'success' ? 'text-green-600 dark:text-green-400' :
                  log.type === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}
              >
                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {log.timestamp}
                </span>
                <span className="flex-1">
                  {log.message}
                </span>
              </div>
            ))}
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-800 dark:text-red-200 whitespace-pre-line">
              {errorMessage}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LM Studio Chat</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Connect to your local LM Studio instance</p>
        </div>

        <div className="mb-8">
          <LogWindow />
        </div>

        {/* Connection Status and Models */}
        <div className="mb-8 space-y-6">
          {/* Models Grid */}
          {availableModels && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Available Models</h3>
                {selectedModel && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Using: {selectedModel}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(availableModels as ModelsResponse).data.map((model) => {
                  const isSelected = selectedModel === model.id;
                  const sizeMatch = model.id.match(/\d+(\.\d+)?[bm]b?/i);
                  const size = sizeMatch ? sizeMatch[0].toUpperCase() : '';
                  const family = model.id.split('-')[0].replace(/\d+/g, '').toUpperCase();
                  const isInstruct = model.id.toLowerCase().includes('instruct');
                  
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      disabled={isLoading}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : loadedModels.some(m => m.path === model.id)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                              <span className="text-white text-xs font-bold">{family.slice(0, 2)}</span>
                            </div>
                            {size && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                {size}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {model.id}
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {loadedModels.some(m => m.path === model.id) && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                Loaded
                              </span>
                            )}
                            {isInstruct && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                Instruct
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Add loading indicator */}
                      {isLoading && selectedModel === model.id && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-lg">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {/* Messages */}
          <div className="p-4 space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto">
            {messages.filter(m => m.role !== 'system').map((message, index) => (
              <div key={index} className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 ${
                  message.role === 'assistant' ? 'bg-blue-600' : 'bg-gray-400'
                } rounded-full flex items-center justify-center`}>
                  <span className="text-white text-sm font-bold">
                    {message.role === 'assistant' ? 'AI' : 'U'}
                  </span>
                </div>
                <div className={`flex-1 ${
                  message.role === 'assistant' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-100 dark:bg-blue-900'
                } rounded-lg p-3`}>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <form className="flex space-x-4" onSubmit={handleSubmit}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  !selectedModel ? "Please select a model first" :
                  connectionStatus !== 'connected' ? "Waiting for connection to LM Studio..." :
                  "Type your message..."
                }
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading || connectionStatus !== 'connected' || !selectedModel}
              />
              <button
                type="submit"
                disabled={isLoading || connectionStatus !== 'connected' || !selectedModel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>

        {/* API Example */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">API Example</h3>
          <pre className="p-4 bg-gray-900 rounded-lg text-gray-300 text-sm overflow-x-auto max-h-[120px] overflow-y-auto">
{`curl http://127.0.0.1:1234/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepseek-r1-distill-llama-8b",
    "messages": [
      { "role": "system", "content": "Always answer in rhymes." },
      { "role": "user", "content": "Introduce yourself." }
    ],
    "temperature": 0.7,
    "max_tokens": -1,
    "stream": true
  }'`}
          </pre>
        </div>
      </div>
    </div>
  );
} 