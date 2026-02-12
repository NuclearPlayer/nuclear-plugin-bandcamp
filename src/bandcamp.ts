type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

let fetchFn: FetchFn = globalThis.fetch;

export const setFetch = (customFetch: FetchFn): void => {
  fetchFn = customFetch;
};

export const decodeId = (encoded: string): string => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
};

const BANDCAMP_BASE = 'https://bandcamp.com';
const BANDCAMP_SEARCH = `${BANDCAMP_BASE}/search`;

export type BandcampSearchItem = {
  type: 'b' | 'a' | 't';
  id: number;
  name: string;
  url: string;
  imageUrl?: string;
  subhead?: string;
  tags?: string[];
  releaseDate?: string;
  genre?: string;
};

export type BandcampAlbumDetail = {
  name: string;
  artistName: string;
  artistUrl?: string;
  imageUrl?: string;
  releaseDate?: string;
  tags?: string[];
  tracks: BandcampTrackDetail[];
  url: string;
};

export type BandcampTrackDetail = {
  title: string;
  url?: string;
  durationMs?: number;
  position?: number;
};

export type BandcampArtistDetail = {
  name: string;
  imageUrl?: string;
  bio?: string;
  location?: string;
  url: string;
};

export type BandcampDiscographyItem = {
  title: string;
  url: string;
  imageUrl?: string;
  type: 'album' | 'track';
};

const parseIsoDuration = (iso: string): number | undefined => {
  const match = iso.match(/P(?:(\d+)H)?(\d+)M(\d+)S/);
  if (!match) return undefined;
  const [, hours, mins, secs] = match;
  return (
    (Number(hours ?? 0) * 3600 + Number(mins) * 60 + Number(secs)) * 1000
  );
};

const fetchHtml = async (url: string): Promise<Document> => {
  const response = await fetchFn(url);
  const html = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
};

const extractTextContent = (
  element: Element | null,
): string | undefined => {
  const text = element?.textContent?.trim();
  return text || undefined;
};

