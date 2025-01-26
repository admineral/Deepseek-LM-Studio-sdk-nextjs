export interface Model {
  id: string;
  object: string;
  type: 'vlm' | 'llm' | 'embeddings';
  publisher: string;
  arch: string;
  compatibility_type: string;
  quantization: string;
  state: 'loaded' | 'not-loaded';
  max_context_length: number;
}

export interface ModelsResponse {
  object: string;
  data: Model[];
} 