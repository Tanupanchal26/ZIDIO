import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import {
  Brain, Sparkles, FileText, Download, Search,
  Loader2, Mic, Bot, Video, CheckCircle2, Send,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { aiService } from '../services/ai.service';
import { useAIStore } from '../store/ai.store';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const CAPABILITIES = [
  { icon: Mic,          label: 'Transcription',  color: '#3B82F6', bg: '#EFF6FF' },
  { icon: Sparkles,     label: 'Summarization',  color: '#8B5CF6', bg: '#F5F3FF' },
  { icon: CheckCircle2, label: 'Action Items',   color: '#10B981', bg: '#ECFDF5' },
  { icon: FileText,     label: 'Minutes',        color: '#F59E0B', bg: '#FFFBEB' },
  { icon: Bot,          label: 'AI Assistant',   color: '#EF4444', bg: '#FEF2F2' },
  { icon: Search,       label: 'Semantic Search',color: '#06B6D4', bg: '#ECFEFF' },
];

const PROMPT_SUGGESTIONS = [
  'What were the key decisions made?',
  'Who is responsible for action items?',
  'Summarise the main blockers discussed',
  'What was agreed about the timeline?',
];

const AISummary = () => {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab]     = useState<'summary' | 'actions' | 'minutes'>('summary');
  const [chatMsg, setChatMsg]         = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching]     = useState(false);

  const store = useAIStore();

  const { data: meetingData, isLoading } = useQuery({
    queryKey: ['meetings-ai'],
    queryFn: () =>
      import('../services/meeting.service').then((m) =>
        m.meetingService.getAll({ limit: 30, status: 'ended' }).then((r: any) => r.data)
      ),
    staleTime: 60_000,
  });
  const meetings: any[] = meetingData?.data ?? [];

  const { data: aiResult, isLoading: aiLoading, isFetching: aiFetching } = useQuery({
    queryKey: ['ai-result', selectedId],
    queryFn: () => aiService.getResult(selectedId!).then((r) => r.data),
    enabled: !!selectedId,
    staleTime: 5 * 60_000,          // treat cached data as fresh for 5 min
    placeholderData: (prev) => prev, // stale-while-revalidate — keeps old data visible
    retry: 2,
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await aiService.searchMeetings(searchQuery);
      setSearchResults(data.results);
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const handleGenerateSummary = async () => {
    if (!selectedId) return;
    store.setGenerating(true);
    try {
      const { data: s } = await aiService.generateSummary(selectedId);
      store.setSummary(s.summary);
      const { data: a } = await aiService.getActionItems(selectedId);
      store.setActionItems(a.actionItems);
      toast.success('Summary generated');
    } catch { toast.error('Failed to generate summary'); }
    finally { store.setGenerating(false); }
  };

  const handleGenerateMinutes = async () => {
    if (!selectedId) return;
    try {
      const { data } = await aiService.generateMinutes(selectedId);
      store.setMinutes(data.minutes);
      setActiveTab('minutes');
      toast.success('Minutes generated');
    } catch { toast.error('Failed to generate minutes'); }
  };

  const handleChat = async (msg: string) => {
    if (!msg.trim() || !selectedId) return;
    setChatMsg('');
    setChatLoading(true);
    const updated = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(updated);
    try {
      const { data } = await aiService.assistantChat(selectedId, msg, chatHistory);
      setChatHistory([...updated, { role: 'assistant', content: data.reply }]);
    } catch { toast.error('Assistant error'); }
    finally { setChatLoading(false); }
  };

  const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const displaySummary = aiResult?.summary || store.summary;
  const displayMinutes = aiResult?.minutes || store.minutes;
  const displayActions = aiResult?.actionItems?.length ? aiResult.actionItems : store.actionItems;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#6366F1]" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[1.375rem] font-bold text-[#0F172A] tracking-tight">AI Meeting Intelligence</h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">Transcripts, summaries, and action items — powered by GPT-4o</p>
        </div>
        <Badge variant="primary" dot pulse>GPT-4o</Badge>
      </div>

      {/* Capabilities strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {CAPABILITIES.map(({ icon: Icon, label, color, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#EEF0F6] text-center"
            style={{ background: bg }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-[#EEF0F6]">
              <Icon size={14} style={{ color }} />
            </div>
            <span className="text-[11px] font-medium text-[#64748B] leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Semantic Search */}
      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: '1px solid #EEF0F6', boxShadow: '0 1px 3px rgba(15,23,42,0.04),0 4px 16px rgba(15,23,42,0.05)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Search size={13} className="text-[#6366F1]" />
          <span className="text-[13px] font-semibold text-[#0F172A]">Semantic Search</span>
          <span className="text-[11px] text-[#94A3B8]">— search by meaning, not keywords</span>
        </div>
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. What was decided about the infrastructure rollout?"
            className="input flex-1"
          />
          <Button size="sm" onClick={handleSearch} loading={searching} leftIcon={<Search size={12} />}>
            Search
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-[#EEF0F6] hover:border-[#6366F1]/30 hover:bg-[#F5F3FF] transition-all text-left"
              >
                <Video size={12} className="text-[#6366F1] shrink-0" />
                <p className="text-[12.5px] text-[#334155] flex-1 truncate">{r.title}</p>
                <span className="text-[10px] text-[#94A3B8]">{new Date(r.date).toLocaleDateString()}</span>
                <Badge variant="primary">{Math.round(r.score * 100)}%</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">

        {/* Meeting list */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">Past Meetings</p>
          {meetings.length === 0 ? (
            <p className="text-[12px] text-[#94A3B8] px-1">No ended meetings yet</p>
          ) : (
            meetings.map((m: any) => (
              <button
                key={m._id}
                onClick={() => { setSelectedId(m._id); setChatHistory([]); }}
                className={clsx(
                  'flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all w-full border',
                  selectedId === m._id
                    ? 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]'
                    : 'hover:bg-[#F8FAFC] border-transparent text-[#64748B] hover:text-[#334155]'
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] flex items-center justify-center shrink-0">
                  <Video size={11} className="text-[#8B5CF6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{m.title}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">{new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail area */}
        <div className="flex flex-col gap-4">
          {!selectedId ? (
            <div
              className="bg-white rounded-2xl flex flex-col items-center justify-center py-20 gap-4"
              style={{ border: '1px solid #EEF0F6', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#F5F3FF] border border-[#E9D5FF] flex items-center justify-center">
                <Brain size={22} className="text-[#8B5CF6] opacity-70" />
              </div>
              <p className="text-[13px] text-[#64748B]">Select a meeting to view AI intelligence</p>
            </div>
          ) : aiLoading && !aiResult ? (
            // Skeleton — shown only on first load (no cached data yet)
            <div className="flex flex-col gap-3">
              {[80, 60, 90, 50].map((w, i) => (
                <div key={i} className="h-4 rounded-lg bg-[#F1F5F9] animate-pulse" style={{ width: `${w}%` }} />
              ))}
              <div className="h-32 rounded-2xl bg-[#F1F5F9] animate-pulse mt-2" />
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" loading={store.isGenerating} leftIcon={<Sparkles size={12} />} onClick={handleGenerateSummary}>
                  Generate Summary
                </Button>
                <Button variant="secondary" size="sm" leftIcon={<FileText size={12} />} onClick={handleGenerateMinutes}>
                  Minutes
                </Button>
                {aiFetching && !aiLoading && (
                  <Loader2 size={13} className="animate-spin text-[#94A3B8] ml-1" />
                )}
                {displaySummary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Download size={12} />}
                    className="ml-auto"
                    onClick={() => downloadMarkdown(displaySummary, 'summary.md')}
                  >
                    Export
                  </Button>
                )}
              </div>

              {/* Tab switcher */}
              <div
                className="flex gap-1 p-1 rounded-xl w-fit"
                style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
              >
                {(['summary', 'actions', 'minutes'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx(
                      'px-4 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all',
                      activeTab === tab
                        ? 'bg-white text-[#0F172A] shadow-sm border border-[#E2E8F0]'
                        : 'text-[#64748B] hover:text-[#334155]'
                    )}
                  >
                    {tab}
                    {tab === 'actions' && displayActions.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#6366F1] text-[9px]">
                        {displayActions.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div
                className="bg-white rounded-2xl p-5"
                style={{ border: '1px solid #EEF0F6', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}
              >
                {activeTab === 'summary' && (
                  displaySummary ? (
                    <div className="prose prose-sm max-w-none text-[#334155] text-[13px] leading-relaxed [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-[#0F172A] [&_h2]:mt-4 [&_h2]:mb-2">
                      <ReactMarkdown>{displaySummary}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <Sparkles size={22} className="text-[#CBD5E1]" />
                      <p className="text-[13px] text-[#94A3B8]">Click "Generate Summary" to analyse this meeting</p>
                    </div>
                  )
                )}

                {activeTab === 'actions' && (
                  displayActions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {displayActions.map((a: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF0F6]">
                          <div className={clsx(
                            'w-2 h-2 rounded-full shrink-0 mt-1.5',
                            a.priority === 'high' ? 'bg-[#EF4444]' : a.priority === 'medium' ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#334155]">{a.text}</p>
                            {a.assignee && <p className="text-[11px] text-[#94A3B8] mt-0.5">→ {a.assignee}</p>}
                          </div>
                          <span className={clsx(
                            'text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0',
                            a.priority === 'high' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                            a.priority === 'medium' ? 'bg-[#FFFBEB] text-[#D97706]' :
                            'bg-[#ECFDF5] text-[#059669]'
                          )}>
                            {a.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <CheckCircle2 size={22} className="text-[#CBD5E1]" />
                      <p className="text-[13px] text-[#94A3B8]">Generate a summary to extract action items</p>
                    </div>
                  )
                )}

                {activeTab === 'minutes' && (
                  displayMinutes ? (
                    <div className="prose prose-sm max-w-none text-[#334155] text-[13px] leading-relaxed">
                      <ReactMarkdown>{displayMinutes}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <FileText size={22} className="text-[#CBD5E1]" />
                      <p className="text-[13px] text-[#94A3B8]">Click "Minutes" to generate formal meeting minutes</p>
                    </div>
                  )
                )}
              </div>

              {/* AI Chat */}
              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{ border: '1px solid #EEF0F6', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}
              >
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#F3F4F8]">
                  <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
                    <Bot size={13} className="text-[#8B5CF6]" />
                  </div>
                  <span className="text-[13px] font-semibold text-[#0F172A]">Ask about this meeting</span>
                </div>

                {chatHistory.length === 0 && (
                  <div className="flex flex-wrap gap-2 p-4 pb-0">
                    {PROMPT_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleChat(s)}
                        className="text-[11px] text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 hover:bg-[#EEF2FF] hover:border-[#C7D2FE] hover:text-[#4F46E5] transition-all text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {chatHistory.length > 0 && (
                  <div className="flex flex-col gap-3 p-4 max-h-56 overflow-y-auto">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={clsx('flex gap-2 text-[12.5px] leading-relaxed', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-full bg-[#F5F3FF] border border-[#E9D5FF] flex items-center justify-center shrink-0 mt-0.5">
                            <Bot size={10} className="text-[#8B5CF6]" />
                          </div>
                        )}
                        <div className={clsx(
                          'max-w-[85%] px-3 py-2 rounded-xl',
                          msg.role === 'user'
                            ? 'bg-[#EEF2FF] border border-[#C7D2FE] text-[#334155] rounded-br-sm'
                            : 'bg-[#F8FAFC] border border-[#EEF0F6] text-[#334155] rounded-bl-sm'
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#F5F3FF] flex items-center justify-center shrink-0">
                          <Bot size={10} className="text-[#8B5CF6]" />
                        </div>
                        <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#EEF0F6]">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 border-t border-[#F3F4F8]">
                  <input
                    value={chatMsg}
                    onChange={(e) => setChatMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat(chatMsg)}
                    placeholder="Ask anything about this meeting…"
                    disabled={!selectedId || chatLoading}
                    className="input flex-1"
                    style={{ height: 36 }}
                  />
                  <button
                    onClick={() => handleChat(chatMsg)}
                    disabled={!chatMsg.trim() || chatLoading}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}
                    aria-label="Send message"
                  >
                    {chatLoading
                      ? <Loader2 size={13} className="text-white animate-spin" />
                      : <Send size={13} className="text-white" />
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISummary;
