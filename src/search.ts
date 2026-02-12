import { BANDCAMP_SEARCH_URL } from './config';
import type { FetchFn } from './html';
import { extractTextContent, fetchHtml } from './html';
import type { BandcampSearchItem } from './types';

const SELECTORS = {
  resultList: 'li.searchresult',
  image: 'div.art img',
  heading: 'div.heading a',
  subhead: 'div.subhead',
  itemUrl: 'div.itemurl a',
  tags: 'div.tags',
  released: 'div.released',
  genre: 'div.genre',
} as const;

const parseSearchItem = (listItem: Element): BandcampSearchItem | undefined => {
  const dataAttr = listItem.getAttribute('data-search');
  if (!dataAttr) {
    return undefined;
  }

  const searchData = JSON.parse(dataAttr) as {
    type: 'b' | 'a' | 't';
    id: number;
  };

  const imageElement = listItem.querySelector(SELECTORS.image);
  const headingLink = listItem.querySelector(SELECTORS.heading);
  const subheadElement = listItem.querySelector(SELECTORS.subhead);
  const urlElement = listItem.querySelector(SELECTORS.itemUrl);
  const tagsElement = listItem.querySelector(SELECTORS.tags);
  const releasedElement = listItem.querySelector(SELECTORS.released);
  const genreElement = listItem.querySelector(SELECTORS.genre);

  const name = extractTextContent(headingLink);
  const url = extractTextContent(urlElement);
  if (!name || !url) {
    return undefined;
  }

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
  fetchFn: FetchFn,
  query: string,
  itemType: string,
  limit: number,
): Promise<BandcampSearchItem[]> => {
  const searchUrl = `${BANDCAMP_SEARCH_URL}?q=${encodeURIComponent(query)}&item_type=${itemType}&page=1`;
  const doc = await fetchHtml(fetchFn, searchUrl);
  const resultItems = doc.querySelectorAll(SELECTORS.resultList);

  const items = Array.from(resultItems).reduce<BandcampSearchItem[]>(
    (acc, listItem) => {
      if (acc.length >= limit) {
        return acc;
      }
      const parsed = parseSearchItem(listItem);
      if (parsed) {
        acc.push(parsed);
      }
      return acc;
    },
    [],
  );

  return items;
};

export const searchArtists = (
  fetchFn: FetchFn,
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(fetchFn, query, 'b', limit);

export const searchAlbums = (
  fetchFn: FetchFn,
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(fetchFn, query, 'a', limit);

export const searchTracks = (
  fetchFn: FetchFn,
  query: string,
  limit: number,
): Promise<BandcampSearchItem[]> => searchBandcamp(fetchFn, query, 't', limit);
