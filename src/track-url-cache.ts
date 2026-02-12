const trackUrls = new Map<string, string>();
const streamUrls = new Map<string, string>();

const makeKey = (artist: string, title: string): string =>
  `${artist.toLowerCase()}:${title.toLowerCase()}`;

export const cacheTrackUrl = (
  artist: string,
  title: string,
  url: string,
): void => {
  trackUrls.set(makeKey(artist, title), url);
};

export const getCachedTrackUrl = (
  artist: string,
  title: string,
): string | undefined => trackUrls.get(makeKey(artist, title));

export const cacheStreamUrl = (
  candidateId: string,
  streamUrl: string,
): void => {
  streamUrls.set(candidateId, streamUrl);
};

export const getCachedStreamUrl = (candidateId: string): string | undefined =>
  streamUrls.get(candidateId);

export const cacheTrackUrls = (
  tracks: {
    title: string;
    artists: { name: string }[];
    source: { url?: string };
  }[],
): void => {
  for (const track of tracks) {
    const artistName = track.artists[0]?.name;
    if (artistName && track.source.url) {
      cacheTrackUrl(artistName, track.title, track.source.url);
    }
  }
};

export const clearTrackUrlCache = (): void => {
  trackUrls.clear();
  streamUrls.clear();
};
