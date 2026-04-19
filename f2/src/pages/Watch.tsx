import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getVideoInfo, getVideoSources, getRelatedVideos, getTrending } from '@/lib/api';
import type { VideoItem, Subtitle, SourcesResponseData } from '@/types';
import { Loader2, Share2, Download, MoreVertical, List as ListIcon, CheckCircle, Clock, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { YoutubePlayer } from '@/components/video/YoutubePlayer';
import { RelatedVideoCard } from '@/components/video/RelatedVideoCard';
import { saveOfflineDownload, getOfflineDownloadMeta, getOfflineDownloadBlobUrl } from '@/lib/offlineDownloads';
import { addToWatchLater, removeFromWatchLater, isInWatchLater } from '@/lib/watchLater';

export default function WatchPage() {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('v');
  const type = searchParams.get('type') || '1';
  const downloadId = searchParams.get('downloadId');
  
  const [videoInfo, setVideoInfo] = useState<VideoItem | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTrendingFallback, setIsTrendingFallback] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(0);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const offlineRevokeRef = useRef<(() => void) | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  
  const { language } = useLanguage();

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    }, {
      rootMargin: '200px',
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSources = useMemo(() => {
    if (!sources.length) return [];
    
    // 1. Identify all available languages
    const availableLangs = Array.from(new Set(sources.map(s => s.language.toUpperCase())));
    
    // 2. Determine which language group to show
    let targetLang = '';
    if (language === 'HINDI' && availableLangs.includes('HINDI')) {
      targetLang = 'HINDI';
    } else if (language === 'ENGLISH' && availableLangs.includes('ENGLISH')) {
      targetLang = 'ENGLISH';
    } else {
      // Default to the first available language if preferred one isn't there
      targetLang = availableLangs[0];
    }
    
    // 3. Filter sources by that language and remove language from label
    return sources
      .filter(s => s.language.toUpperCase() === targetLang)
      .map(s => ({
        ...s,
        label: s.quality // Remove language from label
      }));
  }, [sources, language]);

  const selectedSource = useMemo(
    () => filteredSources.find((s) => s.id === selectedSourceId) ?? filteredSources[0] ?? null,
    [filteredSources, selectedSourceId]
  );

  const seasons = useMemo(() => {
    if (!videoInfo?.episodeList) return [];
    const sSet = new Set(videoInfo.episodeList.map(ep => ep.season));
    return Array.from(sSet).sort((a, b) => a - b);
  }, [videoInfo]);

  const episodesInSelectedSeason = useMemo(() => {
    if (!videoInfo?.episodeList || selectedSeason === 0) return [];
    return videoInfo.episodeList
      .filter(ep => ep.season === selectedSeason)
      .sort((a, b) => a.episode - b.episode);
  }, [videoInfo, selectedSeason]);

  useEffect(() => {
    const fetchVideoData = async () => {
      if (!videoId && !downloadId) return;

      try {
        const isInitialLoad = !videoInfo || videoInfo.subjectId !== videoId;
        
        if (isInitialLoad) {
          setPage(0);
          setHasMore(true);
          setLoading(true);
          setError(null);
        } else {
          setLoadingSources(true);
        }

        if (downloadId) {
          const meta = await getOfflineDownloadMeta(downloadId);
          if (!meta) {
            setError('Downloaded video not found.');
            setLoading(false);
            return;
          }
          const blob = await getOfflineDownloadBlobUrl(downloadId);
          if (!blob) {
            setError('Failed to open downloaded video.');
            setLoading(false);
            return;
          }
          if (offlineRevokeRef.current) offlineRevokeRef.current();
          offlineRevokeRef.current = blob.revoke;
          setVideoInfo({
            subjectId: meta.videoId,
            subjectType: Number(type || 1),
            title: meta.title,
            thumbnail: meta.thumbnail,
            quality: meta.quality,
          });
          const offlineSource = {
            id: meta.id,
            label: `${meta.quality || 'Offline'} - ${meta.language || 'Offline'}`,
            src: blob.url,
            mimeType: meta.mimeType || 'video/mp4',
            language: meta.language || 'Offline',
            quality: meta.quality || 'Offline',
          };
          setSources([offlineSource]);
          setSelectedSourceId(meta.id);
          setIsDownloaded(true);
          setLoading(false);
          return;
        }

        const requests: Promise<any>[] = [
          getVideoSources(videoId!, selectedSeason, selectedEpisode),
          getRelatedVideos(videoId!, language)
        ];
        
        if (isInitialLoad) {
          requests.unshift(getVideoInfo(videoId!));
        }

        const results = await Promise.allSettled(requests);
        
        let infoResult: PromiseSettledResult<any> | undefined;
        let sourcesResult: PromiseSettledResult<any>;
        let relatedResult: PromiseSettledResult<any>;
        
        if (isInitialLoad) {
          [infoResult, sourcesResult, relatedResult] = results;
        } else {
          [sourcesResult, relatedResult] = results;
        }

        if (isInitialLoad && infoResult) {
          if (infoResult.status === 'fulfilled' && infoResult.value.status === 'success' && infoResult.value.data.subject) {
            const currentSubject = infoResult.value.data.subject;
            setVideoInfo(currentSubject);
            if (currentSubject.subjectType === 2 && currentSubject.episodeList?.length > 0) {
              if (selectedSeason === 0 || selectedEpisode === 0) {
                const firstEp = currentSubject.episodeList[0];
                setSelectedSeason(firstEp.season);
                setSelectedEpisode(firstEp.episode);
              }
            }
          } else {
            setError('Failed to load video info.');
            setLoading(false);
            setLoadingSources(false);
            return;
          }
        }

        if (sourcesResult && sourcesResult.status === 'fulfilled' && sourcesResult.value.status === 'success') {
          const sourcesData = sourcesResult.value.data as SourcesResponseData;
          if (sourcesData.processedSources) {
            const availableSources = sourcesData.processedSources.map(s => ({
              id: s.id,
              label: `${s.quality} - ${s.language}`,
              src: s.streamUrl,
              mimeType: s.format,
              language: s.language,
              quality: s.quality,
              downloadUrl: s.downloadUrl
            }));
            setSources(availableSources);
            if (availableSources.length > 0) {
              let preferredSource = availableSources[0];
              if (language === 'HINDI') {
                preferredSource = availableSources.find((s: any) => s.language.toUpperCase().includes('HINDI')) || preferredSource;
              } else if (language === 'ENGLISH') {
                preferredSource = availableSources.find((s: any) => s.language.toUpperCase().includes('ENGLISH')) || preferredSource;
              }
              setSelectedSourceId(preferredSource.id);
            }
          }
          if (sourcesData.processedSubtitles) {
            setSubtitles(sourcesData.processedSubtitles);
          }
        }

        if (relatedResult && relatedResult.status === 'fulfilled' && relatedResult.value.status === 'success' && relatedResult.value.data.items?.length > 0) {
          setRelatedVideos(relatedResult.value.data.items);
          setIsTrendingFallback(false);
          setHasMore(true); // Always try to load more trending content afterwards
        } else {
          // Fallback to trending content if no related content is found
          try {
            const trendingResult = await getTrending(0, 18, language);
            if (trendingResult.status === 'success' && trendingResult.data.items) {
              setRelatedVideos(trendingResult.data.items);
              setIsTrendingFallback(true);
              setHasMore(trendingResult.data.items.length >= 10);
            } else {
              setRelatedVideos([]);
              setIsTrendingFallback(false);
              setHasMore(false);
            }
          } catch (trendingErr) {
            console.error('Error fetching trending fallback:', trendingErr);
            setRelatedVideos([]);
            setIsTrendingFallback(false);
            setHasMore(false);
          }
        }

        setLoading(false);
        setLoadingSources(false);

      } catch (err) {
        console.error(err);
        setError('Failed to load video. Please try again later.');
        setLoading(false);
        setLoadingSources(false);
      }
    };

    fetchVideoData();
  }, [videoId, language, type, selectedSeason, selectedEpisode, downloadId]);

  useEffect(() => {
    if (page === 0) return;

    const fetchMore = async () => {
      try {
        setLoadingMore(true);
        // We always use getTrending for "load more" on watch page to provide endless discovery
        const response = await getTrending(page, 18, language);
        if (response.status === 'success' && response.data.items) {
          const newItems = response.data.items;
          if (newItems.length === 0) {
            setHasMore(false);
          } else {
            setRelatedVideos(prev => {
              const existingIds = new Set(prev.map(v => v.subjectId));
              const uniqueNewItems = newItems.filter(v => !existingIds.has(v.subjectId));
              return [...prev, ...uniqueNewItems];
            });
            setHasMore(newItems.length >= 10);
          }
        }
      } catch (err) {
        console.error('Error loading more videos:', err);
      } finally {
        setLoadingMore(false);
      }
    };

    void fetchMore();
  }, [page, language]);

  useEffect(() => {
    return () => {
      if (offlineRevokeRef.current) offlineRevokeRef.current();
    };
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      if (!videoId) return;
      
      // Check download status
      if (selectedSourceId) {
        const id = `${videoId}:${selectedSourceId}`;
        const meta = await getOfflineDownloadMeta(id);
        setIsDownloaded(Boolean(meta));
      }

      // Check watch later status
      setIsWatchLater(isInWatchLater(videoId));
    };
    void checkStatus();
  }, [videoId, selectedSourceId]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoInfo?.title || 'Watch this video',
          url: url
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Error copying link:', err);
      }
    }
  }

  function toggleWatchLater() {
    if (!videoInfo || !videoId) return;
    
    if (isWatchLater) {
      removeFromWatchLater(videoId);
      setIsWatchLater(false);
    } else {
      addToWatchLater(videoInfo);
      setIsWatchLater(true);
    }
  }

  async function handleDownload() {
    if (!videoId || !selectedSource || !videoInfo) return;
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      
      // Always use the proxied stream URL for downloads to avoid CORS issues
      let url = selectedSource.src;
      
      // Make URL relative if it points to our backend
      if (url.includes('/api/stream')) {
        url = '/api/stream' + url.split('/api/stream')[1];
      }

      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setDownloadProgress(Math.round(percentComplete));
        }
      };

      const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Download failed with status: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during download'));
        xhr.onabort = () => reject(new Error('Download aborted'));
        xhr.send();
      });

      await saveOfflineDownload({
        id: `${videoId}:${selectedSourceId}`,
        videoId,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        language: selectedSource.language,
        quality: selectedSource.quality,
        mimeType: selectedSource.mimeType || 'video/mp4',
        bytes,
      });

      setIsDownloaded(true);
      // Removed success alert
    } catch (err: any) {
      console.error(err);
      alert(`Failed to download video: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  async function handleDownloadToDevice() {
    if (!videoId || !selectedSource || !videoInfo) return;
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setShowDownloadMenu(false);
      
      let url = selectedSource.src;
      if (url.includes('/api/stream')) {
        url = '/api/stream' + url.split('/api/stream')[1];
      }

      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setDownloadProgress(Math.round(percentComplete));
        }
      };

      const blob = await new Promise<Blob>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) resolve(xhr.response);
          else reject(new Error(`Download failed with status: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error during download'));
        xhr.send();
      });

      // Generate filename
      let filename = videoInfo.title;
      if (videoInfo.subjectType === 2) {
        if (selectedSeason > 0) filename += ` S${selectedSeason}`;
        if (selectedEpisode > 0) filename += ` E${selectedEpisode}`;
      }
      
      // Determine extension
      const extension = selectedSource.mimeType?.includes('video/mp4') ? '.mp4' : 
                        selectedSource.mimeType?.includes('video/x-matroska') ? '.mkv' : '.mp4';
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
      alert(`Failed to download to device: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  async function handleEpisodeDownload(e: React.MouseEvent, ep: any) {
    e.stopPropagation(); // Prevent selecting the episode when clicking download
    if (!videoId || !videoInfo) return;
    const episodeId = ep.episodeId;
    
    if (downloadingEpisodes.has(episodeId)) return;

    try {
      setDownloadingEpisodes(prev => new Set(prev).add(episodeId));
      
      // 1. Fetch sources for this specific episode
      const response = await getVideoSources(videoId, selectedSeason, ep.episode);
      if (response.status !== 'success' || !response.data.processedSources?.length) {
        throw new Error('No sources found for this episode');
      }

      const availableSources = response.data.processedSources;
      // Pick preferred source (same logic as in fetchVideoData)
      let selected = availableSources[0];
      if (language === 'HINDI') {
        selected = availableSources.find((s: any) => s.language.toUpperCase().includes('HINDI')) || selected;
      } else if (language === 'ENGLISH') {
        selected = availableSources.find((s: any) => s.language.toUpperCase().includes('ENGLISH')) || selected;
      }

      // 2. Download logic
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
          else reject(new Error(`Download failed with status: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error during download'));
        xhr.send();
      });

      await saveOfflineDownload({
        id: `${videoId}:${selected.id}`,
        videoId,
        title: `${videoInfo.title} - S${selectedSeason}E${ep.episode}`,
        thumbnail: videoInfo.thumbnail,
        language: selected.language,
        quality: selected.quality,
        mimeType: selected.format || 'video/mp4',
        bytes,
      });

      // Removed success alert
    } catch (err: any) {
      console.error(err);
      alert(`Failed to download Episode ${ep.episode}: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingEpisodes(prev => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
        <Loader2 className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-lg font-medium">Loading video player...</p>
      </div>
    );
  }

  if (error || !videoInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white px-4 text-center">
        <p className="text-lg text-red-500 mb-4">{error || 'Video not found'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 py-6">
      <div className="flex-1 min-w-0">
        <div className="relative">
          <YoutubePlayer 
            sources={filteredSources}
            subtitles={subtitles}
            selectedSourceId={selectedSourceId}
            onSelectSourceId={setSelectedSourceId}
            poster={videoInfo.thumbnail}
            autoPlay={true}
          />
          {loadingSources && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <Loader2 className="w-10 h-10 animate-spin text-red-600" />
            </div>
          )}
        </div>

        <div className="mt-4">
          <h1 className="text-white text-xl font-bold line-clamp-2">{videoInfo.title}</h1>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pb-4 border-b border-[#303030]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {videoInfo.title.charAt(0)}
              </div>
              <div>
                <p className="text-white font-medium text-sm">VastWord Official</p>
                <p className="text-[#aaaaaa] text-xs">Verified Channel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="https://www.youtube.com/@VIST_VIDEO_WORLD" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors"
              >
                Subscribe
              </a>
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 bg-[#272727] text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium hover:bg-[#3f3f3f] transition-colors"
              >
                <Share2 size={18} />
                <span className="hidden sm:inline">Share</span>
              </button>
              
              <div className="relative" ref={downloadMenuRef}>
                <button 
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  disabled={isDownloading || isDownloaded}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all relative overflow-hidden ${
                    isDownloaded 
                      ? 'bg-green-600/20 text-green-400 cursor-default' 
                      : 'bg-[#272727] text-white hover:bg-[#3f3f3f] disabled:opacity-80'
                  }`}
                >
                  {/* Progress bar background */}
                  {isDownloading && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-red-600/30 transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  )}
                  
                  <span className="relative flex items-center gap-2 z-10">
                    {isDownloading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : isDownloaded ? (
                      <CheckCircle size={18} />
                    ) : (
                      <Download size={18} />
                    )}
                    <span className="hidden sm:inline">
                      {isDownloading ? `Downloading ${downloadProgress}%` : isDownloaded ? 'Downloaded' : 'Download'}
                    </span>
                    {isDownloading && <span className="sm:hidden text-[10px]">{downloadProgress}%</span>}
                  </span>
                </button>

                {showDownloadMenu && !isDownloaded && !isDownloading && (
                  <div className="absolute left-0 top-full mt-2 w-48 bg-[#282828] border border-[#3f3f3f] rounded-xl shadow-2xl py-2 z-50">
                    <button 
                      onClick={() => {
                        handleDownload();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
                    >
                      <Download size={18} />
                      <span>Download Offline</span>
                    </button>
                    <button 
                      onClick={() => {
                        handleDownloadToDevice();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
                    >
                      <Share2 size={18} />
                      <span>Download on Device</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`p-2 rounded-full transition-colors ${showMoreMenu ? 'bg-[#3f3f3f]' : 'bg-[#272727]'} text-white hover:bg-[#3f3f3f]`}
                >
                  <MoreVertical size={18} />
                </button>
                
                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#282828] border border-[#3f3f3f] rounded-xl shadow-2xl py-2 z-50">
                    <button 
                      onClick={() => {
                        toggleWatchLater();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#3f3f3f] transition-colors text-left"
                    >
                      {isWatchLater ? <Check size={18} className="text-red-500" /> : <Clock size={18} />}
                      <span>{isWatchLater ? 'Added to Watch Later' : 'Save to Watch Later'}</span>
                    </button>
                    {/* You can add more menu items here if needed */}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 bg-[#272727] rounded-xl p-3 text-sm">
            <div className="flex items-center gap-2 font-bold text-white mb-1">
              <span>{videoInfo.year || '2024'}</span>
              <span>{videoInfo.quality || 'HD'}</span>
              <span>{videoInfo.subjectType === 1 ? 'Movie' : 'TV Series'}</span>
            </div>
            <p className="text-white whitespace-pre-wrap line-clamp-4 hover:line-clamp-none cursor-pointer">
              {videoInfo.synopsis || videoInfo.desc || 'No description available for this video.'}
            </p>
          </div>
        </div>

        {videoInfo.subjectType === 2 && videoInfo.episodeList && (
          <div className="mt-6 bg-[#0f0f0f] border border-[#303030] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#303030] flex items-center justify-between bg-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <ListIcon size={20} className="text-red-600" />
                <h2 className="text-white font-bold">Episodes</h2>
              </div>
              <div className="flex gap-2">
                <select 
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="bg-[#272727] text-white text-xs px-3 py-1.5 rounded-md border-none outline-none cursor-pointer"
                >
                  {seasons.map(s => (
                    <option key={s} value={s}>Season {s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
              {episodesInSelectedSeason.map((ep) => (
                <button
                  key={ep.episodeId}
                  onClick={() => setSelectedEpisode(ep.episode)}
                  className={`group relative py-2 px-2 rounded-md text-xs font-bold transition-all border flex items-center justify-start gap-2 ${
                    selectedEpisode === ep.episode 
                      ? 'bg-red-600 text-white border-red-600' 
                      : 'bg-[#272727] text-[#aaaaaa] border-[#3f3f3f] hover:border-white hover:text-white'
                  }`}
                >
                  <div 
                    onClick={(e) => handleEpisodeDownload(e, ep)}
                    className={`p-1 rounded-full hover:bg-black/20 transition-colors ${
                      downloadingEpisodes.has(ep.episodeId) ? 'opacity-100' : 'sm:opacity-0 sm:group-hover:opacity-100'
                    }`}
                    title="Download Episode"
                  >
                    {downloadingEpisodes.has(ep.episodeId) ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                  </div>
                  <span>Ep {ep.episode}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[400px] space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-bold">{isTrendingFallback ? 'Trending Now' : 'Up next'}</h2>
          <button className="text-blue-400 text-xs font-bold hover:underline">Autoplay</button>
        </div>
        {relatedVideos.map((video, idx) => (
          <RelatedVideoCard key={`${video.subjectId}-${idx}`} video={video} />
        ))}
        
        {/* Sentinel for infinite scroll */}
        <div ref={lastElementRef} className="h-10 flex items-center justify-center mt-2">
          {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-red-600" />}
          {!hasMore && relatedVideos.length > 0 && (
            <p className="text-[#aaaaaa] text-[10px] italic">No more recommendations.</p>
          )}
        </div>
      </div>
    </div>
  );
}
