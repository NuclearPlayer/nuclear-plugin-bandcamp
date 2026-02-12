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

export const fetchHtml = async (url: string): Promise<Document> => {
  const response = await fetchFn(url);
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
  for (const script of scripts) {
    const content = script.textContent;
    if (!content) continue;
    const parsed = JSON.parse(content) as T;
    return parsed;
  }
  return undefined;
};

export const parseIsoDuration = (iso: string): number | undefined => {
  const match = iso.match(/P(?:(\d+)H)?(\d+)M(\d+)S/);
  if (!match) return undefined;
  const [, hours, mins, secs] = match;
  return (
    (Number(hours ?? 0) * 3600 + Number(mins) * 60 + Number(secs)) * 1000
  );
};
