import { ChatMessage } from '@/types/chat';

export interface Model {
  id: string;
  type: string;
  state: 'loaded' | 'not-loaded';
  publisher: string;
  quantization: string;
  loaded_context_length?: number;
}

export interface StreamParser {
  content: string;
  done: boolean;
}

export interface ThinkingMessage {
  type: 'think';
  content: string;
  isCollapsed?: boolean;
  role?: 'assistant';
}

export interface RegularMessage extends ChatMessage {
  type: 'regular';
  rating?: 'up' | 'down';
}

export interface FunctionMessage extends ChatMessage {
  type: 'function';
  functionName: string;
  parameters: any;
  result: any;
  isCollapsed?: boolean;
}

export interface FunctionResultMessage extends ChatMessage {
  type: 'function_result';
  content: string;
  isCollapsed?: boolean;
}

export type DisplayMessage = ThinkingMessage | RegularMessage | FunctionMessage | FunctionResultMessage;

export interface WeatherFunctionCall {
  function: string;
  parameters: {
    location: string;
    unit: string;
  }
}

export interface FunctionCallState {
  isWaiting: boolean;
  function: string;
  parameters: any;
}

export interface MemoryItem {
  content: string;
  metadata?: {
    tags: string[];
    timestamp: string;
  };
}

export interface Memory {
  [key: string]: {
    [documentId: string]: {
      content: string;
      metadata?: {
        tags?: string[];
        status?: 'current' | 'outdated' | 'deprecated';
        confidence?: number;
        timestamp?: string;
      };
    };
  };
} 