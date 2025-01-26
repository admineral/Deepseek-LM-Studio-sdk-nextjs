import { useState } from 'react';
import { DisplayMessage, FunctionCallState } from '../types';
import { parseStreamChunk, MEMORY_PROMPT, formatUserPrompt } from '../utils/chatUtils';
import { MemoryStorage } from '../services/memoryStorage';
import { MemoryStore as IMemoryStore } from '../types/memory';

interface ChatHandlerProps {
  selectedModel: string | null;
  messages: DisplayMessage[];
  setMessages: (messages: DisplayMessage[]) => void;
  setPartialMessage: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
  setFunctionCall: (call: FunctionCallState | null) => void;
  memories: IMemoryStore;
  setMemories: (memories: IMemoryStore) => void;
}

export function useChatHandler({
  selectedModel,
  messages,
  setMessages,
  setPartialMessage,
  setIsLoading,
  setFunctionCall,
  memories,
  setMemories
}: ChatHandlerProps) {
  const handleFunctionCall = async (content: string) => {
    try {
      if (content.includes('<think>')) {
        const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>\s*([\s\S]*)/);
        if (thinkMatch) {
          const remainingContent = thinkMatch[2]?.trim();
          if (remainingContent) {
            await processContent(remainingContent);
          }
          return;
        }
      }
      await processContent(content);
    } catch (e) {
      if (content.trim()) {
        setMessages(prev => [...prev, {
          type: 'regular',
          role: 'assistant',
          content: content
        }]);
      }
    }
  };

  const processContent = async (content: string) => {
    try {
      if (content.includes('<think>')) {
        const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>\s*([\s\S]*)/);
        if (thinkMatch) {
          const remainingContent = thinkMatch[2]?.trim();
          if (remainingContent) {
            try {
              const jsonMatch = remainingContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const jsonContent = JSON.parse(jsonStr);
                
                if (jsonContent.function_call) {
                  setMessages(prev => [...prev, {
                    type: 'think',
                    content: `I will now execute a function call:\n${JSON.stringify(jsonContent, null, 2)}`
                  }]);

                  if (jsonContent.function_call.recall_memory) {
                    await handleRecallMemory(jsonContent.function_call.recall_memory);
                    return;
                  }

                  if (jsonContent.function_call.write_memory) {
                    handleWriteMemory(jsonContent.function_call.write_memory);
                    return;
                  }
                }
              }
            } catch (e) {
              console.warn('Failed to parse function call JSON:', e);
              setMessages(prev => [...prev, {
                type: 'regular',
                role: 'assistant',
                content: remainingContent
              }]);
            }
          }
          return;
        }
      }

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const jsonContent = JSON.parse(jsonStr);
          
          if (jsonContent.function_call) {
            if (jsonContent.function_call.recall_memory || jsonContent.function_call.write_memory) {
              await processContent(`<think>Processing function call</think>${jsonStr}`);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse raw JSON:', e);
      }

      if (content.trim()) {
        setMessages(prev => [...prev, {
          type: 'regular',
          role: 'assistant',
          content: content
        }]);
      }
    } catch (e) {
      console.error('Error in processContent:', e);
      setMessages(prev => [...prev, {
        type: 'regular',
        role: 'system',
        content: 'Error processing response. Please try again.'
      }]);
    }
  };

  const handleRecallMemory = async (params: any) => {
    const { query, domain, filter } = params;
    const results = MemoryStorage.searchMemory(memories, query, domain, filter);
    
    setMessages(prev => [...prev, {
      type: 'function_result',
      role: 'assistant',
      content: results.length === 0 
        ? `[MEMORY_RECALL_RESULT] No results found for "${query}". Here are all available memories to help enhance your response or create new synthetic memories:\n${JSON.stringify(memories, null, 2)}\n\nConsider using write_memory to store any new insights or connections you find in these memories.`
        : `[MEMORY_RECALL_RESULT] Found ${results.length} results for "${query}":\n${JSON.stringify(results, null, 2)}\n\nConsider using write_memory to store any new insights or connections you find in these results.`,
      isCollapsed: true
    }]);

    const formattedResults = results.length === 0 
      ? `No results found for "${query}". Here are all available memories:\n${JSON.stringify(memories, null, 2)}`
      : `Memory search results for "${query}":\n${JSON.stringify(results, null, 2)}`;

    await sendChatMessage(formattedResults, true);
  };

  const handleWriteMemory = (params: any) => {
    const { content: memoryContent, domain, metadata } = params;
    const newMemories = MemoryStorage.writeMemory(memories, memoryContent, domain, metadata);
    setMemories(newMemories);

    setMessages(prev => [...prev, {
      type: 'function',
      role: 'assistant',
      functionName: 'write_memory',
      parameters: {
        content: memoryContent,
        domain,
        metadata: {
          tags: metadata?.tags || [],
          status: metadata?.status || 'current',
          confidence: metadata?.confidence || 1.0
        }
      },
      result: {
        success: true,
        domain,
        documentId: `doc_${Date.now()}`
      },
      content: `Memory written to domain: ${domain}`
    }]);
  };

  const handleStreamResponse = async (body: ReadableStream<Uint8Array>) => {
    let fullResponse = '';

    const reader = body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const parsed = parseStreamChunk(line.slice(6));
        if (!parsed) continue;

        fullResponse += parsed.content;
        handleThinkingAndPartialMessage(fullResponse);

        if (parsed.done) break;
      }
    }

    await handleFunctionCall(fullResponse.trim());
  };

  const handleThinkingAndPartialMessage = (fullResponse: string) => {
    const openTagIndex = fullResponse.lastIndexOf('<think>');
    const closeTagIndex = fullResponse.lastIndexOf('</think>');
    
    if (openTagIndex !== -1 && (closeTagIndex === -1 || openTagIndex > closeTagIndex)) {
      const thinkContent = fullResponse.slice(openTagIndex + 7).trim();
      setPartialMessage('');
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.type === 'think') {
          return [...prev.slice(0, -1), { ...lastMessage, content: thinkContent }];
        } else {
          return [...prev, { type: 'think', content: thinkContent, role: 'assistant', isCollapsed: false }];
        }
      });
      return;
    }

    if (closeTagIndex !== -1 && closeTagIndex > openTagIndex) {
      const afterThink = fullResponse.slice(closeTagIndex + 8).trim();
      if (afterThink) {
        setPartialMessage(afterThink);
      }
      return;
    }

    setPartialMessage(fullResponse.trim());
  };

  const sendChatMessage = async (message: string, isSystemMessage = false) => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    if (!isSystemMessage) {
      setMessages(prev => [...prev, {
        type: 'regular',
        role: 'user',
        content: message
      }]);
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/v0/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            ...messages.map(msg => ({
              role: msg.type === 'regular' ? msg.role : 'assistant',
              content: msg.type === 'think' ? `<think>${msg.content}</think>` : 
                      msg.type === 'function' ? JSON.stringify(msg.result) : msg.content
            })),
            { 
              role: isSystemMessage ? 'user' : 'user', 
              content: isSystemMessage ? message : `${MEMORY_PROMPT}\n\n${formatUserPrompt(message)}`
            }
          ],
          temperature: 0.7,
          stream: true
        })
      });

      if (!response.ok) throw new Error('Failed to get response');
      if (!response.body) throw new Error('No response body');

      await handleStreamResponse(response.body);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'regular',
        role: 'system',
        content: 'An error occurred while processing your request.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendChatMessage,
    handleFunctionCall,
    handleStreamResponse,
    handleThinkingAndPartialMessage
  };
} 