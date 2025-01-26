'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';

interface LogEntry {
  timestamp: string;
  type: 'request' | 'response' | 'error';
  data: any;
}

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry['type'], data: any) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      type,
      data
    }]);
  };

  const fetchModels = async () => {
    try {
      addLog('request', { endpoint: '/api/v0/models', method: 'GET' });
      const response = await fetch('/api/v0/models');
      const data = await response.json();
      addLog('response', data);
    } catch (error) {
      addLog('error', error);
    }
  };

  const fetchModelInfo = async (modelId: string) => {
    try {
      addLog('request', { endpoint: `/api/v0/models/${modelId}`, method: 'GET' });
      const response = await fetch(`/api/v0/models/${modelId}`);
      const data = await response.json();
      addLog('response', data);
    } catch (error) {
      addLog('error', error);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      addLog('request', {
        endpoint: '/api/v0/chat/completions',
        method: 'POST',
        body: {
          model: selectedModel,
          messages: [...messages, userMessage],
          temperature: 0.7,
          stream: false
        }
      });

      const response = await fetch('/api/v0/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage],
          temperature: 0.7,
          stream: false
        })
      });

      const data = await response.json();
      addLog('response', data);

      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      const assistantMessage = data.choices[0].message;
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      addLog('error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unloadModel = async (modelId: string) => {
    try {
      addLog('request', {
        endpoint: '/api/v0/model/unload',
        method: 'POST',
        body: { identifier: modelId }
      });

      const response = await fetch('/api/v0/model/unload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: modelId })
      });

      const data = await response.json();
      addLog('response', data);

      if (!response.ok) throw new Error(data.error || 'Failed to unload model');

      // Refresh model list to see updated state
      await fetchModels();
      
      // If this was the selected model, clear selection
      if (selectedModel === modelId) {
        setSelectedModel(null);
        setMessages([]);
      }

    } catch (error) {
      console.error('Unload error:', error);
      addLog('error', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LM Studio API Debug</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Test and inspect API responses</p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={fetchModels}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fetch Models List
          </button>

          {selectedModel && (
            <button
              onClick={() => fetchModelInfo(selectedModel)}
              className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Fetch Selected Model Info
            </button>
          )}
        </div>

        {/* Chat Interface (shows up when model is selected) */}
        {selectedModel && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Chat with {selectedModel}
            </h2>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 h-[300px] overflow-y-auto mb-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'text-blue-600' : 'text-green-600'
                  }`}
                >
                  <div className="font-bold">{message.role.toUpperCase()}</div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="text-gray-500 animate-pulse">Loading...</div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-gray-100"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Log Window */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">API Logs</h2>
          <div className="bg-gray-900 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'request' ? 'text-blue-400' :
                  'text-green-400'
                }`}
              >
                <div className="text-gray-500">{log.timestamp}</div>
                <div className="text-gray-400">{log.type.toUpperCase()}</div>
                <pre className="mt-1 overflow-x-auto">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Models Grid (shows up after fetching) */}
        {logs.some(log => 
          log.type === 'response' && 
          log.data?.data?.length > 0
        ) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Available Models</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {logs
                .filter(log => log.type === 'response' && log.data?.data?.length > 0)
                .slice(-1)[0]
                .data.data.map((model: any) => (
                  <div
                    key={model.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : model.state === 'loaded'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <button
                        onClick={() => setSelectedModel(model.id)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{model.id}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            model.state === 'loaded'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {model.state}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {model.type}
                          </span>
                          {model.loaded_context_length && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              ctx: {model.loaded_context_length}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {model.publisher} • {model.quantization}
                        </div>
                      </button>
                      
                      {model.state === 'loaded' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unloadModel(model.id);
                          }}
                          className="ml-2 p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                          title="Unload Model"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 