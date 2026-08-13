import { renderHook, act } from '@testing-library/react';
import { useChatService } from '../chat.service.ts';
import { localChatDb } from '../../db/pouchdb.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/pouchdb.ts', () => {
  return {
    localChatDb: {
      put: vi.fn().mockResolvedValue({ ok: true }),
      get: vi.fn().mockImplementation((id: string) => {
        if (id.startsWith('thread_')) {
          return Promise.resolve({
            _id: id,
            type: 'chat_thread',
            title: 'New Consultation',
            createdAt: '2026-08-12T10:00:00.000Z',
            updatedAt: '2026-08-12T10:00:00.000Z',
            lastMessageText: '',
          });
        }
        return Promise.resolve({
          _id: id,
          type: 'chat_message',
          threadId: 'thread_1',
          sender: 'user',
          senderName: 'Doctor',
          text: 'Sample query',
          createdAt: '2026-08-12T10:00:00.000Z',
        });
      }),
      remove: vi.fn().mockResolvedValue({ ok: true }),
      allDocs: vi.fn().mockResolvedValue({
        rows: [
          {
            doc: {
              _id: 'thread_1',
              type: 'chat_thread',
              title: 'Malaria Treatment',
              createdAt: '2026-08-12T10:00:00.000Z',
              updatedAt: '2026-08-12T10:00:00.000Z',
              lastMessageText: 'Coartem dosage',
            },
          },
          {
            doc: {
              _id: 'msg_1',
              type: 'chat_message',
              threadId: 'thread_1',
              sender: 'user',
              senderName: 'Doctor',
              text: 'Coartem dosage for 12kg child?',
              createdAt: '2026-08-12T10:00:00.000Z',
            },
          },
        ],
      }),
    },
    patientsDb: { put: vi.fn(), allDocs: vi.fn() },
    examinationsDb: { put: vi.fn(), allDocs: vi.fn() },
    customEntriesDb: { put: vi.fn(), allDocs: vi.fn() },
    icd10Db: { put: vi.fn(), allDocs: vi.fn() },
  };
});

describe('Chat Service Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all chat threads from local PouchDB', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.refreshThreads();
    });

    expect(result.current.threads).toBeDefined();
    expect(result.current.threads.length).toBe(1);
    expect(result.current.threads[0].title).toBe('Malaria Treatment');
  });

  it('should create a new consultation thread and write to local DB', async () => {
    const { result } = renderHook(() => useChatService());

    let newThread: any;
    await act(async () => {
      newThread = await result.current.createThread('Pediatric Fever Protocol');
    });

    expect(newThread).toBeDefined();
    expect(newThread.title).toBe('Pediatric Fever Protocol');
    expect(localChatDb.put).toHaveBeenCalled();
  });

  it('should add a message to thread and update metadata', async () => {
    const { result } = renderHook(() => useChatService());

    let newMsg: any;
    await act(async () => {
      newMsg = await result.current.addMessage('thread_1', 'user', 'What is the dosage for Amoxicillin?');
    });

    expect(newMsg).toBeDefined();
    expect(newMsg.text).toBe('What is the dosage for Amoxicillin?');
    expect(localChatDb.put).toHaveBeenCalled();
  });
});
