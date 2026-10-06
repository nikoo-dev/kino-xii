# Kino XII — Cinema Booking App

A single-page cinema booking app: browse what's on, filter showtimes, pick seats on a real hall map, check out, and manage tickets — all in the browser.

**Live:** https://nikoo-dev.github.io/kino-xii/

## Features

- **Home** — featured films hero carousel, recently viewed, now playing grid, coming soon with "Notify me" subscriptions
- **Sessions** — filter by venue, date, format, language and time of day; sort, search, and shareable URL state; paginated film groups with live seat availability
- **Movie details** — synopsis, cast, formats, rating note, and per-date showtimes grouped by venue
- **2-step booking** — interactive seat map rendered from the API (sections, rows, aisles), ticket types (Adult / Student / Child) with live pricing, 8-minute seat hold with countdown, checkout, and an order confirmation with reference code
- **Auth** — sign up (with optional avatar) and log in; protected actions resume automatically after signing in
- **Profile & tickets** — edit personal info with validation, plus upcoming / past ticket lists with refund support

## Tech

Vanilla JavaScript, vanilla CSS, no frameworks. Data comes from a REST cinema API (`fetch`, token auth).

## Run it

No build step — serve the folder statically:

```bash
npx serve .
```

then open http://localhost:3000

## Project layout

```
index.html          app shell (navbar, search, modal + toast roots)
css/styles.css      design system (Archivo type, dark theme tokens)
js/app.js           router (#/, #/sessions, #/movie/:slug, #/profile), navbar, search
js/api.js           fetch wrapper, token + pending-action handling
js/store.js         session + cached filter options
js/pages/           home, sessions, movie, profile
js/components/      modal, auth, booking (2-step purchase flow)
```

## Deploy

Any static host works (the repo includes `vercel.json` and `netlify.toml`):

```bash
npx vercel --prod
```
