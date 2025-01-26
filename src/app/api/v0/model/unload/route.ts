import { NextResponse } from 'next/server';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.identifier) {
      return NextResponse.json(
        { error: 'Model identifier is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${LM_STUDIO_URL}/api/v0/model/unload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: body.identifier })
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unloading model:', error);
    return NextResponse.json(
      { error: 'Failed to unload model' },
      { status: 500 }
    );
  }
} 