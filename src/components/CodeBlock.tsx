import React from 'react';

interface CodeBlockProps {
  children: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, language = 'typescript' }) => {
  return (
    <pre className="text-sm text-gray-300 overflow-x-auto">
      <code className={`language-${language}`}>
        {children}
      </code>
    </pre>
  );
}; 