import type { ArtistRef, TrackRef } from '@nuclearplayer/plugin-sdk';

import type { LastfmArtist, LastfmTopTracks } from './lastfm';

const LASTFM_PROVIDER_ID = 'lastfm';

export const mapLastfmTopTracks = (
  lastfmData: LastfmTopTracks,
  artistName: string,
): TrackRef[] =>
  (lastfmData?.toptracks?.track ?? []).map((track) => ({
    title: track.name,
    artists: [
      {
        name: artistName,
        source: { provider: LASTFM_PROVIDER_ID, id: artistName },
      },
    ],
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
