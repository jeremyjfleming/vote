import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';
import { createHandler } from '../../lib/app.ts';
import type { ResponseRecord, ResponseStore } from '../../lib/types.ts';

// Each response is its own blob (key: "<group>/<form>/<timestamp>-<id>"), so concurrent
// submissions never overwrite each other.
const blobs = () => getStore({ name: 'responses', consistency: 'strong' });

const store: ResponseStore = {
  async add(formKey, record) {
    await blobs().setJSON(`${formKey}/${Date.now()}-${record.id}`, record);
  },
  async all(formKey) {
    const s = blobs();
    const { blobs: list } = await s.list({ prefix: `${formKey}/` });
    const records: (ResponseRecord | null)[] = await Promise.all(list.map((b) => s.get(b.key, { type: 'json' })));
    return records.filter((r) => r !== null).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  },
};

export default createHandler({ store, env: process.env });

// Every path except static assets goes to the app (groups are top-level: /cru).
export const config: Config = {
  path: ['/', '/*'],
  excludedPath: ['/static/*'],
};
