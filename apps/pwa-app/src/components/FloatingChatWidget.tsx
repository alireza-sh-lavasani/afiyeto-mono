import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import {
  MainContainer,
  Sidebar,
  ConversationList,
  Conversation,
  ChatContainer,
  ConversationHeader,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import {
  Bot,
  Sparkles,
  X,
  Plus,
  Trash2,
  BookOpen,
  MessageSquare,
  Maximize2,
  Minimize2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useChatService, stripMarkdown, ChatThreadDoc, ChatMessageDoc } from '../services/chat.service.ts';
import { OfflineRAGService } from '../services/rag.service.ts';

export const FloatingChatWidget: React.FC = () => {
  const { t } = useTranslation();
  const {
    threads,
    loading: threadsLoading,
    createThread,
    getThreadMessages,
    addMessage,
    updateMessageText,
    updateThreadTitle,
    deleteThread,
  } = useChatService();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);

  // Initialize or select active thread when widget opens or threads load
  useEffect(() => {
    if (threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0]._id);
    }
  }, [threads, activeThreadId]);

  // Load messages whenever active thread changes
  useEffect(() => {
    if (activeThreadId) {
      getThreadMessages(activeThreadId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Create a new consultation thread
  const handleCreateNewThread = async () => {
    const newThread = await createThread(t('chat.newChat', { defaultValue: 'New Consultation' }));
    setActiveThreadId(newThread._id);
    setMessages([]);
  };

  // Delete a consultation thread
  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (confirm(t('chat.confirmDelete', { defaultValue: 'Are you sure you want to delete this consultation history?' }))) {
      await deleteThread(threadId);
      if (activeThreadId === threadId) {
        const remaining = threads.filter(t => t._id !== threadId);
        setActiveThreadId(remaining.length > 0 ? remaining[0]._id : null);
      }
    }
  };

  // Handle sending a message and invoking the local RAG engine
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;

    let threadId = activeThreadId;
    if (!threadId) {
      const newThread = await createThread();
      threadId = newThread._id;
      setActiveThreadId(threadId);
    }

    // 1. Persist User Message
    const userMsg = await addMessage(threadId, 'user', text);
    setMessages(prev => [...prev, userMsg]);

    setIsGenerating(true);

    try {
      // 2. Initialize RAG Service
      const rag = OfflineRAGService.getInstance();
      await rag.init();

      // Asynchronously summarize main question into concise title using LLM for first query
      if (messages.length === 0) {
        (async () => {
          try {
            let titleSummary = '';
            await rag.generateCompletion(
              [
                {
                  role: 'system',
                  content:
                    'Summarize the user question into a clear 3 to 6 word title. Output ONLY the short title. No quotes, no markdown, no punctuation.',
                },
                { role: 'user', content: text },
              ],
              (token) => {
                titleSummary += token;
              }
            );
            const cleanTitle = stripMarkdown(titleSummary).replace(/^["']|["']$/g, '').trim();
            if (cleanTitle && cleanTitle.length >= 3) {
              await updateThreadTitle(threadId, cleanTitle);
            }
          } catch (err) {
            // Silently keep clean first question snippet if title LLM call fails
          }
        })();
      }

      // 3. Determine if query is medical or non-medical
      const lowerText = text.toLowerCase();
      const isGeneralQuery =
        lowerText.includes('model') ||
        lowerText.includes('version') ||
        lowerText.includes('who are you') ||
        lowerText.includes('what are you') ||
        lowerText.includes('introduce') ||
        lowerText.includes('hello') ||
        lowerText.includes('hi') ||
        lowerText.includes('your name');

      let citations: string[] = [];
      let retrievedContext = '';

      if (!isGeneralQuery) {
        const vector = await rag.getEmbedding(text);
        const hits = await rag.searchGuidelines(vector, 3);
        citations = hits.map((h) => h.document.title);
        retrievedContext = hits
          .map((h, idx) => `[Guideline ${idx + 1}: ${h.document.title}] ${h.document.content}`)
          .join('\n\n');
      }

      // 4. Create initial Assistant Message placeholder in PouchDB
      const assistantMsg = await addMessage(
        threadId,
        'assistant',
        '...',
        citations.length > 0 ? citations : undefined,
        'Afiyet Medical AI'
      );
      setMessages((prev) => [...prev, assistantMsg]);

      // 5. Build System Prompt & Conversational History Context
      const systemPrompt = `You are Afiyet Medical AI, an offline clinical decision-support mentor for doctors and health workers in rural health posts.
- For medical and healthcare queries: Explain concepts in plain English first (followed by standard medical terms in parentheses), and refer to the retrieved clinical guidelines when applicable.
- For non-medical queries (such as model identity, technical questions, greetings, or general knowledge): Answer directly using your own general knowledge without referencing medical guidelines or clinical protocols.
${retrievedContext ? `\nRetrieved Guidelines Context:\n${retrievedContext}` : ''}`;

      const historyMessages = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const fullPromptMessages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: text },
      ];

      // 6. Stream tokens into the Assistant Message
      let accumulatedText = '';
      await rag.generateCompletion(fullPromptMessages, async (token) => {
        accumulatedText += token;
        // Update state in real-time
        setMessages(prev =>
          prev.map(m => (m._id === assistantMsg._id ? { ...m, text: accumulatedText } : m))
        );
      });

      // 7. Persist final assistant response to PouchDB
      if (accumulatedText) {
        await updateMessageText(assistantMsg._id, accumulatedText, citations);
      }
    } catch (err: any) {
      console.error('[Chat Widget] Error during AI response generation:', err);
      const errorMsg = t('chat.errorText', { defaultValue: 'Sorry, unable to process request using local RAG engine.' });
      await addMessage(threadId, 'assistant', errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredThreads = threads.filter(th =>
    th.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    th.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm rounded-full shadow-2xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/20"
          title={t('chat.openTooltip', { defaultValue: 'Open Clinical AI Consultation' })}
        >
          <div className="relative">
            <Bot className="h-6 w-6 animate-pulse" />
            <Sparkles className="h-3 w-3 text-amber-300 absolute -top-1 -right-1" />
          </div>
          <span className="hidden sm:inline font-semibold">
            {t('chat.fabLabel', { defaultValue: 'AI Consultation' })}
          </span>
          {threads.length > 0 && (
            <span className="ml-0.5 px-2 py-0.5 text-[10px] bg-white/20 text-white rounded-full font-bold">
              {threads.length}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isExpanded
              ? 'inset-4 md:inset-10'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[850px] h-[650px] max-h-[90vh]'
          } bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl`}
        >
          {/* Top Bar Header */}
          <div className="h-14 bg-card border-b border-border/80 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <span>{t('chat.headerTitle', { defaultValue: 'Afiyet Clinical AI Assistant' })}</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-primary/10 text-primary border border-primary/20 rounded">
                    Offline RAG
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t('chat.headerSubtitle', { defaultValue: 'MedGemma LLM + MedCPT Guideline Retrieval' })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateNewThread}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title={t('chat.newChat', { defaultValue: 'New Consultation' })}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors hidden sm:block"
                title={isExpanded ? 'Restore' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title={t('chat.close', { defaultValue: 'Close' })}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main ChatScope Container */}
          <div className="flex-1 overflow-hidden relative text-foreground">
            <MainContainer className="h-full border-0 bg-background text-foreground">
              {/* Sidebar with Consultations History */}
              <Sidebar position="left" scrollable={true} className="w-64 border-r border-border bg-card/40">
                <div className="p-3 border-b border-border/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t('chat.pastConsultations', { defaultValue: 'Consultations' })}
                  </span>
                  <button
                    onClick={handleCreateNewThread}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('chat.new', { defaultValue: 'New' })}</span>
                  </button>
                </div>

                <ConversationList className="bg-transparent">
                  {filteredThreads.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                      <span>{t('chat.noThreads', { defaultValue: 'No past consultations recorded.' })}</span>
                    </div>
                  ) : (
                    filteredThreads.map((th) => {
                      const cleanSubtext = stripMarkdown(th.lastMessageText);
                      const isAiSubtext =
                        cleanSubtext.toLowerCase().includes('hello!') ||
                        cleanSubtext.toLowerCase().includes('afiyet') ||
                        cleanSubtext.toLowerCase().includes('clinical response') ||
                        cleanSubtext.toLowerCase().includes('regarding your query') ||
                        cleanSubtext.toLowerCase().includes('based on retrieved') ||
                        cleanSubtext.toLowerCase().includes('while both can cause');

                      const infoDisplay =
                        cleanSubtext && !isAiSubtext
                          ? cleanSubtext
                          : new Date(th.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <Conversation
                          key={th._id}
                          name={stripMarkdown(th.title)}
                          info={infoDisplay}
                          active={th._id === activeThreadId}
                          onClick={() => setActiveThreadId(th._id)}
                          className="hover:bg-secondary/60 rounded-xl my-1 transition-all"
                        >
                          <Conversation.Operations>
                            <button
                              onClick={(e) => handleDeleteThread(e, th._id)}
                              className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                              title={t('chat.deleteThread', { defaultValue: 'Delete Thread' })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </Conversation.Operations>
                        </Conversation>
                      );
                    })
                  )}
                </ConversationList>
              </Sidebar>

              {/* Chat Messages View */}
              <ChatContainer className="bg-background">
                <ConversationHeader className="bg-card border-b border-border">
                  <ConversationHeader.Content
                    userName={
                      stripMarkdown(threads.find((t) => t._id === activeThreadId)?.title) ||
                      t('chat.newChat', { defaultValue: 'New Consultation' })
                    }
                    info={t('chat.ragActiveStatus', { defaultValue: 'Offline Local Memory & Guidelines Active' })}
                  />
                </ConversationHeader>

                <MessageList
                  className="bg-background p-4 space-y-4"
                  typingIndicator={
                    isGenerating ? (
                      <TypingIndicator content={t('chat.aiThinking', { defaultValue: 'Afiyet AI is analyzing guidelines...' })} />
                    ) : null
                  }
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-4">
                      <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center text-primary">
                        <Bot className="h-8 w-8" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="font-bold text-sm text-foreground">
                          {t('chat.welcomeTitle', { defaultValue: 'Ask Afiyet Clinical AI' })}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t(
                            'chat.welcomeDesc',
                            { defaultValue: 'Ask any medical question. The local LLM will retrieve gold-standard StatPearls & WHO guidelines from tablet memory.' }
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg._id} className="space-y-1.5">
                        <Message
                          avatarPosition="never"
                          model={{
                            sentTime: new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            }),
                            sender: msg.senderName,
                            direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
                            position: 'single',
                          }}
                        >
                          <Message.CustomContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed space-y-1">
                              <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                          </Message.CustomContent>
                        </Message>

                        {/* Render Citations / Evidence Badges for Assistant Messages */}
                        {msg.sender === 'assistant' && msg.citations && msg.citations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1 px-2">
                            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                              <BookOpen className="h-3 w-3 text-primary" />
                              <span>{t('chat.citations', { defaultValue: 'Citations:' })}</span>
                            </span>
                            {msg.citations.map((cit, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-semibold rounded-md"
                              >
                                {cit}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </MessageList>

                <MessageInput
                  placeholder={t('chat.inputPlaceholder', { defaultValue: 'Type clinical question (e.g. Coartem dosage for 12kg child)...' })}
                  onSend={handleSendMessage}
                  disabled={isGenerating}
                  attachButton={false}
                  className="bg-card border-t border-border/80"
                />
              </ChatContainer>
            </MainContainer>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;
