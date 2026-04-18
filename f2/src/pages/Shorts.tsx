import { useEffect, useState, useRef } from 'react';
import { searchVideos, getVideoSources } from '@/lib/api';
import type { VideoItem } from '@/types';
import { Loader2, ThumbsUp, ThumbsDown, MessageSquare, Share2, Music2, Pause, Volume2, VolumeX } from 'lucide-react';

interface ShortVideoProps {
  video: VideoItem;
  isActive: boolean;
}

const ShortVideo = ({ video, isActive }: ShortVideoProps) => {
  const [sources, setSources] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive && sources.length === 0) {
      const fetchSources = async () => {
        try {
          const res = await getVideoSources(video.subjectId);
          if (res.status === 'success' && res.data.processedSources?.length > 0) {
            setSources(res.data.processedSources);
          }
        } catch (err) {
          console.error('Failed to fetch short sources:', err);
        }
      };
      fetchSources();
    }
  }, [isActive, video.subjectId, sources.length]);

  useEffect(() => {
    if (isActive && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive, isPlaying, sources]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/watch?v=${video.subjectId}`;
    if (navigator.share) {
      navigator.share({
        title: video.title,
        url: url
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const currentSource = sources[0];

  return (
    <div className="relative h-[calc(100vh-56px)] w-full flex items-center justify-center bg-black snap-start overflow-hidden">
      {/* Video Background/Container */}
      <div className="relative h-full w-full max-w-[500px] bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
        {isActive && currentSource ? (
          <video
            ref={videoRef}
            src={currentSource.streamUrl}
            poster={video.thumbnail}
            className="h-full w-full object-contain"
            loop
            playsInline
            muted={isMuted}
            onClick={togglePlay}
          />
        ) : (
          <div className="relative w-full h-full">
            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-40 blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-red-600" />
            </div>
          </div>
        )}

        {/* Play/Pause Overlay Icon (Transient) */}
        {!isPlaying && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-5 bg-black/40 rounded-full text-white animate-ping">
              <Pause size={40} fill="currentColor" />
            </div>
          </div>
        )}

        {/* Bottom Overlay Info */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="pointer-events-auto max-w-[85%]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
                {video.title.charAt(0)}
              </div>
              <span className="text-white font-bold text-sm truncate">VastWord Official</span>
              <a 
                href="https://www.youtube.com/@VIST_VIDEO_WORLD" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold ml-2 hover:bg-red-700 transition-colors pointer-events-auto"
              >
                Subscribe
              </a>
            </div>
            <p className="text-white text-sm font-medium line-clamp-2 mb-3 drop-shadow-md">{video.title}</p>
            <div className="flex items-center gap-2 text-white/90 text-xs">
              <Music2 size={14} className="animate-pulse text-red-500" />
              <span className="truncate">Original Audio • VastWord Music</span>
            </div>
          </div>
        </div>

        {/* Right Action Sidebar */}
        <div className="absolute right-3 bottom-16 flex flex-col items-center gap-5 z-20">
          <button className="flex flex-col items-center group">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white group-hover:bg-white/20 transition-all transform active:scale-90">
              <ThumbsUp size={26} />
            </div>
            <span className="text-white text-[11px] mt-1 font-bold drop-shadow-md">Like</span>
          </button>
          <button className="flex flex-col items-center group">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white group-hover:bg-white/20 transition-all transform active:scale-90">
              <ThumbsDown size={26} />
            </div>
            <span className="text-white text-[11px] mt-1 font-bold drop-shadow-md">Dislike</span>
          </button>
          <button className="flex flex-col items-center group">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white group-hover:bg-white/20 transition-all transform active:scale-90">
              <MessageSquare size={26} />
            </div>
            <span className="text-white text-[11px] mt-1 font-bold drop-shadow-md">45</span>
          </button>
          <button onClick={handleShare} className="flex flex-col items-center group">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white group-hover:bg-white/20 transition-all transform active:scale-90">
              <Share2 size={26} />
            </div>
            <span className="text-white text-[11px] mt-1 font-bold drop-shadow-md">Share</span>
          </button>
          
          <button onClick={toggleMute} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all mt-2">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <div className="w-10 h-10 rounded-lg bg-zinc-800 border-2 border-white/40 overflow-hidden mt-2 animate-spin-slow shadow-lg shadow-black/40">
            <img src={video.thumbnail} alt="Disc" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ShortsPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchShorts = async () => {
      setLoading(true);
      try {
        // Fetch videos with broader keywords to ensure results
        let res = await searchVideos('shorts funny hindi comedy', 1, 15);
        if (res.status === 'success' && (!res.data.items || res.data.items.length === 0)) {
          // Fallback to general trending if specific shorts search fails
          res = await searchVideos('trending', 1, 15);
        }
        if (res.status === 'success' && res.data.items) {
          setVideos(res.data.items);
        }
      } catch (err) {
        console.error('Failed to fetch shorts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShorts();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPos = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    if (height === 0) return;
    const index = Math.round(scrollPos / height);
    if (index !== activeIndex && index >= 0 && index < videos.length) {
      setActiveIndex(index);
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-white">
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
        <p className="text-xl font-bold tracking-tight">Loading Shorts...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-56px)] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black"
    >
      {videos.map((video, idx) => (
        <ShortVideo 
          key={video.subjectId} 
          video={video} 
          isActive={idx === activeIndex} 
        />
      ))}
      
      {videos.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
          <p className="text-lg">No shorts found in your region.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

