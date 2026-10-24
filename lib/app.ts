import crypto from 'node:crypto';
import { findForm, groups, isOpen } from './forms.ts';
import { validate } from './validate.ts';
import { tally } from './results.ts';
import { toCsv } from './csv.ts';
import * as views from './views.ts';
import type { ResponseStore } from './types.ts';

const ADMIN_COOKIE = 'fv_admin';
const SESSION_MS = 12 * 60 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

interface HandlerOptions {
  store: ResponseStore;
  env: Record<string, string | undefined>;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest();

function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function cookie(name: string, value: string, { maxAge, secure }: { maxAge: number; secure: boolean }): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function html(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } });
}

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ location });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(null, { status: 303, headers });
}

export function createHandler({ store, env }: HandlerOptions): (req: Request) => Promise<Response> {
  const password = env.ADMIN_PASSWORD || '';
  // Derived from the password when unset, so changing the password signs everyone out.
  const secret = env.SESSION_SECRET || sha256(`forms-session:${password}`).toString('hex');
  const failures = new Map<string, { count: number; first: number }>(); // best effort: per function instance

  const sign = (v: string) => crypto.createHmac('sha256', secret).update(v).digest('base64url');

  function isAdmin(req: Request): boolean {
    if (!password) return false;
    const [exp, sig] = (parseCookies(req)[ADMIN_COOKIE] || '').split('.');
    if (!exp || !sig || Number(exp) < Date.now()) return false;
    const expected = sign(exp);
    return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  }

  function lockedOut(ip: string): boolean {
    const f = failures.get(ip);
    return Boolean(f && f.count >= MAX_FAILURES && Date.now() - f.first < LOCKOUT_MS);
  }

  function recordFailure(ip: string): void {
    const f = failures.get(ip);
    if (!f || Date.now() - f.first > LOCKOUT_MS) failures.set(ip, { count: 1, first: Date.now() });
    else f.count++;
  }

  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const secure = url.protocol === 'https:';
    const method = req.method;
    let m: RegExpMatchArray | null;

    // Admin
    const noStore = { 'cache-control': 'no-store' };

    if (path === '/admin/login') {
      if (method === 'GET') {
        if (isAdmin(req)) return redirect('/admin');
        return html(views.login({ next: url.searchParams.get('next') || '', configured: Boolean(password) }), 200, noStore);
      }
      if (method === 'POST') {
        const data = await req.formData();
        const next = String(data.get('next') || '');
        const safeNext = /^\/admin(\/|$)/.test(next) ? next : '/admin';
        const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'local';

        if (!password) return html(views.login({ configured: false }), 503, noStore);
        if (lockedOut(ip)) return html(views.login({ next, error: 'Too many attempts. Try again in a few minutes.' }), 429, noStore);

        const ok = crypto.timingSafeEqual(sha256(String(data.get('password') || '')), sha256(password));
        if (!ok) {
          recordFailure(ip);
          return html(views.login({ next, error: 'That password is not right.' }), 401, noStore);
        }
        failures.delete(ip);
        const exp = String(Date.now() + SESSION_MS);
        return redirect(safeNext, [cookie(ADMIN_COOKIE, `${exp}.${sign(exp)}`, { maxAge: SESSION_MS / 1000, secure })]);
      }
    }

    if (path === '/admin/logout' && method === 'POST') {
      return redirect('/admin/login', [cookie(ADMIN_COOKIE, '', { maxAge: 0, secure })]);
    }

    if (path === '/admin' || path.startsWith('/admin/')) {
      if (!isAdmin(req)) return redirect(`/admin/login?next=${encodeURIComponent(path)}`);

      if (path === '/admin' && method === 'GET') {
        const list = await Promise.all(
          [...groups.values()].map(async (group) => ({
            group,
            forms: await Promise.all([...group.forms.values()].map(async (form) => ({ form, count: (await store.all(form.key)).length }))),
          }))
        );
        return html(views.adminHome(list), 200, noStore);
      }

      if ((m = path.match(/^\/admin\/([a-z0-9-]+)\/([a-z0-9-]+)(\/export\.csv)?$/)) && method === 'GET') {
        const form = findForm(m[1], m[2]);
        if (!form) return html(views.notFound(), 404);
        const responses = await store.all(form.key);
        if (m[3]) {
          return new Response(toCsv(form, responses), {
            headers: {
              'content-type': 'text/csv; charset=utf-8',
              'content-disposition': `attachment; filename="${form.groupId}-${form.id}-responses.csv"`,
              ...noStore,
            },
          });
        }
        return html(views.results(form, tally(form, responses), responses), 200, noStore);
      }

      return html(views.notFound(), 404);
    }

    // Group page: /<group>
    if ((m = path.match(/^\/([a-z0-9-]+)$/)) && method === 'GET') {
      const group = groups.get(m[1]);
      if (group) return html(views.group(group));
    }

    // Public form: /<group>/<form>
    if ((m = path.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)(\/thanks)?$/))) {
      const form = findForm(m[1], m[2]);
      if (!form) return html(views.notFound(), 404);
      const votedCookie = `fv_done_${form.groupId}_${form.id}`;

      if (m[3]) return html(views.thanks(form));
      if (!isOpen(form)) return html(views.closed(form));
      if (!form.allowMultiple && parseCookies(req)[votedCookie]) return html(views.thanks(form, { already: true }));

      if (method === 'GET') return html(views.form(form));
      if (method === 'POST') {
        const { answers, errors } = validate(form, await req.formData());
        if (Object.keys(errors).length) return html(views.form(form, { values: answers, errors }), 422);
        await store.add(form.key, { id: crypto.randomUUID(), submittedAt: new Date().toISOString(), answers });
        const cookies = form.allowMultiple ? [] : [cookie(votedCookie, '1', { maxAge: 180 * 86400, secure })];
        return redirect(`${form.path}/thanks`, cookies);
      }
    }

    return html(views.notFound(), 404);
  }

  return async (req) => {
    try {
      return await route(req);
    } catch (err) {
      console.error(err);
      return html(views.error(), 500);
    }
  };
}
