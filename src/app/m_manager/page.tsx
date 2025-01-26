'use client';

import React from 'react';
import { KnowledgeDocument, ContextBlock, MemoryStore } from '../chat-v2/types/memory';

interface ValidationError {
  path: string;
  message: string;
}

interface ImportState {
  status: 'idle' | 'validating' | 'success' | 'error';
  progress: number;
  currentField: string;
}

export default function MemoryManager() {
  const [memories, setMemories] = React.useState<MemoryStore>({});
  const [selectedDomain, setSelectedDomain] = React.useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'table' | 'schema' | 'import'>('table');
  const [rawInput, setRawInput] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState<{field: string, direction: 'asc' | 'desc'}>({ field: 'timestamp', direction: 'desc' });
  const [showDocViewer, setShowDocViewer] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
  const [showErrorModal, setShowErrorModal] = React.useState(false);
  const [currentErrorPage, setCurrentErrorPage] = React.useState(1);
  const ERRORS_PER_PAGE = 15;
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importState, setImportState] = React.useState<ImportState>({
    status: 'idle',
    progress: 0,
    currentField: ''
  });
  const [importContent, setImportContent] = React.useState<any>(null);

  // Validation function
  const validateMemoryStore = (store: MemoryStore): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    Object.entries(store).forEach(([domain, docs]) => {
      if (!docs || typeof docs !== 'object') {
        errors.push({ path: domain, message: 'Invalid domain structure' });
        return;
      }

      Object.entries(docs).forEach(([docId, doc]) => {
        if (!doc) {
          errors.push({ path: `${domain}/${docId}`, message: 'Document is undefined' });
          return;
        }

        // Validate required fields
        if (!doc.metadata?.status) {
          errors.push({ path: `${domain}/${docId}`, message: 'Missing metadata.status' });
        }
        if (!doc.metadata?.domain) {
          errors.push({ path: `${domain}/${docId}`, message: 'Missing metadata.domain' });
        }
        if (!doc.metadata?.timestamp) {
          errors.push({ path: `${domain}/${docId}`, message: 'Missing metadata.timestamp' });
        }
        if (!doc.title) {
          errors.push({ path: `${domain}/${docId}`, message: 'Missing title' });
        }
        if (!Array.isArray(doc.context_blocks)) {
          errors.push({ path: `${domain}/${docId}`, message: 'Invalid context_blocks structure' });
        }

        // Validate context blocks
        doc.context_blocks?.forEach((block, idx) => {
          if (!block.metadata?.confidence) {
            errors.push({ path: `${domain}/${docId}/block${idx}`, message: 'Missing confidence score' });
          }
          if (!block.raw_content) {
            errors.push({ path: `${domain}/${docId}/block${idx}`, message: 'Missing raw content' });
          }
          if (!block.structured_content) {
            errors.push({ path: `${domain}/${docId}/block${idx}`, message: 'Missing structured content' });
          }
        });
      });
    });

    return errors;
  };

  // Load memories on mount
  React.useEffect(() => {
    const loadMemories = async () => {
      try {
        const response = await fetch('/api/memory');
        if (response.ok) {
          const data = await response.json();
          setMemories(data);
          const errors = validateMemoryStore(data);
          setValidationErrors(errors);
        }
      } catch (error) {
        console.error('Error loading memories:', error);
        setValidationErrors([{ path: 'api', message: 'Failed to load memory store' }]);
      }
    };
    loadMemories();
  }, []);

  const handleSave = async () => {
    // TODO: Call LLM to structure the raw input
    // For now, just create a basic structure
    const newDoc: KnowledgeDocument = {
      id: Date.now().toString(),
      title: 'New Document',
      description: 'Generated from raw input',
      context_blocks: [{
        id: Date.now().toString(),
        raw_content: rawInput,
        structured_content: {
          main_points: [],
          entities: [],
          concepts: []
        },
        metadata: {
          tags: [],
          domain: [selectedDomain || 'general'],
          timestamp: new Date().toISOString(),
          status: 'current',
          confidence: 1
        },
        context: {
          summary: '',
          related_blocks: []
        }
      }],
      metadata: {
        tags: [],
        domain: [selectedDomain || 'general'],
        timestamp: new Date().toISOString(),
        version: '1.0',
        status: 'current'
      },
      summary: {
        brief: '',
        detailed: '',
        key_insights: []
      },
      relationships: {
        prerequisites: [],
        related_docs: []
      }
    };

    const domain = selectedDomain || 'general';
    const updatedMemories = {
      ...memories,
      [domain]: {
        ...memories[domain],
        [newDoc.id]: newDoc
      }
    };

    setMemories(updatedMemories);
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMemories)
    });
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setImportState({ status: 'idle', progress: 0, currentField: '' });
    setImportContent(null);
    setValidationErrors([]);
  };

  const validateField = async (content: any, field: string, path: string = ''): Promise<ValidationError[]> => {
    const errors: ValidationError[] = [];
    const fullPath = path ? `${path}.${field}` : field;
    
    switch (field) {
      case 'metadata':
        if (!content?.status || !['current', 'outdated', 'deprecated'].includes(content.status)) {
          errors.push({ path: `${fullPath}.status`, message: "Status must be 'current', 'outdated', or 'deprecated'" });
        }
        if (!Array.isArray(content?.domain)) {
          errors.push({ path: `${fullPath}.domain`, message: 'Domain must be an array of strings' });
        }
        if (!content?.timestamp || isNaN(Date.parse(content.timestamp))) {
          errors.push({ path: `${fullPath}.timestamp`, message: 'Timestamp must be a valid date string' });
        }
        if (!content?.version) {
          errors.push({ path: `${fullPath}.version`, message: 'Version is required' });
        }
        if (!Array.isArray(content?.tags)) {
          errors.push({ path: `${fullPath}.tags`, message: 'Tags must be an array of strings' });
        }
        break;

      case 'context_blocks':
        if (!Array.isArray(content)) {
          errors.push({ path: fullPath, message: 'Must be an array of context blocks' });
        } else {
          content.forEach((block, idx) => {
            if (!block.id) {
              errors.push({ path: `${fullPath}[${idx}].id`, message: 'Block ID is required' });
            }
            if (!block.raw_content || typeof block.raw_content !== 'string') {
              errors.push({ path: `${fullPath}[${idx}].raw_content`, message: 'Raw content must be a string' });
            }
            if (!block.structured_content) {
              errors.push({ path: `${fullPath}[${idx}].structured_content`, message: 'Structured content is required' });
            } else {
              if (!Array.isArray(block.structured_content.main_points)) {
                errors.push({ path: `${fullPath}[${idx}].structured_content.main_points`, message: 'Main points must be an array' });
              }
              if (!Array.isArray(block.structured_content.entities)) {
                errors.push({ path: `${fullPath}[${idx}].structured_content.entities`, message: 'Entities must be an array' });
              }
              if (!Array.isArray(block.structured_content.concepts)) {
                errors.push({ path: `${fullPath}[${idx}].structured_content.concepts`, message: 'Concepts must be an array' });
              }
            }
            if (!block.metadata) {
              errors.push({ path: `${fullPath}[${idx}].metadata`, message: 'Block metadata is required' });
            } else {
              if (!Array.isArray(block.metadata.tags)) {
                errors.push({ path: `${fullPath}[${idx}].metadata.tags`, message: 'Block tags must be an array' });
              }
              if (!Array.isArray(block.metadata.domain)) {
                errors.push({ path: `${fullPath}[${idx}].metadata.domain`, message: 'Block domain must be an array' });
              }
              if (!block.metadata.timestamp || isNaN(Date.parse(block.metadata.timestamp))) {
                errors.push({ path: `${fullPath}[${idx}].metadata.timestamp`, message: 'Block timestamp must be a valid date' });
              }
              if (!['current', 'outdated', 'deprecated'].includes(block.metadata.status)) {
                errors.push({ path: `${fullPath}[${idx}].metadata.status`, message: "Block status must be 'current', 'outdated', or 'deprecated'" });
              }
              if (typeof block.metadata.confidence !== 'number' || block.metadata.confidence < 0 || block.metadata.confidence > 1) {
                errors.push({ path: `${fullPath}[${idx}].metadata.confidence`, message: 'Confidence must be a number between 0 and 1' });
              }
            }
            if (!block.context) {
              errors.push({ path: `${fullPath}[${idx}].context`, message: 'Block context is required' });
            } else {
              if (typeof block.context.summary !== 'string') {
                errors.push({ path: `${fullPath}[${idx}].context.summary`, message: 'Block summary must be a string' });
              }
              if (!Array.isArray(block.context.related_blocks)) {
                errors.push({ path: `${fullPath}[${idx}].context.related_blocks`, message: 'Related blocks must be an array' });
              }
            }
          });
        }
        break;

      case 'summary':
        if (!content?.brief || typeof content.brief !== 'string') {
          errors.push({ path: `${fullPath}.brief`, message: 'Brief summary is required and must be a string' });
        }
        if (!content?.detailed || typeof content.detailed !== 'string') {
          errors.push({ path: `${fullPath}.detailed`, message: 'Detailed summary is required and must be a string' });
        }
        if (!Array.isArray(content?.key_insights)) {
          errors.push({ path: `${fullPath}.key_insights`, message: 'Key insights must be an array of strings' });
        }
        break;

      case 'relationships':
        if (!content) {
          errors.push({ path: fullPath, message: 'Relationships object is required' });
        } else {
          if (!Array.isArray(content.prerequisites)) {
            errors.push({ path: `${fullPath}.prerequisites`, message: 'Prerequisites must be an array' });
          }
          if (!Array.isArray(content.related_docs)) {
            errors.push({ path: `${fullPath}.related_docs`, message: 'Related docs must be an array' });
          }
        }
        break;

      case 'title':
        if (!content || typeof content !== 'string' || content.trim() === '') {
          errors.push({ path: fullPath, message: 'Title is required and must be a non-empty string' });
        }
        break;

      case 'description':
        if (!content || typeof content !== 'string') {
          errors.push({ path: fullPath, message: 'Description is required and must be a string' });
        }
        break;
    }

    return errors;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          setImportContent(content);
          setImportState({ status: 'validating', progress: 0, currentField: 'structure' });
          
          // Start validation process
          const errors: ValidationError[] = [];
          const fields = ['metadata', 'context_blocks', 'title', 'description', 'summary'];
          let progress = 0;
          
          // First validate overall structure
          if (!content || typeof content !== 'object') {
            errors.push({ path: 'root', message: 'Invalid JSON structure' });
          } else {
            // Validate each domain and document
            for (const [domain, docs] of Object.entries(content)) {
              if (!docs || typeof docs !== 'object') {
                errors.push({ path: domain, message: 'Invalid domain structure' });
                continue;
              }

              for (const [docId, doc] of Object.entries(docs as object)) {
                if (!doc) {
                  errors.push({ path: `${domain}/${docId}`, message: 'Document is undefined' });
                  continue;
                }

                // Validate each field
                for (const field of fields) {
                  setImportState({
                    status: 'validating',
                    progress: (progress / (Object.keys(content).length * fields.length)) * 100,
                    currentField: `${domain}/${docId}/${field}`
                  });
                  
                  const fieldErrors = await validateField(doc[field as keyof typeof doc], field, `${domain}/${docId}`);
                  errors.push(...fieldErrors);
                  progress++;
                }
              }
            }
          }

          setValidationErrors(errors);
          setImportState({
            status: errors.length === 0 ? 'success' : 'error',
            progress: 100,
            currentField: ''
          });
        } catch (error) {
          console.error('Error parsing JSON:', error);
          setValidationErrors([{ path: 'import', message: 'Invalid JSON format' }]);
          setImportState({ status: 'error', progress: 100, currentField: '' });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportConfirm = async () => {
    if (importContent && importState.status === 'success') {
      const updatedMemories = { ...memories, ...importContent };
      setMemories(updatedMemories);
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMemories)
      });
      setShowImportModal(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(memories, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'memory-store.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleDeleteDomain = async (domain: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the domain "${domain}" and all its documents?`)) {
      const updatedMemories = { ...memories };
      delete updatedMemories[domain];
      setMemories(updatedMemories);
      if (selectedDomain === domain) {
        setSelectedDomain(null);
        setSelectedDoc(null);
      }
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMemories)
      });
    }
  };

  const handleDeleteDocument = async (domain: string, docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this document?')) {
      const updatedMemories = {
        ...memories,
        [domain]: { ...memories[domain] }
      };
      delete updatedMemories[domain][docId];
      setMemories(updatedMemories);
      if (selectedDoc === docId) {
        setSelectedDoc(null);
      }
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMemories)
      });
    }
  };

  const renderDocumentViewer = () => {
    if (!selectedDomain || !selectedDoc || !memories[selectedDomain]?.[selectedDoc]) return null;
    const doc = memories[selectedDomain][selectedDoc];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{doc.title}</h3>
            <button 
              onClick={() => setShowDocViewer(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-6">
              {/* Document Metadata */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Domain:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{doc.metadata.domain.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      doc.metadata.status === 'current' ? 'bg-green-100 text-green-800' :
                      doc.metadata.status === 'outdated' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {doc.metadata.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Version:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{doc.metadata.version}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {new Date(doc.metadata.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Summary</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{doc.summary.brief}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{doc.summary.detailed}</p>
                {doc.summary.key_insights.length > 0 && (
                  <div className="mt-2">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Key Insights</h5>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300">
                      {doc.summary.key_insights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Context Blocks */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Context Blocks</h4>
                <div className="space-y-4">
                  {doc.context_blocks.map((block, idx) => (
                    <div key={block.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Block {idx + 1}</span>
                        <span className={`px-2 text-xs rounded-full ${
                          block.metadata.confidence > 0.7 ? 'bg-green-100 text-green-800' :
                          block.metadata.confidence > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Confidence: {Math.round(block.metadata.confidence * 100)}%
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Raw Content</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {block.raw_content}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Main Points</h5>
                          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300">
                            {block.structured_content.main_points.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Entities & Concepts</h5>
                          <div className="flex flex-wrap gap-1">
                            {[...block.structured_content.entities, ...block.structured_content.concepts].map((item, i) => (
                              <span key={i} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTableView = () => {
    if (!selectedDomain) return null;
    const documents = Object.values(memories[selectedDomain] || {}).filter(doc => doc && doc.metadata?.status);
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Title', 'Description', 'Status', 'Blocks', 'Updated', 'Actions'].map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => header !== 'Actions' && setSortConfig({
                    field: header.toLowerCase(),
                    direction: sortConfig.field === header.toLowerCase() && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                >
                  <div className="flex items-center">
                    {header}
                    {header !== 'Actions' && sortConfig.field === header.toLowerCase() && (
                      <span className={`ml-1 inline-block transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => {
                  setSelectedDoc(doc.id);
                  setShowDocViewer(true);
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-2">📄</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{doc.description}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    doc.metadata.status === 'current' ? 'bg-green-100 text-green-800' :
                    doc.metadata.status === 'outdated' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {doc.metadata.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{doc.context_blocks.length}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(doc.metadata.timestamp).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={(e) => handleDeleteDocument(selectedDomain, doc.id, e)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSchemaView = () => (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="space-y-4">
        <div className="border dark:border-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Memory Store Schema</h3>
          <pre className="text-sm text-gray-600 dark:text-gray-300 overflow-auto">
            {JSON.stringify({
              "[domain: string]": {
                "[documentId: string]": {
                  "id": "string (required)",
                  "title": "string (required)",
                  "description": "string (required)",
                  "metadata": {
                    "tags": "string[] (required)",
                    "domain": "string[] (required)",
                    "timestamp": "ISO date string (required)",
                    "version": "string (required)",
                    "status": "'current' | 'outdated' | 'deprecated' (required)"
                  },
                  "context_blocks": [
                    {
                      "id": "string (required)",
                      "raw_content": "string (required)",
                      "structured_content": {
                        "main_points": "string[] (required)",
                        "entities": "string[] (required)",
                        "concepts": "string[] (required)"
                      },
                      "metadata": {
                        "tags": "string[] (required)",
                        "domain": "string[] (required)",
                        "timestamp": "ISO date string (required)",
                        "status": "'current' | 'outdated' | 'deprecated' (required)",
                        "confidence": "number (0-1) (required)"
                      },
                      "context": {
                        "summary": "string (required)",
                        "related_blocks": "string[] (required)"
                      }
                    }
                  ],
                  "summary": {
                    "brief": "string (required)",
                    "detailed": "string (required)",
                    "key_insights": "string[] (required)"
                  },
                  "relationships": {
                    "prerequisites": "string[] (required)",
                    "related_docs": "string[] (required)"
                  }
                }
              }
            }, null, 2)}
          </pre>
        </div>

        <div className="border dark:border-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Example Document</h3>
          <pre className="text-sm text-gray-600 dark:text-gray-300 overflow-auto">
            {JSON.stringify({
              "technical": {
                "doc123": {
                  "id": "doc123",
                  "title": "Understanding Memory Store",
                  "description": "A guide to using the memory store system",
                  "metadata": {
                    "tags": ["guide", "technical"],
                    "domain": ["technical", "documentation"],
                    "timestamp": "2024-01-20T12:00:00Z",
                    "version": "1.0",
                    "status": "current"
                  },
                  "context_blocks": [
                    {
                      "id": "block1",
                      "raw_content": "The memory store is a hierarchical system for organizing knowledge.",
                      "structured_content": {
                        "main_points": ["Hierarchical organization", "Knowledge storage"],
                        "entities": ["memory store", "system"],
                        "concepts": ["organization", "hierarchy"]
                      },
                      "metadata": {
                        "tags": ["architecture", "overview"],
                        "domain": ["technical"],
                        "timestamp": "2024-01-20T12:00:00Z",
                        "status": "current",
                        "confidence": 0.95
                      },
                      "context": {
                        "summary": "Introduction to memory store architecture",
                        "related_blocks": []
                      }
                    }
                  ],
                  "summary": {
                    "brief": "Overview of the memory store system",
                    "detailed": "Comprehensive guide explaining the memory store architecture and usage",
                    "key_insights": ["Hierarchical structure", "Domain-based organization"]
                  },
                  "relationships": {
                    "prerequisites": [],
                    "related_docs": []
                  }
                }
              }
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );

  const renderErrorModal = () => {
    const totalPages = Math.ceil(validationErrors.length / ERRORS_PER_PAGE);
    const startIdx = (currentErrorPage - 1) * ERRORS_PER_PAGE;
    const endIdx = startIdx + ERRORS_PER_PAGE;
    const currentErrors = validationErrors.slice(startIdx, endIdx);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Validation Errors ({validationErrors.length})
            </h3>
            <button 
              onClick={() => setShowErrorModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentErrors.map((error, idx) => (
                <div 
                  key={startIdx + idx}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-red-500 dark:text-red-400 font-mono mt-1">
                      #{startIdx + idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {error.path}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        {error.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentErrorPage(1)}
                  disabled={currentErrorPage === 1}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  ⟪
                </button>
                <button
                  onClick={() => setCurrentErrorPage(p => Math.max(1, p - 1))}
                  disabled={currentErrorPage === 1}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  ←
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {currentErrorPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentErrorPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentErrorPage === totalPages}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  →
                </button>
                <button
                  onClick={() => setCurrentErrorPage(totalPages)}
                  disabled={currentErrorPage === totalPages}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  ⟫
                </button>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIdx + 1}-{Math.min(endIdx, validationErrors.length)} of {validationErrors.length}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderImportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Memory Store</h3>
          <button 
            onClick={() => setShowImportModal(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6">
          {importState.status === 'idle' ? (
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 text-4xl">📥</div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Select a JSON file to import into the memory store
                </p>
              </div>
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                <span>Choose File</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".json"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <span>Validation Progress</span>
                  <span>{Math.round(importState.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      importState.status === 'error' ? 'bg-red-600' :
                      importState.status === 'success' ? 'bg-green-600' :
                      'bg-blue-600'
                    }`}
                    style={{ width: `${importState.progress}%` }}
                  />
                </div>
              </div>

              {importState.currentField && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Validating: {importState.currentField}
                </p>
              )}

              {importState.status !== 'validating' && (
                <div className="mt-4">
                  {validationErrors.length > 0 ? (
                    <div className="mb-4">
                      <div className="text-red-600 dark:text-red-400 font-medium mb-2">
                        Found {validationErrors.length} validation errors:
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {validationErrors.map((error, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-sm mb-2">
                            <span className="text-red-500">•</span>
                            <div>
                              <span className="font-medium">{error.path}:</span>
                              <span className="text-gray-600 dark:text-gray-300"> {error.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-green-600 dark:text-green-400 text-center mb-4">
                      ✓ Validation successful! Ready to import.
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      disabled={importState.status !== 'success'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Left sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Memory Store</h2>
          <div className="space-y-2">
            {Object.keys(memories).map(domain => (
              <div
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-left group cursor-pointer ${
                  selectedDomain === domain
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="mr-2">📁</span>
                <span className="truncate flex-1">{domain}</span>
                <span className="ml-auto flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {Object.keys(memories[domain] || {}).length}
                  </span>
                  <button
                    onClick={(e) => handleDeleteDomain(domain, e)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                    aria-label={`Delete ${domain} domain`}
                  >
                    🗑️
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'table'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="mr-1">📊</span>
                Table View
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'schema'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="mr-1">⚙️</span>
                Schema
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search..."
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                onClick={handleImportClick}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                <span className="mr-1">📥</span>
                Import JSON
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                <span className="mr-1">📤</span>
                Export JSON
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'table' && renderTableView()}
          {activeTab === 'schema' && renderSchemaView()}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {showDocViewer && renderDocumentViewer()}

      {/* Status Bar */}
      {validationErrors.length > 0 && (
        <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-800 overflow-hidden">
          <div className="p-3 bg-red-50 dark:bg-red-900 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-red-600 dark:text-red-200 font-medium">
                ⚠️ {validationErrors.length} validation error{validationErrors.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  setCurrentErrorPage(1);
                  setShowErrorModal(true);
                }}
                className="ml-2 text-sm text-red-600 dark:text-red-200 hover:text-red-800 dark:hover:text-red-100"
              >
                View All
              </button>
            </div>
            <button
              onClick={() => setValidationErrors([])}
              className="text-red-600 dark:text-red-200 hover:text-red-800 dark:hover:text-red-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          <div className="p-2 divide-y divide-gray-200 dark:divide-gray-700">
            {validationErrors.slice(0, 3).map((error, idx) => (
              <div 
                key={idx}
                className="py-2 text-sm"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{error.path}</div>
                <div className="text-gray-600 dark:text-gray-300">{error.message}</div>
              </div>
            ))}
            {validationErrors.length > 3 && (
              <div 
                className="py-2 text-center text-sm text-red-600 dark:text-red-200 cursor-pointer hover:text-red-800 dark:hover:text-red-100"
                onClick={() => {
                  setCurrentErrorPage(1);
                  setShowErrorModal(true);
                }}
              >
                View {validationErrors.length - 3} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && renderErrorModal()}

      {/* Import Modal */}
      {showImportModal && renderImportModal()}
    </div>
  );
} 