import { NextResponse } from 'next/server';
import { Model } from '@/types/models';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

export async function GET(
  request: Request,
  context: { params: Promise<{ modelId: string }> }
) {
  try {
    // Await the params
    const { modelId } = await context.params;
    
    // Call the actual LM Studio API for specific model
    const response = await fetch(`${LM_STUDIO_URL}/api/v0/models/${modelId}`);
    
    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    // Parse and validate the response matches our Model type
    const model: Model = await response.json();
    
    // Ensure we have all required fields
    if (!model.id || !model.type || !model.state) {
      throw new Error('Invalid model data received from LM Studio');
    }

    return NextResponse.json(model);
    
  } catch (error) {
    console.error('Error fetching model from LM Studio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model from LM Studio' },
      { status: 500 }
    );
  }
} 