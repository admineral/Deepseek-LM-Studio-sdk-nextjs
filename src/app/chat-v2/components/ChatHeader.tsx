import * as React from 'react';

interface ChatHeaderProps {
  onCleanChat: () => void;
  onShowPromptInfo: () => void;
}

export function ChatHeader({ onCleanChat, onShowPromptInfo }: ChatHeaderProps) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Chat
        </h2>
        <button
          onClick={onShowPromptInfo}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                   dark:hover:text-gray-200 rounded-full hover:bg-gray-100 
                   dark:hover:bg-gray-700 transition-colors"
          title="Show Memory System Prompt"
        >
          🧠
        </button>
      </div>
      <button
        onClick={onCleanChat}
        className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 
                 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded
                 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        Clean Chat
      </button>
    </div>
  );
} 