# Kino XII — Redberry Bootcamp XII (Vanilla JS)

Full cinema booking app. Vanilla JS + vanilla CSS only. No frameworks.
Design: Figma `Redberry-Bootcamp-XII` (Archivo, #070C1C / #1E2031 / #2A2C3D, brand #EC3013).
API: `https://api.kinoxii.redberryinternship.ge/api` — test account `jane@kinoxii.test / password`.

## Run
No build. Static files only.
- VS Code Live Server → open `index.html` → Go Live
- or `npx serve "D:\niko\Redberry"` → http://localhost:3000
- Routes: `#/`, `#/sessions?...`, `#/movie/:slug`, `#/profile`

## Features (PDFs 1-11 + Figma)
- Navbar: KINO XII, SESSIONS, search pill with prompt/results/no-results overlay, Sign up red / Log in white, authorized MS avatar + name + orange dot if incomplete
- Home: featured hero (4 films, 7s rotate, arrows/dots), Recently viewed (localStorage, authorized), Now Playing cards, Coming Soon + Notify Me (auth-gated, 201 idempotent)
- Sessions: venue/date(7d)/format(dynamic by venue)/language/time filters, search, sort, 10 films/page pager, sold-out dimmed, URL query sync, skeletons, empty/error/retry, page reset on filter change
- Movie: backdrop hero, Details column (director/cast/duration/release/formats/from price/rating note), 7-day picker with availableDates disabling, sessions grouped by venue
- Booking modal (1146px): SEATS/CHECKOUT steps, SCREEN bar, sections→rows→seats from API (aisleAfter spacers, row labels from data), legend, max 3, per-seat pills Child 60% / Student 75% / Adult 100% (child hidden for 16+/18+), live subtotal, POST holds → 8-min timer from expiresAt, checkout prefill + card validation, POST orders, 409 contested handling (mark sold, keep rest, refetch), 422 field vs message handling, DELETE hold on close (not on back), confirmation with reference
- Auth: login/register modals (475px), blur green/red validation, avatar upload preview (jpg/png/webp), uniqueness errors, pending-action replay, 401 replay
- Profile: tabs Personal Information / My Tickets + Upcoming/Past subtabs with counts, fullName 3-50 / mobile 5XXXXXXXX / dob 12+ / preferred venue, email read-only, Save disabled until dirty, yellow/green dot + banners, wide order cards (ORDER #ref, DATE/VENUE/FORMAT, SEATS badges, Total paid, Refund with 2h isRefundable gate + confirm + server re-render)
- Global: dim/blur overlay, Esc/overlay/X close, buttons disabled in-flight, server truth after mutation, money as plain lari numbers

## Deploy
Static host `index.html/css/js`:
- Vercel: `vercel --prod` (vercel.json included)
- Netlify: drag folder or `netlify deploy --prod` (netlify.toml included)
- GitHub Pages: push, Settings → Pages → /(root)

## Commits / video
Make 8+ commits (scaffold, styles, auth, home, sessions, movie, booking, profile, polish). Record Loom walkthrough (optional but graded).
Deadline per PDF8: Oct 11 23:59:59. Test at 1920x1080.
