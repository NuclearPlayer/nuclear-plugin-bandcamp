import type { FetchFn } from './html';
import { extractDataTralbum, fetchHtml } from './html';

export const getStreamUrl = async (
  fetchFn: FetchFn,
  trackUrl: string,
): Promise<{ url: string; durationMs?: number }> => {
  const doc = await fetchHtml(fetchFn, trackUrl);
  const tralbumData = extractDataTralbum(doc);
  if (!tralbumData) {
    throw new Error(`No data-tralbum found on page: ${trackUrl}`);
  }

  const track = tralbumData.trackinfo?.[0];
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
