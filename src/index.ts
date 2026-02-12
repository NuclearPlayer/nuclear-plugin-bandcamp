import type { NuclearPlugin, NuclearPluginAPI } from '@nuclearplayer/plugin-sdk';

import { METADATA_PROVIDER_ID, STREAMING_PROVIDER_ID } from './config';
import { createMetadataProvider } from './metadata-provider';
import { createStreamingProvider } from './streaming-provider';
import { clearTrackUrlCache } from './track-url-cache';

const plugin: NuclearPlugin = {
  onEnable(api: NuclearPluginAPI) {
    api.Providers.register(createMetadataProvider(api));
    api.Providers.register(createStreamingProvider(api));
  },

  onDisable(api: NuclearPluginAPI) {
    api.Providers.unregister(METADATA_PROVIDER_ID);
    api.Providers.unregister(STREAMING_PROVIDER_ID);
    clearTrackUrlCache();
  },
};

export default plugin;
