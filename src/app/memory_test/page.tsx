'use client';

import React, { useState } from 'react';
import { MemoryStore as IMemoryStore } from '../chat-v2/types/memory';
import { MemoryStorage } from '../chat-v2/services/memoryStorage';

interface SearchResult {
  id: string;
  content: string;
  domain: string;
  tags: string[];
  status: string;
  confidence: number;
  matchType: 'content' | 'tag' | 'domain';
}

export default function MemoryTestPage() {
  const [memories, setMemories] = useState<IMemoryStore>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDomain, setSearchDomain] = useState('');
  const [searchType, setSearchType] = useState<'semantic' | 'keyword'>('keyword');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [newMemory, setNewMemory] = useState({
    content: '',
    domain: '',
    tags: '',
    status: 'current' as 'current' | 'outdated' | 'deprecated',
    confidence: 1.0
  });

  // Sample test data
  const testData = [
    {
      content: "The Realtime API allows for instant data synchronization. It uses WebSocket connections to push updates to clients immediately. Key features include presence detection and channel-based pub/sub.",
      domain: "api_docs",
      tags: ["realtime", "websocket", "api", "documentation"],
      status: "current",
      confidence: 1.0
    },
    {
      content: "REST API endpoints should follow standard HTTP methods. GET for retrieval, POST for creation, PUT for updates, and DELETE for removal. Always version your APIs using URL prefixes like /v1/.",
      domain: "api_docs",
      tags: ["rest", "api", "http", "documentation"],
      status: "current",
      confidence: 1.0
    },
    {
      content: "Authentication in our system uses JWT (JSON Web Tokens). Tokens must be included in the Authorization header using the Bearer scheme.",
      domain: "security",
      tags: ["authentication", "jwt", "security"],
      status: "current",
      confidence: 1.0
    }
  ];

  const handleAddTestData = () => {
    let newMemories = { ...memories };
    testData.forEach(data => {
      newMemories = MemoryStorage.writeMemory(
        newMemories,
        data.content,
        data.domain,
        {
          tags: data.tags,
          status: data.status as 'current' | 'outdated' | 'deprecated',
          confidence: data.confidence
        }
      );
    });
    setMemories(newMemories);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const query = searchQuery.toLowerCase();

    // Search through all domains
    Object.entries(memories).forEach(([domain, docs]) => {
      // Skip if domain filter is set and doesn't match
      if (searchDomain && domain !== searchDomain) return;

      Object.entries(docs).forEach(([id, doc]) => {
        let shouldInclude = false;
        let matchType: 'content' | 'tag' | 'domain' = 'content';

        if (searchType === 'keyword') {
          // Search in content blocks
          if (doc.context_blocks.some(block => {
            // Search in raw content
            if (block.raw_content.toLowerCase().includes(query)) return true;
            
            // Search in structured content
            const structured = block.structured_content;
            return structured.main_points.some(point => point.toLowerCase().includes(query)) ||
                   structured.entities.some(entity => entity.toLowerCase().includes(query)) ||
                   structured.concepts.some(concept => concept.toLowerCase().includes(query));
          })) {
            shouldInclude = true;
            matchType = 'content';
          }
          // Search in tags
          else if (doc.metadata.tags.some(tag => tag.toLowerCase().includes(query))) {
            shouldInclude = true;
            matchType = 'tag';
          }
          // Search in domain
          else if (domain.toLowerCase().includes(query)) {
            shouldInclude = true;
            matchType = 'domain';
          }
        } else {
          // Semantic search (simplified for now)
          shouldInclude = doc.context_blocks.some(block => {
            // Search in raw content
            if (block.raw_content.toLowerCase().includes(query)) return true;
            
            // Search in structured content
            const structured = block.structured_content;
            return structured.main_points.some(point => point.toLowerCase().includes(query)) ||
                   structured.entities.some(entity => entity.toLowerCase().includes(query)) ||
                   structured.concepts.some(concept => concept.toLowerCase().includes(query));
          });
          matchType = 'content';
        }

        if (shouldInclude) {
          results.push({
            id,
            content: doc.context_blocks.map(block => block.raw_content).join('\n'),
            domain,
            tags: doc.metadata.tags,
            status: doc.metadata.status,
            confidence: 1.0, // Default confidence since it's not in the metadata
            matchType
          });
        }
      });
    });

    setSearchResults(results);
  };

  const handleAddMemory = () => {
    const newMemories = MemoryStorage.writeMemory(
      memories,
      newMemory.content,
      newMemory.domain,
      {
        tags: newMemory.tags.split(',').map(t => t.trim()),
        status: newMemory.status,
        confidence: newMemory.confidence
      }
    );
    setMemories(newMemories);
    setNewMemory({
      content: '',
      domain: '',
      tags: '',
      status: 'current',
      confidence: 1.0
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Memory System Test
          </h1>

          {/* Test Data Section */}
          <div className="mb-8">
            <button
              onClick={handleAddTestData}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              Load Test Data
            </button>
          </div>

          {/* Add New Memory Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add New Memory
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={newMemory.domain}
                    onChange={(e) => setNewMemory({ ...newMemory, domain: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newMemory.tags}
                    onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newMemory.status}
                    onChange={(e) => setNewMemory({ ...newMemory, status: e.target.value as any })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm"
                  >
                    <option value="current">Current</option>
                    <option value="outdated">Outdated</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confidence
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newMemory.confidence}
                    onChange={(e) => setNewMemory({ ...newMemory, confidence: parseFloat(e.target.value) })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleAddMemory}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Add Memory
              </button>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Search Memories
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search Query
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm"
                    placeholder="Enter keywords to search..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Domain Filter (optional)
                  </label>
                  <input
                    type="text"
                    value={searchDomain}
                    onChange={(e) => setSearchDomain(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm"
                    placeholder="Filter by domain..."
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="keyword"
                    value="keyword"
                    checked={searchType === 'keyword'}
                    onChange={(e) => setSearchType(e.target.value as 'keyword' | 'semantic')}
                    className="text-blue-600"
                  />
                  <label htmlFor="keyword" className="text-sm text-gray-700 dark:text-gray-300">
                    Keyword Search
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="semantic"
                    value="semantic"
                    checked={searchType === 'semantic'}
                    onChange={(e) => setSearchType(e.target.value as 'keyword' | 'semantic')}
                    className="text-blue-600"
                  />
                  <label htmlFor="semantic" className="text-sm text-gray-700 dark:text-gray-300">
                    Semantic Search
                  </label>
                </div>
              </div>
              <button
                onClick={handleSearch}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
              >
                Search
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 ? (
              <div className="mt-4 space-y-4">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                  Found {searchResults.length} results
                </h3>
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div 
                      key={result.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Domain: {result.domain}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              result.status === 'current' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {result.status}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Match: {result.matchType}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            {result.content}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {result.tags.map((tag, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="mt-4 space-y-4">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                  No results found for your search. Showing all memories:
                </div>
                <div className="space-y-4">
                  {Object.entries(memories).map(([domain, docs]) => 
                    Object.entries(docs).map(([id, doc]) => (
                      <div 
                        key={id}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Domain: {domain}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                doc.metadata.status === 'current' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {doc.metadata.status}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                              {doc.context_blocks.map(block => block.raw_content).join('\n')}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {doc.metadata.tags.map((tag, idx) => (
                                <span 
                                  key={idx}
                                  className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Current Memory Store */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Memory Store
            </h2>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {JSON.stringify(memories, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 