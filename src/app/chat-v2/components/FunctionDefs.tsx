import React from 'react';

export const MEMORY_SCHEMA = `write_memory(
  content: string,     // Raw content to store
  domain: string,      // Domain category (e.g., "technical", "personal", "work")
  metadata?: {         // Optional metadata about the memory
    tags: string[],    // Tags for better recall
    status?: 'current' | 'outdated' | 'deprecated',
    confidence?: number // Confidence in the information (0-1)
  }
)

recall_memory(
  query: string,       // What to search for
  domain?: string,     // Optional: specific domain to search in
  filter?: {           // Optional: filter criteria
    tags?: string[],   // Filter by specific tags
    status?: 'current' | 'outdated' | 'deprecated',
    before?: string,   // Get memories before this timestamp
    after?: string     // Get memories after this timestamp
  }
)`;

export const MEMORY_INSTRUCTIONS = `Respond ONLY with the appropriate function call:
- For storing information: write_memory(content, domain, metadata?)
- For retrieving information: recall_memory(query, domain?, filter?)

The system will automatically:
- Generate a unique ID for the document
- Create a title and description from the content
- Structure the content into context blocks
- Generate summaries and key insights
- Track relationships between documents

Do not add any explanations or text before or after the function call.`;

export function FunctionDefs() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        Function Definitions
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 max-h-[300px] overflow-y-auto">
        <pre className="text-xs font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {MEMORY_SCHEMA}
        </pre>
      </div>
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        <pre className="whitespace-pre-wrap">
          {MEMORY_INSTRUCTIONS}
        </pre>
      </div>
    </div>
  );
} 