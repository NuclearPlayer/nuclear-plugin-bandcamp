import type { FetchFn } from './html';
import { extractJsonLd, fetchHtml, parseIsoDuration } from './html';
import type {
  BandcampAlbumDetail,
  BandcampTrackDetail,
  DataTralbum,
  JsonLdMusicAlbum,
} from './types';

export const getAlbumDetails = async (
  fetchFn: FetchFn,
  albumUrl: string,
): Promise<BandcampAlbumDetail> => {
  const doc = await fetchHtml(fetchFn, albumUrl);

  const jsonLd = extractJsonLd<JsonLdMusicAlbum>(doc);

  const tralbumScript = Array.from(doc.querySelectorAll('script[data-tralbum]'))
    .find((script) => script.getAttribute('data-tralbum'));
  const tralbumData = tralbumScript
    ? JSON.parse(tralbumScript.getAttribute('data-tralbum')!) as DataTralbum
    : undefined;

  const albumName = jsonLd?.name ?? '';
  const artistName = jsonLd?.byArtist?.name ?? '';
  const artistUrl = jsonLd?.byArtist?.url ?? jsonLd?.publisher?.url;
  const imageUrl = jsonLd?.image;
  const releaseDate = jsonLd?.datePublished;
  const tags = jsonLd?.keywords;

  const jsonLdTracks = jsonLd?.track?.itemListElement ?? [];
  const tralbumTracks = tralbumData?.trackinfo ?? [];

  const tracks: BandcampTrackDetail[] = jsonLdTracks.map((entry) => {
    const matchingTralbumTrack = tralbumTracks.find(
      (trTrack) => trTrack.track_num === entry.position,
    );

    const durationMs =
      matchingTralbumTrack
        ? matchingTralbumTrack.duration * 1000
        : parseIsoDuration(entry.item.duration ?? '');

    const trackUrl = entry.item.url
      ?? (matchingTralbumTrack?.title_link
        ? new URL(matchingTralbumTrack.title_link, albumUrl).href
        : undefined);

    return {
      title: entry.item.name,
      url: trackUrl,
      durationMs,
      position: entry.position,
      streamable: Boolean(matchingTralbumTrack?.file?.['mp3-128']),
      streamUrl: matchingTralbumTrack?.file?.['mp3-128'],
    };
  });

  if (tracks.length === 0 && tralbumTracks.length > 0) {
    tracks.push(...tralbumTracks.map((trTrack) => ({
      title: trTrack.title,
      url: trTrack.title_link
        ? new URL(trTrack.title_link, albumUrl).href
        : undefined,
      durationMs: trTrack.duration * 1000,
      position: trTrack.track_num,
      streamable: Boolean(trTrack.file?.['mp3-128']),
      streamUrl: trTrack.file?.['mp3-128'],
    })));
  }

  return {
    name: albumName,
    artistName,
    artistUrl,
    imageUrl,
    releaseDate,
    tags,
    tracks,
    url: albumUrl,
  };
};
