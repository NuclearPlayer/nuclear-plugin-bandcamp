import type {
  Album,
  AlbumRef,
  Artist,
  ArtistRef,
  ArtworkSet,
  ProviderRef,
  Track,
} from '@nuclearplayer/plugin-sdk';

import type {
  BandcampAlbumDetail,
  BandcampArtistDetail,
  BandcampDiscographyItem,
  BandcampSearchItem,
} from './bandcamp';
import type { LastfmArtist, LastfmTopTracks } from './lastfm';

const PROVIDER_ID = 'bandcamp';

const LARGE_IMAGE_SUFFIX = '_10.jpg';
const THUMBNAIL_IMAGE_SUFFIX = '_2.jpg';

const encodeId = (url: string): string =>
  btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const makeSource = (url: string): ProviderRef => ({
  provider: PROVIDER_ID,
  id: encodeId(url),
  url,
});

const replaceImageSuffix = (
  imageUrl: string,
  suffix: string,
): string => imageUrl.replace(/_\d+\.jpg$/, suffix);

const makeArtworkSet = (imageUrl?: string): ArtworkSet | undefined => {
  if (!imageUrl) return undefined;
  return {
    items: [
      {
        url: replaceImageSuffix(imageUrl, LARGE_IMAGE_SUFFIX),
        width: 1200,
        height: 1200,
        purpose: 'cover',
      },
      {
        url: replaceImageSuffix(imageUrl, THUMBNAIL_IMAGE_SUFFIX),
        width: 350,
        height: 350,
        purpose: 'thumbnail',
      },
    ],
  };
};

const extractArtistBaseUrl = (itemUrl: string): string => {
  const parsed = new URL(itemUrl);
  return parsed.origin;
};

const parseArtistFromSubhead = (
  subhead?: string,
): string | undefined => {
  if (!subhead) return undefined;
  const byMatch = subhead.match(/by\s+(.+)/);
  return byMatch?.[1]?.trim();
};

const parseAlbumAndArtistFromSubhead = (
  subhead?: string,
): { album?: string; artist?: string } => {
  if (!subhead) return {};

  const fromByMatch = subhead.match(/from\s+(.+?)\s+by\s+(.+)/);
  if (fromByMatch) {
    return {
      album: fromByMatch[1]?.trim(),
      artist: fromByMatch[2]?.trim(),
    };
  }

  const byMatch = subhead.match(/by\s+(.+)/);
  if (byMatch) {
    return { artist: byMatch[1]?.trim() };
  }

  return {};
};

const parseReleaseDate = (
  dateString?: string,
): { precision: 'year' | 'month' | 'day'; dateIso: string } | undefined => {
  if (!dateString) return undefined;

  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) return undefined;

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');

  return {
    precision: 'day',
    dateIso: `${year}-${month}-${day}`,
  };
};

export const mapSearchItemToArtistRef = (
  item: BandcampSearchItem,
): ArtistRef => ({
  name: item.name,
  artwork: makeArtworkSet(item.imageUrl),
  source: makeSource(item.url),
});

export const mapSearchItemToAlbumRef = (
  item: BandcampSearchItem,
): AlbumRef => {
  const artistName = parseArtistFromSubhead(item.subhead);
  const artistUrl = extractArtistBaseUrl(item.url);

  return {
    title: item.name,
    artists: artistName
      ? [{ name: artistName, source: makeSource(artistUrl) }]
      : undefined,
    artwork: makeArtworkSet(item.imageUrl),
    source: makeSource(item.url),
  };
};

export const mapSearchItemToTrack = (
  item: BandcampSearchItem,
): Track => {
  const { album, artist } = parseAlbumAndArtistFromSubhead(item.subhead);
  const artistUrl = extractArtistBaseUrl(item.url);

  return {
    title: item.name,
    artists: artist
      ? [{ name: artist, roles: [], source: makeSource(artistUrl) }]
      : [],
    album: album
      ? { title: album, source: makeSource(artistUrl) }
      : undefined,
    tags: item.tags,
    artwork: makeArtworkSet(item.imageUrl),
    source: makeSource(item.url),
  };
};

export const mapArtistDetail = (
  detail: BandcampArtistDetail,
  lastfmData?: LastfmArtist,
): Artist => ({
  name: detail.name,
  bio: detail.bio || lastfmData?.artist?.bio?.content,
  artwork: makeArtworkSet(detail.imageUrl),
  tags: lastfmData?.artist?.tags?.tag.map((tag) => tag.name),
  source: makeSource(detail.url),
});

export const mapAlbumDetail = (
  detail: BandcampAlbumDetail,
): Album => ({
  title: detail.name,
  artists: [
    {
      name: detail.artistName,
      roles: [],
      source: detail.artistUrl
        ? makeSource(detail.artistUrl)
        : undefined,
    },
  ],
  tracks: detail.tracks.map((track) => ({
    title: track.title,
    artists: [
      {
        name: detail.artistName,
        source: detail.artistUrl
          ? makeSource(detail.artistUrl)
          : makeSource(detail.url),
      },
    ],
    artwork: makeArtworkSet(detail.imageUrl),
    source: makeSource(track.url ?? detail.url),
    durationMs: track.durationMs,
  })),
  releaseDate: parseReleaseDate(detail.releaseDate),
  genres: detail.tags,
  artwork: makeArtworkSet(detail.imageUrl),
  source: makeSource(detail.url),
});

export const mapDiscographyItemToAlbumRef = (
  item: BandcampDiscographyItem,
): AlbumRef => ({
  title: item.title,
  artwork: makeArtworkSet(item.imageUrl),
  source: makeSource(item.url),
});

const LASTFM_PROVIDER_ID = 'lastfm';

export const mapLastfmTopTracks = (
  lastfmData: LastfmTopTracks,
  artistName: string,
): Track[] =>
  (lastfmData?.toptracks?.track ?? []).map((track) => ({
    title: track.name,
    artists: [{ name: artistName, roles: [] }],
    source: {
      provider: LASTFM_PROVIDER_ID,
      id: `${artistName}:${track.name}`,
    },
  }));

export const mapLastfmSimilarArtists = (
  lastfmData: LastfmArtist,
): ArtistRef[] =>
  (lastfmData?.artist?.similar?.artist ?? []).map((similar) => {
    const image = similar.image?.find((img) => img.size === 'large')?.['#text'];
    return {
      name: similar.name,
      artwork: image ? { items: [{ url: image }] } : undefined,
      source: {
        provider: LASTFM_PROVIDER_ID,
        id: similar.name,
      },
    };
  });
