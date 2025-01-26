import { NextResponse } from 'next/server';
import { ChatCompletionRequest, ChatCompletionResponse } from '@/types/chat';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

export async function POST(request: Request) {
  try {
    const body: ChatCompletionRequest = await request.json();

    // Validate request body
    if (!body.model || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Forward the request to LM Studio
    const response = await fetch(`${LM_STUDIO_URL}/api/v0/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? -1,
        stream: body.stream ?? false
      })
    });

    // If not OK, try to get error message from response
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `LM Studio API error: ${response.status}`;
      console.error('LM Studio API error:', errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Handle streaming response
    if (body.stream) {
      const stream = response.body;
      if (!stream) {
        throw new Error('No response stream available');
      }
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const data: ChatCompletionResponse = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in chat completion:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get chat completion' },
      { status: 500 }
    );
  }
} 