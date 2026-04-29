import { BANDCAMP_IMAGE_BASE, BANDCAMP_SEARCH_API_URL } from './config';
import type { FetchFn } from './html';
import type {
  BandcampApiSearchResponse,
  BandcampApiSearchResult,
  BandcampSearchItem,
} from './types';

const resolveImageUrl = (result: BandcampApiSearchResult): string | undefined => {
  if (result.type === 'b') {
    return result.img;
  }

  if (result.art_id) {
    const paddedId = String(result.art_id).padStart(10, '0');
    return `${BANDCAMP_IMAGE_BASE}/a${paddedId}_2.jpg`;
  }

  return result.img;
};

const buildSubhead = (result: BandcampApiSearchResult): string | undefined => {
  if (result.type === 'b') {
    return result.location;
  }
  if (result.type === 'a' && result.band_name) {
    return `by ${result.band_name}`;
  }
  if (result.type === 't' && result.band_name) {
    return result.album_name
      ? `from ${result.album_name} by ${result.band_name}`
      : `by ${result.band_name}`;
  }
  return undefined;
};

const resolveUrl = (result: BandcampApiSearchResult): string =>
  result.item_url_path ?? result.item_url_root;

const toSearchItem = (result: BandcampApiSearchResult): BandcampSearchItem => ({
  type: result.type,
  id: result.id,
  name: result.name,
  url: resolveUrl(result),
  imageUrl: resolveImageUrl(result),
  subhead: buildSubhead(result),
  tags: result.tag_names ?? undefined,
  releaseDate: undefined,
  genre: result.genre_name,
});

const searchBandcamp = async (
  fetchFn: FetchFn,
  query: string,
  searchFilter: 'b' | 'a' | 't',
  limit: number,
): Promise<BandcampSearchItem[]> => {
  const response = await fetchFn(BANDCAMP_SEARCH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      search_text: query,
      search_filter: searchFilter,
      full_page: false,
      fan_id: null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Bandcamp search API returned ${response.status}`);
  }

  const data = (await response.json()) as BandcampApiSearchResponse;
  return data.auto.results.slice(0, limit).map(toSearchItem);
};

export const searchArtists = (
  fetchFn: FetchFn,
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(fetchFn, query, 'b', limit);

export const searchAlbums = (
  fetchFn: FetchFn,
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(fetchFn, query, 'a', limit);

export const searchTracks = (
  fetchFn: FetchFn,
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(fetchFn, query, 't', limit);
