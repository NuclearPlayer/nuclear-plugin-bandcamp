import type { FetchFn } from './html';
import { extractJsonLd, extractTextContent, fetchHtml } from './html';
import { ARTIST_CACHE_TTL_MS, BANDCAMP_IMAGE_BASE } from './config';
import type {
  BandcampArtistDetail,
  BandcampDiscographyItem,
  DataBand,
  JsonLdWithPublisher,
} from './types';

const SELECTORS = {
  bandName: '#band-name-location .title',
  bandLocation: '#band-name-location .location',
  bandPhoto: 'img.band-photo',
  bioText: 'div.signed-out-artists-bio-text p#bio-text',
  bioContainer: 'div.signed-out-artists-bio-text',
  discographyItem: 'li.music-grid-item',
  discographyTitle: 'p.title',
} as const;

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

const artistCache = new Map<string, { data: BandcampArtistDetail; timestamp: number }>();

export const getArtistDetails = async (
  fetchFn: FetchFn,
  artistUrl: string,
): Promise<BandcampArtistDetail> => {
  const cached = artistCache.get(artistUrl);
  if (cached && Date.now() - cached.timestamp < ARTIST_CACHE_TTL_MS) {
    return cached.data;
  }
  const doc = await fetchHtml(fetchFn, artistUrl);

  const dataBand = extractDataBand(doc);
  const jsonLd = extractJsonLd<JsonLdWithPublisher>(doc);
  const publisher = jsonLd?.publisher;

  const name =
    dataBand?.name ??
    extractTextContent(doc.querySelector(SELECTORS.bandName)) ??
    '';

  const dataBandImageUrl = dataBand?.image_id
    ? buildBandImageUrl(dataBand.image_id)
    : undefined;
  const bandPhotoSrc =
    doc.querySelector(SELECTORS.bandPhoto)?.getAttribute('src') ?? undefined;
  const imageUrl = dataBandImageUrl ?? bandPhotoSrc ?? publisher?.image;

  const bioTextElement = doc.querySelector(SELECTORS.bioText);
  const bioContainer = doc.querySelector(SELECTORS.bioContainer);
  const bio =
    extractTextContent(bioTextElement) ?? extractTextContent(bioContainer);

  const location =
    extractTextContent(doc.querySelector(SELECTORS.bandLocation)) ??
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
  fetchFn: FetchFn,
  artistUrl: string,
): Promise<BandcampDiscographyItem[]> => {
  const musicPageUrl = artistUrl.endsWith('/')
    ? `${artistUrl}music`
    : `${artistUrl}/music`;

  const doc = await fetchHtml(fetchFn, musicPageUrl);

  const gridItems = doc.querySelectorAll(SELECTORS.discographyItem);
  const discography = Array.from(gridItems).reduce<BandcampDiscographyItem[]>(
    (accumulated, gridItem) => {
      const link = gridItem.querySelector('a');
      const image = gridItem.querySelector('img');
      const titleElement = gridItem.querySelector(SELECTORS.discographyTitle);

      const href = link?.getAttribute('href');
      if (!href) return accumulated;

      const fullUrl = new URL(href, artistUrl).href;
      const title = extractTextContent(titleElement) ?? '';
      const imageUrl = image?.getAttribute('src') ?? undefined;

      const dataItemId = gridItem.getAttribute('data-item-id') ?? '';
      const itemType = dataItemId.startsWith('album') ? 'album' as const : 'track' as const;

      accumulated.push({
        title,
        url: fullUrl,
        imageUrl,
        type: itemType,
      });
      return accumulated;
    },
    [],
  );

  return discography;
};
