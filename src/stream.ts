import type { FetchFn } from './html';
import { fetchHtml } from './html';
import type { DataTralbum } from './types';

const DATA_TRALBUM_SELECTOR = 'script[data-tralbum]';

export const getStreamUrl = async (
  fetchFn: FetchFn,
  trackUrl: string,
): Promise<{ url: string; durationMs?: number }> => {
  const doc = await fetchHtml(fetchFn, trackUrl);
  const scriptElement = doc.querySelector(DATA_TRALBUM_SELECTOR);

  const rawData = scriptElement?.getAttribute('data-tralbum');
  if (!rawData) {
    throw new Error(`No data-tralbum found on page: ${trackUrl}`);
  }

  const tralbum = JSON.parse(rawData) as DataTralbum;
  const track = tralbum.trackinfo?.[0];
  if (!track) {
    throw new Error(`No track info found on page: ${trackUrl}`);
  }

  const mp3Url = track.file?.['mp3-128'];
  if (!mp3Url) {
    throw new Error(`No MP3 stream URL found for track: ${trackUrl}`);
  }

  return {
    url: mp3Url,
    durationMs: track.duration ? track.duration * 1000 : undefined,
  };
};
