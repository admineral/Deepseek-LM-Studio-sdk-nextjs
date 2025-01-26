export interface ContextBlock {
  id: string;                  // Unique identifier for the block
  raw_content: string;         // Original unstructured content
  structured_content: {
    main_points: string[];     // Key points extracted from the content
    entities: string[];        // Important entities mentioned
    concepts: string[];        // Core concepts discussed
  };
  metadata: {
    tags: string[];           // General classification tags
    domain: string[];         // Knowledge domains (e.g., "tech", "science")
    timestamp: string;        // When this block was created
    status: 'current' | 'outdated' | 'deprecated';  // Content status
    confidence: number;       // Confidence in the information (0-1)
    source?: string;         // Where this information came from
  };
  context: {
    summary: string;         // Brief summary of this block
    parent_id?: string;      // ID of the larger context block this belongs to
    related_blocks: string[]; // IDs of related context blocks
    sequence_index?: number; // Position in a sequence of related blocks
  };
  embeddings?: {            // For semantic search
    vector: number[];       // Vector representation
    model: string;         // Model used for embedding
  };
}

export interface KnowledgeDocument {
  id: string;              // Document identifier
  title: string;           // Document title
  description: string;     // Brief description
  context_blocks: ContextBlock[];  // Individual context blocks
  metadata: {
    tags: string[];       // Document-level tags
    domain: string[];     // Document-level domains
    timestamp: string;    // Document creation time
    version: string;      // Document version
    status: 'current' | 'outdated' | 'deprecated';
  };
  summary: {
    brief: string;       // One-line summary
    detailed: string;    // Detailed summary
    key_insights: string[]; // Main takeaways
  };
  relationships: {
    prerequisites: string[];  // IDs of documents that should be understood first
    related_docs: string[];  // IDs of related documents
    supersedes?: string[];   // IDs of documents this replaces
    superseded_by?: string[]; // IDs of documents that replace this
  };
}

export interface MemoryStore {
  [domain: string]: {     // Top-level organization by domain
    [docId: string]: KnowledgeDocument;
  };
} 