import type {
  Album,
  AlbumRef,
  Artist,
  ArtistRef,
  MetadataProvider,
  NuclearPluginAPI,
  SearchParams,
  Track,
  TrackRef,
} from '@nuclearplayer/plugin-sdk';

import { DEFAULT_SEARCH_LIMIT, METADATA_PROVIDER_ID } from './config';
import { decodeId, encodeId } from './html';
import { searchArtists, searchAlbums, searchTracks } from './search';
import { getAlbumDetails } from './album';
import { getArtistDetails, getArtistDiscography } from './artist';
import * as lastfm from './lastfm';
import {
  mapAlbumDetail,
  mapArtistDetail,
  mapDiscographyItemToAlbumRef,
  mapSearchItemToAlbumRef,
  mapSearchItemToArtistRef,
  mapSearchItemToTrack,
} from './mappers';
import {
  mapLastfmSimilarArtists,
  mapLastfmTopTracks,
} from './lastfm-mappers';
import { cacheTrackUrl, cacheStreamUrl } from './track-url-cache';

export const createMetadataProvider = (api: NuclearPluginAPI): MetadataProvider =>
  ({
    id: METADATA_PROVIDER_ID,
    kind: 'metadata',
    name: 'Bandcamp',
    searchCapabilities: ['artists', 'albums', 'tracks'],
    artistMetadataCapabilities: ['artistDetails', 'artistAlbums', 'artistTopTracks', 'artistRelatedArtists'],
    albumMetadataCapabilities: ['albumDetails'],

    searchArtists: async (
      params: Omit<SearchParams, 'types'>,
    ): Promise<ArtistRef[]> => {
      const items = await searchArtists(
        api.Http.fetch,
        params.query,
        params.limit ?? DEFAULT_SEARCH_LIMIT,
      );
      return items.map(mapSearchItemToArtistRef);
    },

    searchAlbums: async (
      params: Omit<SearchParams, 'types'>,
    ): Promise<AlbumRef[]> => {
      const items = await searchAlbums(
        api.Http.fetch,
        params.query,
        params.limit ?? DEFAULT_SEARCH_LIMIT,
      );
      return items.map(mapSearchItemToAlbumRef);
    },

    searchTracks: async (
      params: Omit<SearchParams, 'types'>,
    ): Promise<Track[]> => {
      const items = await searchTracks(
        api.Http.fetch,
        params.query,
        params.limit ?? DEFAULT_SEARCH_LIMIT,
      );
      const tracks = items.map(mapSearchItemToTrack);
      tracks.forEach((track) => {
        const artistName = track.artists[0]?.name;
        if (artistName && track.source.url) {
          cacheTrackUrl(artistName, track.title, track.source.url);
        }
      });
      return tracks;
    },

    fetchArtistDetails: async (artistId: string): Promise<Artist> => {
      const artistUrl = decodeId(artistId);
      const detail = await getArtistDetails(api.Http.fetch, artistUrl);
      const lastfmArtist = await lastfm.getArtistInfo(detail.name);
      return mapArtistDetail(detail, lastfmArtist);
    },

    fetchArtistTopTracks: async (artistId: string): Promise<TrackRef[]> => {
      const artistUrl = decodeId(artistId);
      const detail = await getArtistDetails(api.Http.fetch, artistUrl);
      const topTracks = await lastfm.getArtistTopTracks(detail.name);
      return mapLastfmTopTracks(topTracks, detail.name);
    },

    fetchArtistRelatedArtists: async (artistId: string): Promise<ArtistRef[]> => {
      const artistUrl = decodeId(artistId);
      const detail = await getArtistDetails(api.Http.fetch, artistUrl);
      const lastfmArtist = await lastfm.getArtistInfo(detail.name);
      return mapLastfmSimilarArtists(lastfmArtist);
    },

    fetchAlbumDetails: async (albumId: string): Promise<Album> => {
      const albumUrl = decodeId(albumId);
      const detail = await getAlbumDetails(api.Http.fetch, albumUrl);
      const album = mapAlbumDetail(detail);
      (album.tracks ?? []).forEach((track) => {
        const artistName = track.artists[0]?.name;
        if (artistName && track.source.url) {
          cacheTrackUrl(artistName, track.title, track.source.url);
        }
      });
      detail.tracks.forEach((trackDetail) => {
        if (trackDetail.streamUrl && trackDetail.url) {
          cacheStreamUrl(encodeId(trackDetail.url), trackDetail.streamUrl);
        }
      });
      return album;
    },

    fetchArtistAlbums: async (artistId: string): Promise<AlbumRef[]> => {
      const artistUrl = decodeId(artistId);
      const items = await getArtistDiscography(api.Http.fetch, artistUrl);
      return items
        .filter((item) => item.type === 'album')
        .map(mapDiscographyItemToAlbumRef);
    },
  });
