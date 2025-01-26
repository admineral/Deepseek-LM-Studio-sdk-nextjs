import { NextResponse } from 'next/server';
import { Model, ModelsResponse } from '@/types/models';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

export async function GET() {
  try {
    // Call the actual LM Studio API
    const response = await fetch(`${LM_STUDIO_URL}/api/v0/models`);
    
    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    const data: ModelsResponse = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching models from LM Studio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models from LM Studio' },
      { status: 500 }
    );
  }
} 