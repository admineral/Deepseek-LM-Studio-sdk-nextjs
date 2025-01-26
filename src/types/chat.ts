export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    logprobs: null;
    finish_reason: string;
    message: ChatMessage;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  stats: {
    tokens_per_second: number;
    time_to_first_token: number;
    generation_time: number;
    stop_reason: string;
  };
  model_info: {
    arch: string;
    quant: string;
    format: string;
    context_length: number;
  };
  runtime: {
    name: string;
    version: string;
    supported_formats: string[];
  };
} 