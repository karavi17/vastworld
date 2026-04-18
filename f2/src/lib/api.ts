import axios from 'axios';
import type { ApiResponse, HomepageData, VideoItem, Subtitle } from '@/types';

// Update this URL to your deployed backend URL (e.g., https://your-backend.vercel.app/api)
// When running locally, it will fallback to '/api' which is proxied by Vite
const PROD_BACKEND_URL = 'https://backend-production-ec2e.up.railway.app/api'; 
const API_BASE_URL = import.meta.env.MODE === 'development' ? '/api' : PROD_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getHomepage = async (lang = 'RANDOM') => {
  const response = await api.get<ApiResponse<HomepageData>>('/homepage', {
    params: { lang },
  });
  return response.data;
};

export const getTrending = async (page = 0, perPage = 18, lang = 'RANDOM') => {
  const response = await api.get<ApiResponse<{ items: VideoItem[] }>>('/trending', {
    params: { page, perPage, lang },
  });
  return response.data;
};

export const searchVideos = async (query: string, page = 1, perPage = 24, filterLang = 'RANDOM') => {
  const response = await api.get<ApiResponse<{ items: VideoItem[] }>>(`/search/${query}`, {
    params: { page, perPage, filterLang },
  });
  return response.data;
};

export const getVideoInfo = async (movieId: string) => {
  const response = await api.get<ApiResponse<{ subject: VideoItem }>>(`/info/${movieId}`);
  return response.data;
};

export const getVideoSources = async (movieId: string, season = 0, episode = 0) => {
  const response = await api.get<ApiResponse<{ processedSources: any[]; processedSubtitles: Subtitle[] }>>(`/sources/${movieId}`, {
    params: { season, episode },
  });
  return response.data;
};

export const getRelatedVideos = async (movieId: string, lang = 'RANDOM') => {
  const response = await api.get<ApiResponse<{ items: VideoItem[] }>>(`/related/${movieId}`, {
    params: { lang },
  });
  return response.data;
};
