import { useState, useRef, useEffect } from 'react';
import type { VideoItem } from '@/types';
import { MoreVertical, CheckCircle, Clock, Share2, Download, Loader2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { addToWatchLater, removeFromWatchLater, isInWatchLater } from '@/lib/watchLater';
import { getVideoSources } from '@/lib/api';
import { saveOfflineDownload } from '@/lib/offlineDownloads';
import { useLanguage } from '@/context/LanguageContext';

interface VideoCardProps {
  video: VideoItem;
}

export const VideoCard = ({ video }: VideoCardProps) => {
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
  const languages = video.languages || [];
  const quality = video.quality || 'HD';

  return (
    <div className="flex flex-col gap-2 sm:gap-3 group cursor-pointer relative">
      <Link to={`/watch?v=${video.subjectId}&type=${video.subjectType}`} className="contents">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] flex-shrink-0">
          <img
            src={thumbnail}
            alt={video.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          {duration && (
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded-md">
              {duration}
            </div>
          )}
          <div className="absolute top-1 right-1 bg-red-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
            {quality}
          </div>
          {languages.length > 0 && (
            <div className="absolute top-1 left-1 flex flex-wrap gap-1 max-w-[80%]">
              {languages
                .filter((lang) => lang.toUpperCase() !== 'ENGLISH')
                .map((lang) => (
                  <span key={lang} className="bg-blue-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    {lang}
                  </span>
                ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 sm:gap-3 px-1 sm:px-1">
          <div className="flex-shrink-0">
            <div className="w-9 h-9 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm sm:text-sm">
              {video.title.charAt(0)}
            </div>
          </div>
          
          <div className="flex flex-col flex-1 pr-8 relative">
            <h3 className="text-white font-semibold text-sm sm:text-sm line-clamp-2 leading-tight mb-1 group-hover:text-blue-400 transition-colors">
              {video.title}
            </h3>
            
            <div className="flex flex-col text-[#aaaaaa] text-xs sm:text-xs">
              <div className="flex items-center gap-1 hover:text-white transition-colors">
                <span>{video.subjectType === 1 ? 'Movie' : 'TV Series'}</span>
                <CheckCircle size={12} className="text-[#aaaaaa] sm:w-3 sm:h-3" />
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span>{video.year || '2024'}</span>
                <span className="before:content-['•'] before:mr-1">
                  {video.updateTime || 'Recently added'}
                </span>
              </div>
            </div>

            {/* Menu Button moved here for better alignment */}
            <div className="absolute top-0 right-[-8px]" ref={menuRef}>
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
                {isDownloading ? <Loader2 size={20} className="animate-spin text-red-600" /> : <MoreVertical size={20} />}
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#282828] border border-[#3f3f3f] rounded-xl shadow-2xl py-2 z-[100]">
                  <button 
                    onClick={handleToggleWatchLater}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
                  >
                    {isWatchLater ? <Check size={18} className="text-red-500" /> : <Clock size={18} />}
                    <span>{isWatchLater ? 'Added to Watch Later' : 'Save to Watch Later'}</span>
                  </button>
                  <button 
              onClick={handleDownload}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
            >
              <Download size={18} />
              <span>Download Offline</span>
            </button>
            <button 
              onClick={handleDownloadToDevice}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
            >
              <Share2 size={18} />
              <span>Download on Device</span>
            </button>
                  <button 
                    onClick={handleShare}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
                  >
                    <Share2 size={18} />
                    <span>Share</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};
