import type { VideoItem } from '@/types';

const WATCH_LATER_KEY = 'watch_later_videos';

export interface WatchLaterVideo {
  id: string;
  title: string;
  thumbnail: string;
  addedAt: number;
}

export const getWatchLaterVideos = (): WatchLaterVideo[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(WATCH_LATER_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const addToWatchLater = (video: VideoItem) => {
  const videos = getWatchLaterVideos();
  const exists = videos.find(v => v.id === video.subjectId);
  if (exists) return;

  const newVideo: WatchLaterVideo = {
    id: video.subjectId,
    title: video.title,
    thumbnail: video.thumbnail || '',
    addedAt: Date.now()
  };

  localStorage.setItem(WATCH_LATER_KEY, JSON.stringify([newVideo, ...videos]));
};

export const removeFromWatchLater = (videoId: string) => {
  const videos = getWatchLaterVideos();
  const filtered = videos.filter(v => v.id !== videoId);
  localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(filtered));
};

export const isInWatchLater = (videoId: string): boolean => {
  const videos = getWatchLaterVideos();
  return videos.some(v => v.id === videoId);
};
