import { MemoryStore as IMemoryStore } from '../types/memory';
import { useState } from 'react';

interface Props {
  memories: IMemoryStore;
}

export function MemoryStore({ memories }: Props) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDomains = Object.entries(memories)
    .filter(([domain]) => 
      domain.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getMemoryCount = (domain: string) => {
    return Object.keys(memories[domain] || {}).length;
  };

  const getDomainIcon = (domain: string) => {
    const icons: { [key: string]: string } = {
      'api': '🔌',
      'user': '👤',
      'system': '⚙️',
      'pricing': '💰',
      'features': '✨',
      'docs': '📚',
      'default': '📁'
    };
    return icons[domain.toLowerCase()] || icons.default;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span>🧠</span>
          Memory Store
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {Object.keys(memories).length} domains
        </span>
      </div>

      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search domains..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 
                     dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredDomains.map(([domain, documents]) => (
          <div 
            key={domain}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 
                     dark:border-gray-700 overflow-hidden transition-all duration-200"
          >
            <button
              onClick={() => setExpandedDomain(expandedDomain === domain ? null : domain)}
              className="w-full px-4 py-3 flex items-center justify-between text-left 
                       hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getDomainIcon(domain)}</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {domain}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {getMemoryCount(domain)} memories
                  </div>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 
                         ${expandedDomain === domain ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedDomain === domain && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                {Object.entries(documents).map(([id, doc]) => (
                  <div 
                    key={id}
                    className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 
                             last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="text-sm text-gray-900 dark:text-white mb-2">
                      {doc.content}
                    </div>
                    {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.metadata.tags.map((tag, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 
                                     text-blue-600 dark:text-blue-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {doc.metadata?.timestamp && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {new Date(doc.metadata.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredDomains.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No matching domains found' : 'No memories stored yet'}
          </div>
        )}
      </div>
    </div>
  );
} 