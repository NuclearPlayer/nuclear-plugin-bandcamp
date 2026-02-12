import type {
  Album,
  AlbumRef,
  Artist,
  ArtistRef,
  MetadataProvider,
  NuclearPlugin,
  NuclearPluginAPI,
  SearchParams,
  Track,
} from '@nuclearplayer/plugin-sdk';

import { decodeId, setFetch } from './bandcamp';
import * as bandcamp from './bandcamp';
import * as lastfm from './lastfm';
import {
  mapAlbumDetail,
  mapArtistDetail,
  mapDiscographyItemToAlbumRef,
  mapLastfmSimilarArtists,
  mapLastfmTopTracks,
  mapSearchItemToAlbumRef,
  mapSearchItemToArtistRef,
  mapSearchItemToTrack,
} from './mappers';

const DEFAULT_SEARCH_LIMIT = 15;
const PROVIDER_ID = 'bandcamp';

const createProvider = (): MetadataProvider =>
  ({
    id: PROVIDER_ID,
    kind: 'metadata',
    name: 'Bandcamp',
    searchCapabilities: ['artists', 'albums', 'tracks'],
    artistMetadataCapabilities: ['artistDetails', 'artistAlbums', 'artistTopTracks', 'artistRelatedArtists'],
    albumMetadataCapabilities: ['albumDetails'],

    searchArtists: async (
      params: Omit<SearchParams, 'types'>,
    ): Promise<ArtistRef[]> => {
      const items = await bandcamp.searchArtists(
        params.query,
        params.limit ?? DEFAULT_SEARCH_LIMIT,
      );
      return items.map(mapSearchItemToArtistRef);
    },

    searchAlbums: async (
      params: Omit<SearchParams, 'types'>,
    ): Promise<AlbumRef[]> => {
      const items = await bandcamp.searchAlbums(
        params.query,
        params.limit ?? DEFAULT_SEARCH_LIMIT,
      );
      return items.map(mapSearchItemToAlbumRef);
    },

    searchTracks: async (
      params: Omit<SearchParams, 'types'>,
    ): Promise<Track[]> => {
      const items = await bandcamp.searchTracks(
        params.query,
        params.limit ?? DEFAULT_SEARCH_LIMIT,
      );
      return items.map(mapSearchItemToTrack);
    },

    fetchArtistDetails: async (artistId: string): Promise<Artist> => {
      const artistUrl = decodeId(artistId);
      const detail = await bandcamp.getArtistDetails(artistUrl);
      const lastfmArtist = await lastfm.getArtistInfo(detail.name);
      return mapArtistDetail(detail, lastfmArtist);
    },

    fetchArtistTopTracks: async (artistId: string): Promise<Track[]> => {
      const artistUrl = decodeId(artistId);
      const detail = await bandcamp.getArtistDetails(artistUrl);
      const topTracks = await lastfm.getArtistTopTracks(detail.name);
      return mapLastfmTopTracks(topTracks, detail.name);
    },

    fetchArtistRelatedArtists: async (artistId: string): Promise<ArtistRef[]> => {
      const artistUrl = decodeId(artistId);
      const detail = await bandcamp.getArtistDetails(artistUrl);
      const lastfmArtist = await lastfm.getArtistInfo(detail.name);
      return mapLastfmSimilarArtists(lastfmArtist);
    },

    fetchAlbumDetails: async (albumId: string): Promise<Album> => {
      const albumUrl = decodeId(albumId);
      const detail = await bandcamp.getAlbumDetails(albumUrl);
      return mapAlbumDetail(detail);
    },

    fetchArtistAlbums: async (artistId: string): Promise<AlbumRef[]> => {
      const artistUrl = decodeId(artistId);
      const items = await bandcamp.getArtistDiscography(artistUrl);
      return items
        .filter((item) => item.type === 'album')
        .map(mapDiscographyItemToAlbumRef);
    },
  }) as MetadataProvider;

const plugin: NuclearPlugin = {
  onLoad() {},

  onEnable(api: NuclearPluginAPI) {
    setFetch(api.Http.fetch);
    api.Providers.register(createProvider());
  },

  onDisable() {},

  onUnload() {},
};

export default plugin;
