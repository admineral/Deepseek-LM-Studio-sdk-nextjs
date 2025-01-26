import * as React from 'react';
import { useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';
import { RefObject } from 'react';
import { DisplayMessage } from '../types';
import { MessageDisplay } from './MessageDisplay';

interface ThinkingMessage {
  type: 'think';
  content: string;
  isCollapsed?: boolean;
  role?: 'assistant';
}

interface RegularMessage extends ChatMessage {
  type: 'regular';
  rating?: 'up' | 'down';
}

interface FunctionMessage extends ChatMessage {
  type: 'function';
  functionName: string;
  parameters: any;
  result: any;
  isCollapsed?: boolean;
}

interface FunctionResultMessage extends ChatMessage {
  type: 'function_result';
  content: string;
  isCollapsed?: boolean;
}

type DisplayMessage = ThinkingMessage | RegularMessage | FunctionMessage | FunctionResultMessage;

interface ChatMessagesProps {
  messages: DisplayMessage[];
  isLoading: boolean;
  partialMessage: string;
  onToggleThinking: (index: number) => void;
  onRateMessage: (index: number, rating: 'up' | 'down') => void;
  onToggleFunction: (index: number) => void;
  onToggleFunctionResult: (index: number) => void;
  onFunctionResponse: (response: string) => void;
  onCancelFunction: (index: number) => void;
  messagesRef: React.RefObject<HTMLDivElement | null>;
  endRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatMessages({
  messages,
  isLoading,
  partialMessage,
  onToggleThinking,
  onRateMessage,
  onToggleFunction,
  onToggleFunctionResult,
  onFunctionResponse,
  onCancelFunction,
  messagesRef,
  endRef
}: ChatMessagesProps) {
  return (
    <div 
      ref={messagesRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((message, index) => (
        <MessageDisplay
          key={index}
          message={message}
          index={index}
          messages={messages}
          onToggleThinking={onToggleThinking}
          onRateMessage={onRateMessage}
          onToggleFunction={onToggleFunction}
          onToggleFunctionResult={onToggleFunctionResult}
          onFunctionResponse={onFunctionResponse}
          onCancelFunction={onCancelFunction}
        />
      ))}
      {isLoading && partialMessage && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
            <div className="whitespace-pre-wrap">{partialMessage}</div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
} 