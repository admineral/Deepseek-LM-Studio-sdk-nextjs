import React from 'react';

interface PromptTemplateProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}

export function PromptTemplate({ onSubmit, onCancel }: PromptTemplateProps) {
  const [fields, setFields] = React.useState({
    question: "Remember that my favorite color is blue",
    function_name: 'memory',
    function_schema: `write_memory(
  content: string,     // The information to store (e.g., "User's favorite color is blue")
  key: string,        // Category (e.g., "preferences", "personal", "work")
  metadata?: {        // Optional metadata about the memory
    tags: string[],   // Tags for better recall (e.g., ["color", "favorites", "personal"])
    timestamp: string // When this memory was created
  }
)

recall_memory(
  query: string,      // What to search for (e.g., "favorite color", "name")
  key?: string,       // Optional: specific category to search in
  filter?: {          // Optional: filter criteria
    tags?: string[],  // Filter by specific tags
    before?: string,  // Get memories before this timestamp
    after?: string    // Get memories after this timestamp
  }
)`,
    example_usage: `User: Remember that my favorite color is blue
write_memory(
  content: "User's favorite color is blue",
  key: "preferences",
  metadata: {
    tags: ["color", "favorites", "preferences"],
    timestamp: "2024-01-25"
  }
)

User: What's my favorite color?
recall_memory(
  query: "favorite color",
  key: "preferences",
  filter: {
    tags: ["color", "favorites"]
  }
)

User: What do you know about me?
recall_memory(
  query: "User",
  filter: {
    tags: ["personal", "preferences"]
  }
)`,
    instruction: `Respond ONLY with the appropriate function call:
- For storing information: write_memory(content, key, metadata?)
- For retrieving information: recall_memory(query, key?, filter?)
Do not add any explanations or text before or after the function call.`
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = `# Function Definition
${fields.function_schema}

# Example Usage
${fields.example_usage}

# Instructions
${fields.instruction}

# User Question
${fields.question}`;

    onSubmit(prompt);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Memory Function Template
          </h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Question
                </label>
                <input
                  type="text"
                  value={fields.question}
                  onChange={(e) => setFields(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-gray-100 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your question..."
                />
              </div>

              {Object.entries(fields).filter(([key]) => key !== 'question').map(([key, value]) => (
                <div key={key}>
                  <label 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize"
                  >
                    {key.replace('_', ' ')}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => setFields(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-gray-100 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={key.includes('schema') ? 15 : key.includes('example') ? 8 : 4}
                    placeholder={`Enter ${key.replace('_', ' ')}...`}
                  />
                </div>
              ))}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                           dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Generate Prompt
                </button>
              </div>
            </form>
          </div>

          <div className="p-4 border-l border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              Memory Contents
            </h3>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 h-[600px] overflow-y-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {/* This will be populated by the actual memory contents */}
                {JSON.stringify({
                  preferences: {
                    "favorite_color": "User's favorite color is blue"
                  }
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 