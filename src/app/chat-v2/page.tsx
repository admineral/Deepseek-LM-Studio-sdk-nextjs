'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { DisplayMessage, Model, FunctionCallState } from './types';
import { MemoryStore as IMemoryStore } from './types/memory';
import { ModelSidebar } from './components/ModelSidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { PromptInfoModal } from './components/PromptInfoModal';
import { FunctionResponseForm } from './components/FunctionResponseForm';
import { PromptTemplate } from './components/PromptTemplate';
import { useChatHandler } from './components/ChatHandler';
import { MEMORY_SCHEMA, MEMORY_INSTRUCTIONS, MEMORY_PROMPT } from './utils/chatUtils';

export default function ChatV2Page() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [partialMessage, setPartialMessage] = useState('');
  const [showPromptTemplate, setShowPromptTemplate] = useState(false);
  const [showPromptInfo, setShowPromptInfo] = useState(false);
  const [functionCall, setFunctionCall] = useState<FunctionCallState | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [memories, setMemories] = useState<IMemoryStore>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const chatHandler = useChatHandler({
    selectedModel,
    messages,
    setMessages,
    setPartialMessage,
    setIsLoading,
    setFunctionCall,
    memories,
    setMemories
  });

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/v0/models');
      const data = await response.json();
      const loadedModels = data.data.filter((m: Model) => 
        m.type !== 'embeddings' && m.state === 'loaded'
      );
      setModels(loadedModels);
      
      if (!selectedModel && loadedModels.length > 0) {
        setSelectedModel(loadedModels[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const scrollToBottom = () => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const buffer = 100;
      const isBottom = scrollHeight - scrollTop - clientHeight < buffer;
      setIsAtBottom(isBottom);
    }
  };

  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
      return () => messagesContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, partialMessage]);

  // Load memories on mount
  useEffect(() => {
    const loadMemories = async () => {
      try {
        const response = await fetch('/api/memory');
        if (response.ok) {
          const data = await response.json();
          setMemories(data);
        }
      } catch (error) {
        console.error('Error loading memories:', error);
      }
    };
    loadMemories();
  }, []);

  // Save memories when they change
  useEffect(() => {
    const saveMemories = async () => {
      try {
        await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memories)
        });
      } catch (error) {
        console.error('Error saving memories:', error);
      }
    };
    if (Object.keys(memories).length > 0) {
      saveMemories();
    }
  }, [memories]);

        return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <ModelSidebar
        models={models}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
        memories={memories}
      />

      <div className="flex-1 flex flex-col">
        {selectedModel ? (
          <>
            <ChatHeader
              onCleanChat={() => setMessages([])}
              onShowPromptInfo={() => setShowPromptInfo(true)}
            />

            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              partialMessage={partialMessage}
              onToggleThinking={(index) => setMessages(prev => prev.map((msg, idx) => 
                idx === index && msg.type === 'think'
                ? { ...msg, isCollapsed: !msg.isCollapsed }
                : msg
            ))}
              onRateMessage={(index, rating) => setMessages(prev => prev.map((msg, idx) => 
                idx === index && msg.type === 'regular'
                  ? { ...msg, rating }
                  : msg
              ))}
              onToggleFunction={(index) => setMessages(prev => prev.map((msg, idx) => 
                          idx === index && msg.type === 'function'
                            ? { ...msg, isCollapsed: !msg.isCollapsed }
                            : msg
                        ))}
              onToggleFunctionResult={(index) => setMessages(prev => prev.map((msg, idx) => 
                            idx === index && msg.type === 'function_result'
                              ? { ...msg, isCollapsed: !msg.isCollapsed }
                              : msg
                          ))}
              onFunctionResponse={chatHandler.handleFunctionCall}
              onCancelFunction={(index) => setMessages(prev => prev.filter((_, i) => i !== index))}
              messagesRef={messagesContainerRef}
              endRef={messagesEndRef}
            />

            {functionCall ? (
              <FunctionResponseForm
                onSubmit={chatHandler.handleFunctionCall}
                onCancel={() => setFunctionCall(null)}
              />
            ) : (
              <ChatInput
                onSubmit={chatHandler.sendChatMessage}
                isLoading={isLoading}
                onShowTemplate={() => setShowPromptTemplate(true)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a model to start chatting
          </div>
        )}
      </div>

      {showPromptTemplate && (
        <PromptTemplate
          onSubmit={(prompt: string) => {
            chatHandler.sendChatMessage(prompt);
            setShowPromptTemplate(false);
          }}
          onCancel={() => setShowPromptTemplate(false)}
        />
      )}

      {showPromptInfo && (
        <PromptInfoModal
          onClose={() => setShowPromptInfo(false)}
          messages={messages}
          memoryPrompt={MEMORY_PROMPT}
          memorySchema={MEMORY_SCHEMA}
          memoryInstructions={MEMORY_INSTRUCTIONS}
        />
      )}
    </div>
  );
} 