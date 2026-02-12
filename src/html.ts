import type { ProviderRef } from '@nuclearplayer/plugin-sdk';

import type { DataTralbum } from './types';

export type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export const encodeId = (url: string): string =>
  btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const decodeId = (encoded: string): string => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
};

export const fetchHtml = async (
  fetchFn: FetchFn,
  url: string,
): Promise<Document> => {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Bandcamp returned ${response.status} for ${url}`);
  }
  const html = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
};

export const extractTextContent = (
  element: Element | null,
): string | undefined => {
  const text = element?.textContent?.trim();
  return text || undefined;
};

export const extractJsonLd = <T>(doc: Document): T | undefined => {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const script = Array.from(scripts).find((script) => script.textContent);
  if (!script?.textContent) {
    return undefined;
  }
  return JSON.parse(script.textContent) as T;
};

export const parseIsoDuration = (iso: string): number | undefined => {
  const match = iso.match(/P(?:(\d+)H)?(\d+)M(\d+)S/);
  if (!match) {
    return undefined;
  }
  const [, hours, mins, secs] = match;
  return (Number(hours ?? 0) * 3600 + Number(mins) * 60 + Number(secs)) * 1000;
};

export const extractDataTralbum = (doc: Document): DataTralbum | undefined => {
  const script = doc.querySelector('script[data-tralbum]');
  const raw = script?.getAttribute('data-tralbum');
  if (!raw) {
    return undefined;
  }
  return JSON.parse(raw) as DataTralbum;
};

export const makeSource = (providerId: string, url: string): ProviderRef => ({
  provider: providerId,
  id: encodeId(url),
  url,
});
