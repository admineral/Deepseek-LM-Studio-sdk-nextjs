import * as React from 'react';
import { useState } from 'react';
import { DisplayMessage } from '../types/chat';

interface PromptInfoModalProps {
  onClose: () => void;
  messages: DisplayMessage[];
  memoryPrompt: string;
  memorySchema: string;
  memoryInstructions: string;
}

export function PromptInfoModal({ 
  onClose, 
  messages, 
  memoryPrompt,
  memorySchema,
  memoryInstructions
}: PromptInfoModalProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Memory System Prompt
          </h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFullPrompt(!showFullPrompt)}
              className="text-sm px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 
                       text-blue-600 dark:text-blue-300 hover:bg-blue-100 
                       dark:hover:bg-blue-900/50 transition-colors"
            >
              {showFullPrompt ? 'Show Base Prompt' : 'Show Full Prompt'}
            </button>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {showFullPrompt ? (
            <>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Full Injected Prompt
                </h4>
                <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {`// System Message (Memory Prompt)
${memoryPrompt}

// Previous Messages (if any)
${messages.map(msg => {
  if (msg.type === 'think') {
    return `[assistant]: <think>${msg.content}</think>`;
  }
  if (msg.type === 'function') {
    return `[assistant]: Function Call: ${msg.functionName}
Parameters: ${JSON.stringify(msg.parameters, null, 2)}
Result: ${JSON.stringify(msg.result, null, 2)}`;
  }
  // Regular message
  return `[${msg.role}]: ${msg.content}`;
}).join('\n\n')}

// User Message Format
${formatUserPrompt('example user message')}`}
                </pre>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Function Definition
                </h4>
                <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {memorySchema}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Instructions
                </h4>
                <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {memoryInstructions}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatUserPrompt(message: string) {
  return `<user_question>
${message}
</user_question>`;
} 