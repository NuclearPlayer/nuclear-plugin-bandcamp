import { extractJsonLd, fetchHtml, parseIsoDuration } from './html';
import type {
  BandcampAlbumDetail,
  BandcampTrackDetail,
  DataTralbum,
  JsonLdMusicAlbum,
} from './types';

export const getAlbumDetails = async (
  albumUrl: string,
): Promise<BandcampAlbumDetail> => {
  const doc = await fetchHtml(albumUrl);

  const jsonLd = extractJsonLd<JsonLdMusicAlbum>(doc);

  let tralbumData: DataTralbum | undefined;
  const scripts = doc.querySelectorAll('script[data-tralbum]');
  for (const script of scripts) {
    const rawData = script.getAttribute('data-tralbum');
    if (rawData) {
      tralbumData = JSON.parse(rawData) as DataTralbum;
      break;
    }
  }

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

    return {
      title: entry.item.name,
      url: entry.item.url,
      durationMs,
      position: entry.position,
    };
  });

  if (tracks.length === 0 && tralbumTracks.length > 0) {
    for (const trTrack of tralbumTracks) {
      tracks.push({
        title: trTrack.title,
        url: trTrack.title_link
          ? new URL(trTrack.title_link, albumUrl).href
          : undefined,
        durationMs: trTrack.duration * 1000,
        position: trTrack.track_num,
      });
    }
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
