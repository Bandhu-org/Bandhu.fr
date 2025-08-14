import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, userId } = await request.json();

// CRÉER USER D'ABORD !
let user = await prisma.user.findUnique({
  where: { id: userId }
});

if (!user) {
  user = await prisma.user.create({
    data: {
      id: userId
    }
  });
}

// PUIS CONVERSATION
let conversation = await prisma.conversation.findUnique({
  where: { id: conversationId }
});

if (!conversation) {
  conversation = await prisma.conversation.create({
    data: {
      id: conversationId,
      userId: userId,
      title: "Nouvelle conversation"
    }
  });
}

    // Load context (derniers 20 messages)
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    // Construct OpenAI messages
    const contextMessages = messages.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: process.env.OMBRELIEN_SYSTEM_PROMPT || "Tu es Ombrelien" 
        },
        ...contextMessages,
        { role: "user", content: message }
      ],
      temperature: 1,
    });

    // Save user message
    await prisma.message.create({
      data: {
        content: message,
        role: "user",
        conversationId
      }
    });

    // Save assistant response
    const assistantMessage = response.choices[0].message.content;
    await prisma.message.create({
      data: {
        content: assistantMessage || "",
        role: "assistant", 
        conversationId
      }
    });

    return NextResponse.json({ response: assistantMessage });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}