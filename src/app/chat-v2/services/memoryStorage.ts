import { MemoryStore, KnowledgeDocument, ContextBlock } from '../types/memory';

export const MemoryStorage = {
  writeMemory: (store: MemoryStore, content: string, domain: string, metadata?: any): MemoryStore => {
    const timestamp = new Date().toISOString();
    const docId = `doc_${Date.now()}`;
    
    const contextBlock: ContextBlock = {
      id: `block_${Date.now()}`,
      raw_content: content,
      structured_content: {
        main_points: [],
        entities: [],
        concepts: []
      },
      metadata: {
        tags: metadata?.tags || [],
        domain: [domain],
        timestamp,
        status: 'current',
        confidence: 1.0
      },
      context: {
        summary: '',
        related_blocks: []
      }
    };

    const document: KnowledgeDocument = {
      id: docId,
      title: content.split('\n')[0].slice(0, 50) + (content.length > 50 ? '...' : ''),
      description: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
      context_blocks: [contextBlock],
      metadata: {
        tags: metadata?.tags || [],
        domain: [domain],
        timestamp,
        version: '1.0',
        status: 'current'
      },
      summary: {
        brief: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
        detailed: content,
        key_insights: []
      },
      relationships: {
        prerequisites: [],
        related_docs: []
      }
    };

    return {
      ...store,
      [domain]: {
        ...(store[domain] || {}),
        [docId]: document
      }
    };
  },

  searchMemory: (store: MemoryStore, query: string, domain?: string, filter?: any): KnowledgeDocument[] => {
    const results: KnowledgeDocument[] = [];
    const queryLower = query.toLowerCase();
    
    // If domain is specified, only search in that domain
    // Otherwise, search in domains that match the query or all domains
    const domains = domain 
      ? [domain]
      : Object.keys(store).filter(d => !query || d.toLowerCase().includes(queryLower));

    for (const d of domains) {
      const docs = store[d] || {};
      for (const docId of Object.keys(docs)) {
        const doc = docs[docId];
        
        // Basic text search in content and metadata
        const matchesQuery = 
          d.toLowerCase().includes(queryLower) || // Match domain name
          doc.title.toLowerCase().includes(queryLower) ||
          doc.description.toLowerCase().includes(queryLower) ||
          doc.context_blocks.some(block => 
            block.raw_content.toLowerCase().includes(queryLower)
          ) ||
          doc.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower));

        // Apply filters if provided
        const matchesFilter = !filter || (
          (!filter.tags || filter.tags.some((tag: string) => doc.metadata.tags.includes(tag))) &&
          (!filter.before || new Date(doc.metadata.timestamp) < new Date(filter.before)) &&
          (!filter.after || new Date(doc.metadata.timestamp) > new Date(filter.after))
        );

        if (matchesQuery && matchesFilter) {
          results.push(doc);
        }
      }
    }

    return results;
  }
}; 