const parseSearchItem = (listItem: Element): BandcampSearchItem | undefined => {
  const dataAttr = listItem.getAttribute('data-search');
  if (!dataAttr) return undefined;

  const searchData = JSON.parse(dataAttr) as { type: 'b' | 'a' | 't'; id: number };

  const imageElement = listItem.querySelector('div.art img');
  const headingLink = listItem.querySelector('div.heading a');
  const subheadElement = listItem.querySelector('div.subhead');
  const urlElement = listItem.querySelector('div.itemurl a');
  const tagsElement = listItem.querySelector('div.tags');
  const releasedElement = listItem.querySelector('div.released');
  const genreElement = listItem.querySelector('div.genre');

  const name = extractTextContent(headingLink);
  const url = extractTextContent(urlElement);
  if (!name || !url) return undefined;

  const tagsText = extractTextContent(tagsElement);
  const tags = tagsText
    ?.replace(/^tags:/, '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const releaseDateText = extractTextContent(releasedElement);
  const releaseDate = releaseDateText?.replace(/^released\s+/, '');

  const genreText = extractTextContent(genreElement);
  const genre = genreText?.replace(/^genre:\s*/, '');

  return {
    type: searchData.type,
    id: searchData.id,
    name,
    url,
    imageUrl: imageElement?.getAttribute('src') ?? undefined,
    subhead: extractTextContent(subheadElement),
    tags,
    releaseDate,
    genre,
  };
};

const searchBandcamp = async (
  query: string,
  itemType: string,
  limit: number,
): Promise<BandcampSearchItem[]> => {
  const searchUrl = `${BANDCAMP_SEARCH}?q=${encodeURIComponent(query)}&item_type=${itemType}&page=1`;
  const doc = await fetchHtml(searchUrl);
  const resultItems = doc.querySelectorAll('li.searchresult');

  const items: BandcampSearchItem[] = [];
  for (const listItem of resultItems) {
    if (items.length >= limit) break;
    const parsed = parseSearchItem(listItem);
    if (parsed) items.push(parsed);
  }

  return items;
};

export const searchArtists = (
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(query, 'b', limit);

export const searchAlbums = (
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(query, 'a', limit);

export const searchTracks = (
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(query, 't', limit);

const extractJsonLd = <T>(doc: Document): T | undefined => {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    const content = script.textContent;
    if (!content) continue;
    const parsed = JSON.parse(content) as T;
    return parsed;
  }
  return undefined;
};

type JsonLdMusicAlbum = {
  '@type': 'MusicAlbum';
  name: string;
  byArtist: { '@type': string; name: string; url?: string };
  datePublished?: string;
  image?: string;
  numTracks?: number;
  track?: {
    numberOfItems: number;
    itemListElement: {
      position: number;
      '@type': string;
      item: {
        '@type': string;
        name: string;
        url?: string;
        duration?: string;
      };
    }[];
  };
  publisher?: { '@type': string; name: string; url?: string };
  keywords?: string[];
};

type DataTralbumTrack = {
  title: string;
  track_num: number;
  duration: number;
  title_link?: string;
};

type DataTralbum = {
  trackinfo?: DataTralbumTrack[];
};

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

type JsonLdWithPublisher = {
  publisher?: {
    '@type': string;
    name?: string;
    image?: string;
    foundingLocation?: { name?: string };
  };
};

type DataBand = {
  id: number;
  name: string;
  image_id?: number;
};

const BANDCAMP_IMAGE_BASE = 'https://f4.bcbits.com/img';

const buildBandImageUrl = (imageId: number): string => {
  const paddedId = String(imageId).padStart(10, '0');
  return `${BANDCAMP_IMAGE_BASE}/${paddedId}_10.jpg`;
};

const extractDataBand = (doc: Document): DataBand | undefined => {
  const script = doc.querySelector('script[data-band]');
  if (!script) return undefined;
  const raw = script.getAttribute('data-band');
  if (!raw) return undefined;
  return JSON.parse(raw) as DataBand;
};

const ARTIST_CACHE_TTL_MS = 30_000;
const artistCache = new Map<string, { data: BandcampArtistDetail; timestamp: number }>();

export const getArtistDetails = async (
  artistUrl: string,
): Promise<BandcampArtistDetail> => {
  const cached = artistCache.get(artistUrl);
  if (cached && Date.now() - cached.timestamp < ARTIST_CACHE_TTL_MS) {
    return cached.data;
  }
  const doc = await fetchHtml(artistUrl);

  const dataBand = extractDataBand(doc);
  const jsonLd = extractJsonLd<JsonLdWithPublisher>(doc);
  const publisher = jsonLd?.publisher;

  const name =
    dataBand?.name ??
    extractTextContent(doc.querySelector('#band-name-location .title')) ??
    '';

  const dataBandImageUrl = dataBand?.image_id
    ? buildBandImageUrl(dataBand.image_id)
    : undefined;
  const bandPhotoSrc =
    doc.querySelector('img.band-photo')?.getAttribute('src') ?? undefined;
  const imageUrl = dataBandImageUrl ?? bandPhotoSrc ?? publisher?.image;

  const bioTextElement = doc.querySelector(
    'div.signed-out-artists-bio-text p#bio-text',
  );
  const bioContainer = doc.querySelector('div.signed-out-artists-bio-text');
  const bio =
    extractTextContent(bioTextElement) ?? extractTextContent(bioContainer);

  const location =
    extractTextContent(doc.querySelector('#band-name-location .location')) ??
    publisher?.foundingLocation?.name;

  const result: BandcampArtistDetail = {
    name,
    imageUrl,
    bio,
    location,
    url: artistUrl,
  };

  artistCache.set(artistUrl, { data: result, timestamp: Date.now() });
  return result;
};

export const getArtistDiscography = async (
  artistUrl: string,
): Promise<BandcampDiscographyItem[]> => {
  const musicPageUrl = artistUrl.endsWith('/')
    ? `${artistUrl}music`
    : `${artistUrl}/music`;

  const doc = await fetchHtml(musicPageUrl);

  const gridItems = doc.querySelectorAll('li.music-grid-item');
  const discography: BandcampDiscographyItem[] = [];

  for (const gridItem of gridItems) {
    const link = gridItem.querySelector('a');
    const image = gridItem.querySelector('img');
    const titleElement = gridItem.querySelector('p.title');

    const href = link?.getAttribute('href');
    if (!href) continue;

    const fullUrl = new URL(href, artistUrl).href;
    const title = extractTextContent(titleElement) ?? '';
    const imageUrl = image?.getAttribute('src') ?? undefined;

    const dataItemId = gridItem.getAttribute('data-item-id') ?? '';
    const itemType = dataItemId.startsWith('album') ? 'album' as const : 'track' as const;

    discography.push({
      title,
      url: fullUrl,
      imageUrl,
      type: itemType,
    });
  }

  return discography;
};
