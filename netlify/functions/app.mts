import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';
import { createHandler } from '../../lib/app.ts';
import type { Store } from '../../lib/types.ts';

function blobStore(name: string): Store {
  const blobs = () => getStore({ name, consistency: 'strong' });
  return {
    get: (key) => blobs().get(key, { type: 'json' }),
    async set(key, value, options) {
      const { modified } = await blobs().setJSON(key, value, options?.onlyIfNew ? { onlyIfNew: true } : undefined);
      return modified;
    },
    async list(prefix) {
      const { blobs: list } = await blobs().list({ prefix });
      return list.map((b) => b.key);
    },
  };
}

export default createHandler({
  stores: { responses: blobStore('responses'), giveaway: blobStore('giveaway') },
  env: process.env,
});

// Every path except static assets goes to the app (groups are top-level: /cru).
export const config: Config = {
  path: ['/', '/*'],
  excludedPath: ['/static/*'],
};
