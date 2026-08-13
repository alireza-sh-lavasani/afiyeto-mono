import { nanoid } from 'nanoid';
import { useState, useEffect, useCallback } from 'react';
import { localChatDb } from '../db/pouchdb.ts';

export interface ChatThreadDoc {
  _id: string;
  _rev?: string;
  type: 'chat_thread';
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageText: string;
}

export interface ChatMessageDoc {
  _id: string;
  _rev?: string;
  type: 'chat_message';
  threadId: string;
  sender: 'user' | 'assistant';
  senderName: string;
  text: string;
  citations?: string[];
  createdAt: string;
}

export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/#+\s*/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/`{1,3}.*?`{1,3}/gs, '')
    .replace(/^[•\-\*]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

export function useChatService() {
  const [threads, setThreads] = useState<ChatThreadDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch all chat threads ordered by updatedAt descending
  const refreshThreads = useCallback(async () => {
    try {
      const res = await localChatDb.allDocs({ include_docs: true });
      const threadDocs = res.rows
        .map(row => row.doc)
        .filter((doc): doc is ChatThreadDoc => doc?.type === 'chat_thread')
        .map(doc => {
          // Clean up old thread lastMessageText if it contains AI assistant response text
          if (doc.lastMessageText) {
            const lower = doc.lastMessageText.toLowerCase();
            if (
              lower.includes('hello!') ||
              lower.includes('afiyet clinical ai') ||
              lower.includes('clinical response') ||
              lower.includes('regarding your query') ||
              lower.includes('based on retrieved') ||
              lower.includes('while both can cause')
            ) {
              doc.lastMessageText = '';
            }
          }
          return doc;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setThreads(threadDocs);
    } catch (err) {
      console.error('[Chat Service] Error fetching threads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  // Create a new thread
  const createThread = async (title = 'New Consultation'): Promise<ChatThreadDoc> => {
    const now = new Date().toISOString();
    const newThread: ChatThreadDoc = {
      _id: `thread_${nanoid()}`,
      type: 'chat_thread',
      title,
      createdAt: now,
      updatedAt: now,
      lastMessageText: '',
    };
    await localChatDb.put(newThread);
    await refreshThreads();
    return newThread;
  };

  // Get messages for a specific thread ordered by createdAt ascending
  const getThreadMessages = async (threadId: string): Promise<ChatMessageDoc[]> => {
    try {
      const res = await localChatDb.allDocs({ include_docs: true });
      return res.rows
        .map(row => row.doc)
        .filter((doc): doc is ChatMessageDoc => doc?.type === 'chat_message' && doc.threadId === threadId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (err) {
      console.error('[Chat Service] Error fetching messages:', err);
      return [];
    }
  };

  // Add a message to thread and update thread metadata
  const addMessage = async (
    threadId: string,
    sender: 'user' | 'assistant',
    text: string,
    citations?: string[],
    senderName?: string
  ): Promise<ChatMessageDoc> => {
    const now = new Date().toISOString();
    const msgId = `msg_${nanoid()}`;
    const messageDoc: ChatMessageDoc = {
      _id: msgId,
      type: 'chat_message',
      threadId,
      sender,
      senderName: senderName || (sender === 'user' ? 'Doctor' : 'Afiyet Medical AI'),
      text,
      citations,
      createdAt: now,
    };
    await localChatDb.put(messageDoc);

    // Update thread's metadata ONLY for user queries (never from AI assistant responses)
    try {
      const threadDoc = await localChatDb.get<ChatThreadDoc>(threadId);
      threadDoc.updatedAt = now;

      if (sender === 'user') {
        const cleanSnippet = stripMarkdown(text);
        threadDoc.lastMessageText = cleanSnippet.substring(0, 80);

        if (threadDoc.title === 'New Consultation' || !threadDoc.title) {
          threadDoc.title = cleanSnippet.length > 50 ? cleanSnippet.substring(0, 50) + '...' : cleanSnippet;
        }
      }

      await localChatDb.put(threadDoc);
    } catch (e) {
      console.warn('[Chat Service] Could not update thread header:', e);
    }

    refreshThreads();
    return messageDoc;
  };

  // Update existing message text in place (for live token streaming)
  const updateMessageText = async (messageId: string, text: string, citations?: string[]) => {
    try {
      const msg = await localChatDb.get<ChatMessageDoc>(messageId);
      msg.text = text;
      if (citations) msg.citations = citations;
      await localChatDb.put(msg);

      // Touch thread updatedAt timestamp only without overwriting lastMessageText
      try {
        const threadDoc = await localChatDb.get<ChatThreadDoc>(msg.threadId);
        threadDoc.updatedAt = new Date().toISOString();
        await localChatDb.put(threadDoc);
      } catch (e) {}

      refreshThreads();
    } catch (err) {
      console.error('[Chat Service] Error updating message text:', err);
    }
  };

  // Delete a thread and its messages
  const deleteThread = async (threadId: string) => {
    try {
      const messages = await getThreadMessages(threadId);
      for (const msg of messages) {
        await localChatDb.remove(msg);
      }
      const thread = await localChatDb.get<ChatThreadDoc>(threadId);
      await localChatDb.remove(thread);
      await refreshThreads();
    } catch (err) {
      console.error('[Chat Service] Error deleting thread:', err);
    }
  };

  // Update a thread's title (e.g., from LLM title summarization of the user question)
  const updateThreadTitle = async (threadId: string, newTitle: string) => {
    try {
      const clean = stripMarkdown(newTitle).replace(/^["']|["']$/g, '').trim();
      if (!clean) return;
      const threadDoc = await localChatDb.get<ChatThreadDoc>(threadId);
      threadDoc.title = clean.length > 50 ? clean.substring(0, 50) + '...' : clean;
      threadDoc.updatedAt = new Date().toISOString();
      await localChatDb.put(threadDoc);
      refreshThreads();
    } catch (e) {
      console.warn('[Chat Service] Could not update thread title:', e);
    }
  };

  return {
    threads,
    loading,
    refreshThreads,
    createThread,
    getThreadMessages,
    addMessage,
    updateMessageText,
    updateThreadTitle,
    deleteThread,
  };
}
