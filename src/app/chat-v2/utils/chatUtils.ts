import * as React from 'react';
import { WeatherFunctionCall, StreamParser } from '../types';

export function isValidWeatherFunctionCall(obj: any): obj is WeatherFunctionCall {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.function === 'get_weather' &&
    obj.parameters &&
    typeof obj.parameters.location === 'string' &&
    (!obj.parameters.unit || ['celsius', 'fahrenheit'].includes(obj.parameters.unit))
  );
}

export function parseStreamChunk(chunk: string): StreamParser | null {
  try {
    if (!chunk || chunk === '[DONE]') {
      return null;
    }

    const parsed = JSON.parse(chunk);
    const content = parsed.choices[0]?.delta?.content || '';
    const done = parsed.choices[0]?.finish_reason != null;

    return { content, done };
  } catch (e) {
    console.error('Failed to parse chunk:', e);
    return null;
  }
}

export function formatThinkingContent(content: string): string | React.ReactElement {
  const cleanContent = content
    .replace(/<\/?think>/g, '')
    .trim();

  if (cleanContent.includes('I will now execute a function call:')) {
    const [text, jsonStr] = cleanContent.split('I will now execute a function call:');
    try {
      const jsonObj = JSON.parse(jsonStr);
      const functionCall = jsonObj.function_call;
      const functionName = Object.keys(functionCall)[0];
      const params = functionCall[functionName];

      return React.createElement('div', { className: 'space-y-2' },
        React.createElement('div', { className: 'text-yellow-800 dark:text-yellow-200 font-medium' }, text.trim()),
        React.createElement('div', { className: 'bg-white/10 dark:bg-black/20 rounded-lg p-3 space-y-2' },
          React.createElement('div', { className: 'flex items-center gap-2 text-yellow-700 dark:text-yellow-300' },
            React.createElement('span', { className: 'font-mono' }, '⚡ Function:'),
            React.createElement('span', { className: 'font-semibold' }, functionName)
          ),
          renderFunctionParams(functionName, params)
        )
      );
    } catch (e) {
      return cleanContent;
    }
  }

  return cleanContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n');
}

function renderFunctionParams(functionName: string, params: any): React.ReactElement | null {
  if (functionName === 'recall_memory') {
    return React.createElement('div', { className: 'space-y-1.5' },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-yellow-600 dark:text-yellow-400' }, '🔍 Query:'),
        React.createElement('span', { className: 'font-mono text-sm bg-white/20 dark:bg-black/30 px-2 py-0.5 rounded' },
          `"${params.query}"`
        )
      ),
      params.domain && React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-yellow-600 dark:text-yellow-400' }, '📂 Domain:'),
        React.createElement('span', { className: 'font-mono text-sm bg-white/20 dark:bg-black/30 px-2 py-0.5 rounded' },
          params.domain
        )
      ),
      params.filter && React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-yellow-600 dark:text-yellow-400' }, '🔧 Filters:'),
        React.createElement('span', { className: 'font-mono text-sm bg-white/20 dark:bg-black/30 px-2 py-0.5 rounded' },
          JSON.stringify(params.filter)
        )
      )
    );
  }

  if (functionName === 'write_memory') {
    return React.createElement('div', { className: 'space-y-1.5' },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-yellow-600 dark:text-yellow-400' }, '📝 Content:'),
        React.createElement('span', { className: 'font-mono text-sm bg-white/20 dark:bg-black/30 px-2 py-0.5 rounded' },
          `"${params.content}"`
        )
      ),
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-yellow-600 dark:text-yellow-400' }, '📂 Domain:'),
        React.createElement('span', { className: 'font-mono text-sm bg-white/20 dark:bg-black/30 px-2 py-0.5 rounded' },
          params.domain
        )
      ),
      params.metadata && React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-yellow-600 dark:text-yellow-400' }, '🏷️ Tags:'),
        React.createElement('div', { className: 'flex gap-1 flex-wrap' },
          params.metadata.tags?.map((tag: string, i: number) =>
            React.createElement('span', {
              key: i,
              className: 'font-mono text-sm bg-white/20 dark:bg-black/30 px-2 py-0.5 rounded'
            }, tag)
          )
        )
      )
    );
  }

  return null;
}

export const MEMORY_PROMPT = `<general_instructions>
Before answering any question, I should:
1. Check if there's relevant information in memory using recall_memory() with appropriate query parameters
2. If relevant information is found, use it to enhance my response
3. After providing an answer, consider if it's worth storing in memory using write_memory()

Available memory functions:
- recall_memory(query: string, domain?: string, filter?: { status?: string, tags?: string[] })
  Used to search for relevant information in memory
- write_memory(content: string, domain: string, metadata: { tags?: string[], status?: string, confidence?: number })
  Used to store new information in memory

I should always:
1. First use <think> tags to explain my thought process
2. After </think>, IMMEDIATELY write the function call in JSON format like this:
   <think>I need to search for information about costs</think>
   {
     "function_call": {
       "recall_memory": {
         "query": "costs",
         "domain": "pricing",
         "filter": {
           "status": "current"
         }
       }
     }
   }

3. For writing to memory:
   <think>This information about costs should be stored</think>
   {
     "function_call": {
       "write_memory": {
         "content": "Cost information...",
         "domain": "pricing",
         "metadata": {
           "tags": ["costs", "pricing"],
           "status": "current",
           "confidence": 1.0
         }
       }
     }
   }

IMPORTANT: After </think>, ONLY write the function call in valid JSON format. Do not add any explanatory text.
</general_instructions>`;

export const formatUserPrompt = (userMessage: string) => `<user_question>
${userMessage}
</user_question>`;

export const MEMORY_SCHEMA = `interface Memory {
  [domain: string]: {
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
}`;

export const MEMORY_INSTRUCTIONS = `Available memory functions:
- recall_memory(query: string, domain?: string, filter?: { status?: string, tags?: string[] })
  Used to search for relevant information in memory
- write_memory(content: string, domain: string, metadata: { tags?: string[], status?: string, confidence?: number })
  Used to store new information in memory`; 