import type {
  NuclearPluginAPI,
  Stream,
  StreamCandidate,
  StreamingProvider,
} from '@nuclearplayer/plugin-sdk';

import { STREAMING_PROVIDER_ID, STREAMING_SEARCH_LIMIT } from './config';
import { decodeId, encodeId } from './html';
import { searchTracks } from './search';
import { getStreamUrl } from './stream';
import { mapSearchItemToStreamCandidate } from './mappers';
import { getCachedTrackUrl, getCachedStreamUrl } from './track-url-cache';

export const createStreamingProvider = (api: NuclearPluginAPI): StreamingProvider => ({
  id: STREAMING_PROVIDER_ID,
  kind: 'streaming',
  name: 'Bandcamp',

  searchForTrack: async (artist, title) => {
    const cachedUrl = getCachedTrackUrl(artist, title);
    if (cachedUrl) {
      api.Logger.debug(`Track URL cache hit for "${artist} - ${title}"`);
      const candidate: StreamCandidate = {
        id: encodeId(cachedUrl),
        title,
        failed: false,
        source: { provider: STREAMING_PROVIDER_ID, id: encodeId(cachedUrl), url: cachedUrl },
      };
      return [candidate];
    }

    const query = `${artist} ${title}`;
    const items = await searchTracks(api.Http.fetch, query, STREAMING_SEARCH_LIMIT);
    return items.map(mapSearchItemToStreamCandidate);
  },

  getStreamUrl: async (candidateId) => {
    const cachedStreamUrl = getCachedStreamUrl(candidateId);
    if (cachedStreamUrl) {
      api.Logger.debug(`Stream URL cache hit for candidate ${candidateId}`);
      const trackUrl = decodeId(candidateId);
      const stream: Stream = {
        url: cachedStreamUrl,
        protocol: 'https',
        mimeType: 'audio/mpeg',
        bitrateKbps: 128,
        source: { provider: STREAMING_PROVIDER_ID, id: candidateId, url: trackUrl },
      };
      return stream;
    }

    const trackUrl = decodeId(candidateId);
    const streamInfo = await getStreamUrl(api.Http.fetch, trackUrl);

    api.Logger.debug(`Resolved stream for ${trackUrl}`);

    const stream: Stream = {
      url: streamInfo.url,
      protocol: 'https',
      mimeType: 'audio/mpeg',
      bitrateKbps: 128,
      durationMs: streamInfo.durationMs,
      source: { provider: STREAMING_PROVIDER_ID, id: candidateId, url: trackUrl },
    };
    return stream;
  },
});
