# Distra Voter

Distra Voter is a config-driven form and voting platform with a password-protected results page. Runs on Netlify: pages are rendered by one Netlify Function, and responses are stored in Netlify Blobs.

Forms are organized into groups (for example, a ministry or team), and each group has its own URL.

| URL | What it is |
| --- | --- |
| `/<group-id>` | A group's page, listing its forms, e.g. `/cwru-cru` |
| `/<group-id>/<form-id>` | The public form, e.g. `/cwru-cru/theology-night` |
| `/admin` | Results for every form, by group (password protected) |
| `/admin/<group-id>/<form-id>` | Results for one form, with CSV export |

The site root (`/`) intentionally returns 404, so only people with a group or form link can find the forms.

## Deploy to Netlify

1. Push this folder to a GitHub repo and import it in Netlify (or run `npx netlify deploy`). `netlify.toml` has all the build settings.
2. In **Site configuration → Environment variables**, set `ADMIN_PASSWORD`. Optionally set `SESSION_SECRET` to any long random string.
3. Redeploy so the function picks up the variables.

Blobs need no setup on Netlify. Changing `ADMIN_PASSWORD` logs out everyone who is signed in to the results pages (unless `SESSION_SECRET` is set).

## Run locally

```sh
npm install
cp .env.example .env    # then set ADMIN_PASSWORD
npm run dev             # http://localhost:8888
npm run typecheck
```

`npm run dev` uses the same handler as Netlify but stores responses as JSON files in `.data/`. Requires Node 23.6+ to run TypeScript directly.

## Adding a group

1. Copy the `forms/cwru-cru/` folder to `forms/<group-id>/` and edit its `index.ts` (`id`, `name`, optional `description`, and the `forms` list).
2. Import the group in `forms/index.ts` and add it to the list.

Group ids can't be `admin` or `static`, because the app uses those paths.

Public pages are branded with the group: its name and badge are in the top bar, and Distra Voter appears only as "Powered by" in the footer. Two optional fields customize this:

- `accentColor`: a hex color like `"#1f6feb"` for buttons, selections and the form header stripe. Without it, pages use the Distra Voter palette.
- `initials`: up to 3 characters for the badge. Defaults to the first letters of the first two words of the name.

## Adding a form

1. Copy `forms/cwru-cru/theology-night.ts` to `forms/<group-id>/<form-id>.ts` and edit it. The `FormConfig` type in `lib/types.ts` documents every field, and your editor will autocomplete and flag mistakes.
2. Import it in that group's `index.ts` and add it to the `forms` list.

Question types:

- `text`: single-line answer
- `textarea`: multi-line answer
- `choice`: radio buttons, or checkboxes with `multiple: true`. Use `min`/`max` to limit the number of picks, and `options` or `groups` (lists with headings) for the choices.

For voting, add `winners: N` to a choice question to highlight the top N on the results page. With `winnerRule: 'one-per-group'`, the leader of each group is guaranteed a spot and the remaining spots go to the highest counts overall. Ties at the cutoff are flagged so you can break them by hand.

Useful form options: `closed: true`, `opensAt` / `closesAt` (ISO date-times), `allowMultiple` (lets one browser submit more than once), and `listed: false` (hides the form from its group page; the direct link still works).

Don't rename group, form, question or option `id`s after responses come in, because results are stored by id. Labels and descriptions can change any time.

## Theology Night voting

Each person picks **up to 3** of the 16 topics (approval voting), and the 3 topics with the most votes win. The winners always include at least one topic from each list.

- **Why 3 picks:** with one pick each, a small group spreads its votes thin across 16 topics, which makes ties likely and hides second choices. With more than 3 picks, popular and lukewarm topics start getting similar counts. Matching the number of picks to the number of winners gives each person a say in every slot while still showing clear preferences.
- **Why "up to":** people who feel strongly about one or two topics don't have to pad their ballot with topics they don't care about.

Repeat votes are blocked by a browser cookie. That stops accidental double votes, but someone using a private window or a second device can vote again, which is fine for a friendly group. If you need stricter control, make `name` required and check the response table for duplicates.

## Data

- View or export: **Export CSV** on the results page.
- Reset a form on Netlify: delete its entries in the site's **Blobs** tab (store `responses`, prefix `<group-id>/<form-id>/`).
- Reset a form locally: delete `.data/<group-id>/<form-id>/`.
