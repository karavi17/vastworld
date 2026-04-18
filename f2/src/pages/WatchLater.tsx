import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Play, Loader2, Clock } from 'lucide-react';
import { getWatchLaterVideos, removeFromWatchLater, type WatchLaterVideo } from '@/lib/watchLater';

export default function WatchLaterPage() {
  const [items, setItems] = useState<WatchLaterVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      try {
        const list = getWatchLaterVideos();
        setItems(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  function handleDelete(id: string) {
    removeFromWatchLater(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="py-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6 px-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="text-red-600" />
            Watch later
          </h1>
          <div className="text-sm text-[#aaaaaa] mt-1">
            {items.length} video{items.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-[#aaaaaa]">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-2" />
          <p>Loading watch later...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="mx-2 bg-[#1a1a1a] border border-[#303030] rounded-xl p-10 text-center text-[#aaaaaa]">
          <p className="text-lg font-medium mb-1">No videos in Watch Later</p>
          <p className="text-sm">Videos you save to watch later will appear here.</p>
          <Link to="/" className="inline-block mt-4 text-blue-400 hover:underline">
            Go to Home
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
          {items.map((it) => (
            <div key={it.id} className="bg-[#1a1a1a] border border-[#303030] rounded-xl overflow-hidden group">
              <div className="relative aspect-video bg-black">
                {it.thumbnail ? (
                  <img src={it.thumbnail} alt={it.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#aaaaaa]">No thumbnail</div>
                )}
                <Link
                  to={`/watch?v=${encodeURIComponent(it.id)}&type=1`}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center border border-white/20 transform group-hover:scale-110 transition-transform">
                    <Play size={24} className="text-white ml-1" />
                  </div>
                </Link>
              </div>

              <div className="p-4">
                <div className="text-white font-semibold line-clamp-2 min-h-[3rem]">{it.title}</div>
                
                <div className="flex items-center gap-2 mt-4">
                  <Link
                    to={`/watch?v=${encodeURIComponent(it.id)}&type=1`}
                    className="flex-1 bg-white text-black hover:bg-zinc-200 text-sm font-bold px-3 py-2 rounded-lg text-center transition-colors"
                  >
                    Play Now
                  </Link>
                  <button
                    onClick={() => handleDelete(it.id)}
                    className="p-2 bg-[#272727] text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remove from Watch Later"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
