import * as React from 'react';
import { MemoryStore } from './MemoryStore';
import { MemoryStore as IMemoryStore } from '../types/memory';

interface Model {
  id: string;
  type: string;
  state: 'loaded' | 'not-loaded';
  publisher: string;
  quantization: string;
  loaded_context_length?: number;
}

interface ModelSidebarProps {
  models: Model[];
  selectedModel: string | null;
  onModelSelect: (modelId: string) => void;
  memories: IMemoryStore;
}

export function ModelSidebar({ models, selectedModel, onModelSelect, memories }: ModelSidebarProps) {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Models
        </h2>
      </div>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          {models.map(model => (
            <button
              key={model.id}
              onClick={() => onModelSelect(model.id)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                selectedModel === model.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {model.id}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {model.publisher} • {model.quantization}
              </div>
            </button>
          ))}
          {models.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              No loaded models found
            </div>
          )}
        </div>
      </div>
      
      {/* Memory Store */}
      <div className="flex-1 p-4 overflow-hidden">
        <MemoryStore memories={memories} />
      </div>
    </div>
  );
} 