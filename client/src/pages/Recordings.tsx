import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Video, Play, Trash2, Download } from 'lucide-react';
import { recordingService } from '../api/recording.api';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';

export default function Recordings() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res: any = await recordingService.getRecordings();
      setRecordings(res?.data ?? res ?? []);
    } catch (err) {
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this recording?')) return;
    try {
      await recordingService.deleteRecording(id);
      toast.success('Recording deleted');
      setRecordings(recordings.filter(r => r._id !== id));
    } catch (err) {
      toast.error('Failed to delete recording');
    }
  };

  const filteredRecordings = recordings.filter(r => 
    r.meetingId?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Recordings</h1>
          <p className="text-slate-400 mt-1">Manage and playback your recorded meetings.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by meeting title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {loading ? (
        <Loader fullPage={false} label="Loading recordings..." />
      ) : filteredRecordings.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-white/5">
          <Video className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No recordings found</h3>
          <p className="text-slate-400">Record a meeting to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecordings.map((recording) => (
            <div
              key={recording._id}
              onClick={() => navigate(`/recordings/${recording._id}`)}
              className="group bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-[var(--color-primary)]/50 transition-all cursor-pointer"
            >
              <div className="aspect-video bg-black relative flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-700" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur text-xs font-medium text-white rounded-md">
                  {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-1 truncate">
                  {recording.meetingId?.title || 'Untitled Meeting'}
                </h3>
                <div className="flex flex-col gap-1 mt-3">
                  <div className="flex items-center text-sm text-slate-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(recording.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                  <div className="text-xs text-slate-500 font-mono">
                    {(recording.sizeBytes / 1024 / 1024).toFixed(1)} MB
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={recording.url}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-[var(--color-primary)] rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={(e) => handleDelete(e, recording._id)}
                      className="p-2 text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
