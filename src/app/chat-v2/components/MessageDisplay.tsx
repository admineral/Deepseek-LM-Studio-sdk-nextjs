import * as React from 'react';
import { DisplayMessage, FunctionMessage } from '../types';
import { formatThinkingContent } from '../utils/chatUtils';
import { WeatherResponseForm } from './WeatherResponseForm';

interface MessageDisplayProps {
  message: DisplayMessage;
  index: number;
  messages: DisplayMessage[];
  onToggleThinking: (index: number) => void;
  onRateMessage: (index: number, rating: 'up' | 'down') => void;
  onToggleFunction: (index: number) => void;
  onToggleFunctionResult: (index: number) => void;
  onFunctionResponse: (response: string) => void;
  onCancelFunction: (index: number) => void;
}

function renderFunctionDetails(message: FunctionMessage) {
  return (
    <>
      <div className="font-medium text-purple-600 dark:text-purple-400">Parameters:</div>
      <pre className="bg-white dark:bg-gray-900 p-2 rounded text-xs overflow-auto">
        {JSON.stringify(message.parameters, null, 2)}
      </pre>
      <div className="font-medium text-purple-600 dark:text-purple-400 mt-2">Result:</div>
      <pre className="bg-white dark:bg-gray-900 p-2 rounded text-xs overflow-auto">
        {JSON.stringify(message.result, null, 2)}
      </pre>
    </>
  );
}

export function MessageDisplay({
  message,
  index,
  messages,
  onToggleThinking,
  onRateMessage,
  onToggleFunction,
  onToggleFunctionResult,
  onFunctionResponse,
  onCancelFunction
}: MessageDisplayProps): React.ReactElement {
  const isPartOfFunctionCall = (content: string) => {
    return content.includes('<think>') || 
           content.includes('function_call') || 
           content.includes('"recall_memory"') ||
           content.includes('"write_memory"');
  };

  const hasBeenReplacedByFunctionCall = (message: DisplayMessage, index: number) => {
    if (message.type !== 'regular' || message.role !== 'assistant') return false;
    
    return messages.slice(index + 1).some(m => 
      (m.type === 'think' && (
        m.content.includes(message.content) || 
        (m.content.includes('function_call') && 
         (m.content.includes('recall_memory') || m.content.includes('write_memory')))
      )) ||
      (m.type === 'function' && (
        (m.functionName === 'recall_memory' && message.content.includes('recall_memory')) ||
        (m.functionName === 'write_memory' && message.content.includes('write_memory'))
      ))
    );
  };

  // User message
  if (message.type === 'regular' && message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-blue-500 text-white">
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  // Thinking message
  if (message.type === 'think') {
    const isFunctionCall = message.content.includes('I will now execute a function call:');
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] w-full">
          <div 
            className="rounded-lg px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 transition-all duration-200"
            onClick={() => onToggleThinking(index)}
          >
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 cursor-pointer">
              <span>{isFunctionCall ? '⚡' : '🤔'}</span>
              <div className="font-medium text-sm">{isFunctionCall ? 'Function Call Received' : 'Thinking Process'}</div>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${message.isCollapsed ? '' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div 
              className={`mt-2 overflow-hidden transition-all duration-200 ${
                message.isCollapsed 
                  ? 'max-h-0 opacity-0' 
                  : 'max-h-[500px] opacity-100'
              }`}
            >
              {formatThinkingContent(message.content)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Function message
  if (message.type === 'function') {
    return (
      <div
        className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        onClick={() => onToggleFunction(index)}
      >
        <div className="flex items-center justify-between text-purple-700 dark:text-purple-300">
          <div className="flex items-center space-x-2">
            {message.functionName === 'write_memory' ? (
              <span className="font-mono">💾 Memory Write: {message.parameters.domain}</span>
            ) : message.functionName === 'recall_memory' ? (
              <span className="font-mono">🔍 Memory Search: "{message.parameters.query}"</span>
            ) : (
              <span className="font-mono">⚡ Function Call: {message.functionName}</span>
            )}
          </div>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${message.isCollapsed ? '' : 'rotate-180'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div 
          className={`text-sm space-y-1 overflow-hidden transition-all duration-200 ${
            message.isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
          }`}
        >
          {renderFunctionDetails(message)}
        </div>
      </div>
    );
  }

  // Function result message
  if (message.type === 'function_result') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] w-full">
          <div 
            className="rounded-lg px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 transition-all duration-200"
            onClick={() => onToggleFunctionResult(index)}
          >
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 cursor-pointer">
              <span>🔍</span>
              <div className="font-medium text-sm">Query Result</div>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${message.isCollapsed ? '' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div 
              className={`mt-2 overflow-hidden transition-all duration-200 ${
                message.isCollapsed 
                  ? 'max-h-0 opacity-0' 
                  : 'max-h-[500px] opacity-100'
              }`}
            >
              <pre className="text-sm font-mono bg-white/50 dark:bg-black/20 p-3 rounded text-emerald-800 dark:text-emerald-200 overflow-auto whitespace-pre-wrap">
                {message.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular assistant message
  if (message.type === 'regular' && !isPartOfFunctionCall(message.content) && !hasBeenReplacedByFunctionCall(message, index)) {
    if (message.content.startsWith('get_weather')) {
      const location = message.content.includes('Vienna') ? 'Vienna' : 'Tokyo, Japan';
      return (
        <div className="flex justify-start">
          <WeatherResponseForm
            location={location}
            onSubmit={onFunctionResponse}
            onCancel={() => onCancelFunction(index)}
          />
        </div>
      );
    }

    const isLastAssistantMessage = messages.slice(index + 1).every(m => 
      m.type !== 'regular' || (m.type === 'regular' && m.role !== 'assistant')
    );

    if (message.role === 'assistant' && isLastAssistantMessage) {
      return (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
            <div className="whitespace-pre-wrap">{message.content}</div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
              <button
                onClick={() => onRateMessage(index, 'up')}
                className={`p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${
                  message.rating === 'up' ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
                }`}
                title="Helpful"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.52-.86-.86-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z"/>
                </svg>
              </button>
              <button
                onClick={() => onRateMessage(index, 'down')}
                className={`p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${
                  message.rating === 'down' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                }`}
                title="Not Helpful"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 4h-2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h2V4zM2.17 11.12c-.11.25-.17.52-.17.8V13c0 1.1.9 2 2 2h5.5l-.92 4.65c-.05.22-.02.46.08.66.23.45.45.45.45.45.45.45.45.45.45.45.45.45.45.52.86.86 1.22 1.22 1.22 1.22 1.22 1.22L10 22l6.41-6.41c.38-.38.59-.89.59-1.42V6.34C17 5.05 15.95 4 14.66 4H6.56c-.71 0-1.36.37-1.72.97l-2.67 6.15z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}
 