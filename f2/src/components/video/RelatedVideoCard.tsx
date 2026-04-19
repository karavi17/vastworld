import { useState, useRef, useEffect } from 'react';
import type { VideoItem } from '@/types';
import { CheckCircle, MoreVertical, Clock, Download, Share2, Loader2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { addToWatchLater, removeFromWatchLater, isInWatchLater } from '@/lib/watchLater';
import { getVideoSources } from '@/lib/api';
import { saveOfflineDownload } from '@/lib/offlineDownloads';
import { useLanguage } from '@/context/LanguageContext';

interface RelatedVideoCardProps {
  video: VideoItem;
}

export const RelatedVideoCard = ({ video }: RelatedVideoCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  useEffect(() => {
    setIsWatchLater(isInWatchLater(video.subjectId));
  }, [video.subjectId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleToggleWatchLater = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWatchLater) {
      removeFromWatchLater(video.subjectId);
      setIsWatchLater(false);
    } else {
      addToWatchLater(video);
      setIsWatchLater(true);
    }
    setShowMenu(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/watch?v=${video.subjectId}&type=${video.subjectType}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
    setShowMenu(false);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setShowMenu(false);
      
      const response = await getVideoSources(video.subjectId);
      if (response.status !== 'success' || !response.data.processedSources?.length) {
        throw new Error('No sources found');
      }

      const sources = response.data.processedSources;
      let selected = sources[0];
      if (language === 'HINDI') {
        selected = sources.find((s: any) => s.language.toUpperCase().includes('HINDI')) || selected;
      } else if (language === 'ENGLISH') {
        selected = sources.find((s: any) => s.language.toUpperCase().includes('ENGLISH')) || selected;
      }

      let url = selected.streamUrl;
      if (url.includes('/api/stream')) {
        url = '/api/stream' + url.split('/api/stream')[1];
      }

      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';

      const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) resolve(xhr.response);
          else reject(new Error(`Download failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send();
      });

      await saveOfflineDownload({
        id: `${video.subjectId}:${selected.id}`,
        videoId: video.subjectId,
        title: video.title,
        thumbnail: video.thumbnail || video.cover?.url,
        language: selected.language,
        quality: selected.quality,
        mimeType: selected.format || 'video/mp4',
        bytes,
      });

      // Removed success alert
    } catch (err: any) {
      console.error(err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadToDevice = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setShowMenu(false);
      
      const response = await getVideoSources(video.subjectId);
      if (response.status !== 'success' || !response.data.processedSources?.length) {
        throw new Error('No sources found');
      }

      const sources = response.data.processedSources;
      let selected = sources[0];
      if (language === 'HINDI') {
        selected = sources.find((s: any) => s.language.toUpperCase().includes('HINDI')) || selected;
      } else if (language === 'ENGLISH') {
        selected = sources.find((s: any) => s.language.toUpperCase().includes('ENGLISH')) || selected;
      }

      let url = selected.streamUrl;
      if (url.includes('/api/stream')) {
        url = '/api/stream' + url.split('/api/stream')[1];
      }

      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      const blob = await new Promise<Blob>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) resolve(xhr.response);
          else reject(new Error(`Download failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send();
      });

      let filename = video.title;
      const extension = selected.format?.includes('mp4') ? '.mp4' : 
                        selected.format?.includes('mkv') ? '.mkv' : '.mp4';
      filename += extension;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Removed success alert
    } catch (err: any) {
      console.error(err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const thumbnail = video.thumbnail || video.cover?.url || video.stills?.url || '/placeholder.jpg';
  const duration = video.duration;
  const quality = video.quality || 'HD';

  return (
    <div className="relative group">
      <Link 
        to={`/watch?v=${video.subjectId}&type=${video.subjectType}`} 
        className="flex gap-3 cursor-pointer"
      >
        <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
          <img
            src={thumbnail}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          
          {duration ? (
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded">
              {duration}
            </div>
          ) : null}

          <div className="absolute top-1 right-1 bg-red-600/90 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider">
            {quality}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0 pr-6">
          <h3 className="text-white font-medium text-sm line-clamp-2 leading-tight mb-1 group-hover:text-blue-400 transition-colors">
            {video.title}
          </h3>
          
          <div className="flex flex-col text-[#aaaaaa] text-xs">
            <div className="flex items-center gap-1 hover:text-white transition-colors">
              <span>{video.subjectType === 1 ? 'Movie' : 'TV Series'}</span>
              <CheckCircle size={10} className="text-[#aaaaaa]" />
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <span>{video.year || '2024'}</span>
              {video.updateTime && (
                <span className="before:content-['•'] before:mr-1">
                  {video.updateTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="absolute top-[-4px] right-[-4px]" ref={menuRef}>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`p-1.5 rounded-full transition-all ${
            showMenu ? 'bg-[#272727] text-white' : 'text-transparent group-hover:text-[#aaaaaa] hover:text-white hover:bg-[#272727]'
          }`}
        >
          {isDownloading ? <Loader2 size={16} className="animate-spin text-red-600" /> : <MoreVertical size={16} />}
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-[#282828] border border-[#3f3f3f] rounded-xl shadow-2xl py-2 z-[100]">
            <button 
              onClick={handleToggleWatchLater}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
            >
              {isWatchLater ? <Check size={16} className="text-red-500" /> : <Clock size={16} />}
              <span>{isWatchLater ? 'Added to Watch Later' : 'Save to Watch Later'}</span>
            </button>
            <button 
              onClick={handleDownload}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
            >
              <Download size={16} />
              <span>Download Offline</span>
            </button>
            <button 
              onClick={handleDownloadToDevice}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
            >
              <Share2 size={16} />
              <span>Download on Device</span>
            </button>
            <button 
              onClick={handleShare}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
