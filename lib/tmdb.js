const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export async function searchMedia(query, type = 'multi') {
  const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('TMDB API request failed');
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

export async function getMediaDetails(id, type = 'movie') {
  const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('TMDB API request failed');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('TMDB details error:', error);
    return null;
  }
}

export function getImageUrl(path, size = 'w500') {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function formatMetadata(tmdbData, type = 'movie') {
  const isMovie = type === 'movie';
  
  return {
    tmdbId: tmdbData.id,
    imdbId: tmdbData.external_ids?.imdb_id || tmdbData.imdb_id,
    title: tmdbData.title || tmdbData.name,
    overview: tmdbData.overview,
    poster: getImageUrl(tmdbData.poster_path),
    backdrop: getImageUrl(tmdbData.backdrop_path, 'original'),
    releaseYear: isMovie 
      ? new Date(tmdbData.release_date).getFullYear()
      : new Date(tmdbData.first_air_date).getFullYear(),
    rating: tmdbData.vote_average,
    genres: JSON.stringify(tmdbData.genres?.map(g => g.name) || []),
    runtime: tmdbData.runtime || tmdbData.episode_run_time?.[0]
  };
}
