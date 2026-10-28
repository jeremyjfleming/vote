import type { Form, ResponseRecord, Store } from './types.ts';

// Keys are "<group>/<form>/<random id>": nothing in the key reveals when a response arrived.
export async function addResponse(store: Store, form: Form, record: ResponseRecord): Promise<void> {
  await store.set(`${form.key}/${record.id}`, record);
}

/**
 * Re-saves every entry under prefix unchanged. Run after each submission to an
 * anonymous form, so storage-level "last modified" times all match the latest
 * submission and can't be used to tell when an entry was made, or to pair a
 * response with the giveaway code created alongside it.
 */
export async function rewriteAll(store: Store, prefix: string): Promise<void> {
  const keys = await store.list(prefix);
  await Promise.all(
    keys.map(async (key) => {
      const value = await store.get(key);
      if (value !== null) await store.set(key, value);
    })
  );
}

export async function listResponses(store: Store, form: Form): Promise<ResponseRecord[]> {
  const keys = await store.list(`${form.key}/`);
  const records = await Promise.all(keys.map((k) => store.get<ResponseRecord>(k)));
  // Anonymous forms store the date only, so same-day responses fall back to
  // their random ids and come out in no meaningful order.
  return records
    .filter((r) => r !== null)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
}
