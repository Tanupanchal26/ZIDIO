import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Hash, Calendar, Clock, Video, ArrowRight, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';
import { MEETING_ROUTE } from '../constants';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const Lobby = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === '1');
  const [title, setTitle] = useState('');
  const [joinId, setJoinId] = useState('');
  const qc = useQueryClient();

  // Wire to real meeting service
  const { data: meetingsResponse, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingService.getAll({ limit: 10 }).then((r: any) => r.data?.data ?? r.data ?? []),
  });
  const meetings = meetingsResponse || [];

  const createMutation = useMutation({
    mutationFn: () => meetingService.create({ title: title || 'Quick Meeting' }) as Promise<any>,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Meeting created!');
      setShowCreate(false);
      navigate(MEETING_ROUTE(data._id || data.id || 'm_new'));
    },
    onError: () => toast.error('Failed to create meeting'),
  });

  const handleJoin = () => {
    if (!joinId.trim()) return;
    navigate(MEETING_ROUTE(joinId.trim()));
  };

  return (
    <PageContainer className="flex flex-col gap-6 animate-fade-in text-[var(--color-text)] pb-12">
      <PageHeader
        title="Meetings"
        subtitle="Create, join or schedule meetings"
        action={
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={15} /> New Meeting
          </Button>
        }
      />

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create */}
        <Card hover className="flex flex-col gap-4 cursor-pointer" onClick={() => setShowCreate(true)}>
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/15 flex items-center justify-center">
            <Video size={22} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text)] mb-1">Start Instant Meeting</h3>
            <p className="text-sm text-[var(--color-text-muted)]">Create a new meeting room and invite participants</p>
          </div>
          <Button className="gap-2 w-fit">Start Now <ArrowRight size={13} /></Button>
        </Card>

        {/* Join */}
        <Card hover className="flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/40 flex items-center justify-center">
            <Hash size={22} className="text-[var(--color-text)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text)] mb-1">Join by Room ID</h3>
            <p className="text-sm text-[var(--color-text-muted)]">Enter a meeting ID or link to join instantly</p>
          </div>
          <div className="flex items-center gap-2">
            <input value={joinId} onChange={e => setJoinId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJoin()} placeholder="Enter room ID..." className="input-light flex-1 min-w-0 text-sm h-9" />
            <Button onClick={handleJoin} variant="secondary" size="md" className="h-9">Join</Button>
          </div>
        </Card>
      </div>

      {/* Schedule card */}
      <Card className="flex items-center gap-4 cursor-pointer hover:border-[var(--color-primary)]/40 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-[#AFA9B4]/15 border border-[#AFA9B4]/25 flex items-center justify-center flex-shrink-0">
          <Calendar size={18} className="text-[var(--color-text)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--color-text)]">Schedule for later</p>
          <p className="text-xs text-[var(--color-text-muted)]">Plan a future meeting and send calendar invites</p>
        </div>
        <Badge variant="info">Coming soon</Badge>
      </Card>

      {/* Recent meetings */}
      <div>
        <h2 className="font-semibold text-[var(--color-text)] mb-3">Recent Meetings</h2>
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-[var(--color-text-dim)]">Loading sessions...</div>
          ) : meetings.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-text-dim)]">No recent meetings found</div>
          ) : (
            meetings.map((m: any) => (
              <div key={m._id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]/30 hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer shadow-sm hover:shadow" onClick={() => navigate(MEETING_ROUTE(m._id))}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${m.isActive ? 'bg-[#AFA9B4]/20 border-[#AFA9B4]/30' : 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]/60'}`}>
                  <Video size={16} className={m.isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text)] truncate">{m.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={11} className="text-[var(--color-text-dim)]" />
                    <span className="text-xs text-[var(--color-text-dim)]">{fmt(m.startedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.isActive ? <Badge variant="success">Live</Badge> : <Badge variant="default">Ended</Badge>}
                  <Button variant="ghost" size="sm" className="gap-1.5 font-bold hover:text-[var(--color-text)]">Join <ArrowRight size={12} /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Start New Meeting">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1.5">Meeting Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createMutation.mutate()} placeholder="e.g. Product Sync, Sprint Review..." className="input-light" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()} className="flex-1 gap-2">
              <Video size={14} /> Start Meeting
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default Lobby;
