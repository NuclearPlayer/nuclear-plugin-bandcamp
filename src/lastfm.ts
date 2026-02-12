export type LastfmArtist = {
  artist: {
    name: string;
    bio?: { content: string };
    tags?: { tag: { name: string }[] };
    similar?: { artist: { name: string; image: { '#text': string; size: string }[] }[] };
  };
};

export type LastfmTopTracks = {
  toptracks: {
    track: {
      name: string;
      playcount: string;
      listeners: string;
      artist: { name: string };
      image: { '#text': string; size: string }[];
    }[];
  };
};

const LASTFM_API_KEY = atob('MmI3NWRjYjI5MWUyYjBjOWEyYzk5NGFjYTUyMmFjMTQ=');
const LASTFM_API = 'https://ws.audioscrobbler.com/2.0';

const lastfmFetch = <T>(
  method: string,
  params: Record<string, string>,
): Promise<T> =>
  fetch(
    `${LASTFM_API}?${new URLSearchParams({ method, api_key: LASTFM_API_KEY, format: 'json', ...params })}`,
  ).then((response) => response.json());

export const getArtistInfo = (artist: string): Promise<LastfmArtist> =>
  lastfmFetch('artist.getInfo', { artist });

export const getArtistTopTracks = (artist: string): Promise<LastfmTopTracks> =>
  lastfmFetch('artist.getTopTracks', { artist, limit: '5' });


