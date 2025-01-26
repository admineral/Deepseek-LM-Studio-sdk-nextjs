import fs from 'fs';
import path from 'path';
import { MemoryStore, KnowledgeDocument } from '@/app/chat-v2/types/memory';

const MEMORY_FILE = path.join(process.cwd(), 'memory-store.json');

function loadMemories(): MemoryStore {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      return {};
    }
    const data = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading memory:', error);
    return {};
  }
}

function saveMemories(memories: MemoryStore): void {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
  } catch (error) {
    console.error('Error saving memory:', error);
  }
}

export async function GET() {
  const memories = loadMemories();
  return Response.json(memories);
}

export async function POST(request: Request) {
  const memories = await request.json();
  saveMemories(memories);
  return Response.json({ success: true });
} 