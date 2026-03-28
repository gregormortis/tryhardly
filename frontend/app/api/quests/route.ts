import { NextResponse } from 'next/server';

// Mock quest data for now
const mockQuests = [
  {
    id: 1,
    title: 'Build a Responsive Website',
    description: 'Create a fully responsive landing page for a startup',
    difficulty: 'EXPERT',
    reward: 500,
    xpReward: 250,
    status: 'OPEN',
    category: 'Development',
    icon: '💻'
  },
  {
    id: 2,
    title: 'Design Logo Package',
    description: 'Create a complete brand identity including logo variations',
    difficulty: 'HARD',
    reward: 300,
    xpReward: 150,
    status: 'OPEN',
    category: 'Design',
    icon: '🎨'
  },
  {
    id: 3,
    title: 'Write Blog Post Series',
    description: 'Create 5 SEO-optimized blog posts about tech trends',
    difficulty: 'MEDIUM',
    reward: 200,
    xpReward: 100,
    status: 'OPEN',
    category: 'Content',
    icon: '✍️'
  }
];

export async function GET() {
  return NextResponse.json({ quests: mockQuests });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ success: true, quest: { id: Date.now(), ...body } });
}
