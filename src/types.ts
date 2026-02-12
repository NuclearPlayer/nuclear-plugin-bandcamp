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

export type JsonLdMusicAlbum = {
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

export type JsonLdWithPublisher = {
  publisher?: {
    '@type': string;
    name?: string;
    image?: string;
    foundingLocation?: { name?: string };
  };
};

export type DataTralbumTrack = {
  title: string;
  track_num: number;
  duration: number;
  title_link?: string;
};

export type DataTralbum = {
  trackinfo?: DataTralbumTrack[];
};

export type DataBand = {
  id: number;
  name: string;
  image_id?: number;
};
