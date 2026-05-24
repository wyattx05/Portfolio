# Website & CMS Improvement Plan

This document is a step-by-step, prioritized plan to improve the Portfolio website and lightweight CMS. Each section includes goals, rationale, concrete actions, and suggested commands or snippets.

**How to use this plan**
- Follow steps in order for security and data-safety first.
- Each step is actionable; many include suggested code changes or libraries to add.
- Use the included todo checklist in the project to track progress.

---

## 1. Quick Audit (Done)
- Goal: Gather baseline and identify immediate blockers.
- Files reviewed: `content-manager.js`, `cms/server.js`, `cms/admin/index.html`, `cms/admin/admin.js`, `script.js`, `data/content.json`.
- Notes:
  - No authentication on admin/API.
  - Server writes `data/content.json` directly and creates many backups.
  - Admin UI posts JSON directly with minimal server-side validation.
  - Client-side rendering injects HTML in some places; sanitize before output.

---

## 2. Add Authentication (High Priority)
Goal: Restrict admin UI and API endpoints to authorized users.
Why: Prevent unauthorized content changes.

Options (choose one):
- HTTP Basic Auth (quick, suitable for local or small deployments).
- JSON Web Tokens (JWT) with login endpoint (better for modern apps).
- OAuth or third-party (GitHub) for public deployments.

Suggested quick implementation (Basic Auth):
- Add `express-basic-auth` or custom middleware that checks `Authorization` header against `ADMIN_USER` and `ADMIN_PASS` environment variables.
- Protect `POST /api/content`, `POST /api/theme`, `/api/restore/*`, `/api/backups/*`, and the admin static folder.

Commands:
```bash
npm install express-basic-auth
# or, for custom JWT flow, install jsonwebtoken bcrypt
npm install jsonwebtoken bcrypt
```

---

## 3. Validate incoming JSON with JSON Schema (High Priority)
Goal: Prevent malformed or malicious content from being saved.
Why: Maintain data integrity, make future migrations easier.

Action items:
- Add `ajv` to the server and create `schemas/content.schema.json` describing expected content structure.
- Validate `req.body` in `POST /api/content` and `POST /api/theme` before creating backups or writing files.

Commands:
```bash
npm install ajv ajv-formats
```

---

## 4. Sanitize Stored HTML / Prevent XSS (High Priority)
Goal: Prevent stored XSS via blog content or other HTML fields.
Why: Stored XSS is a major security risk for visitors and admins.

Action items:
- Use `sanitize-html` or `dompurify` server-side to sanitize `post.content` and any HTML fields before saving.
- Optionally, store raw markdown and render to safe HTML server-side (recommended for blog posts).

Commands:
```bash
npm install sanitize-html
```

Snippet (server-side sanitize):
```js
const sanitizeHtml = require('sanitize-html');
const safe = sanitizeHtml(req.body.content, { allowedTags: [/*...*/], allowedAttributes: {/*...*/} });
```

---

## 5. Hardening: Headers, CORS, CSRF (High Priority)
Goal: Improve HTTP security headers and restrict cross-origin usage.

Action items:
- Add `helmet` middleware and configure a CSP.
- Limit CORS to trusted origins via `cors({ origin: process.env.ALLOWED_ORIGINS })`.
- For cookie or session flows, add CSRF protection (e.g., `csurf`).

Commands:
```bash
npm install helmet csurf
```

---

## 6. Atomic Writes, Locking & Backup Rotation (High Priority)
Goal: Prevent file corruption and control backup growth.

Action items:
- Implement atomic write: write to temp file and rename to `content.json`.
- Add a write lock or queue writes so concurrent saves are serialized.
- Implement backup rotation: keep last N backups (configurable via env var), delete older ones.

Snippet (atomic write):
```js
const tmpFile = CONTENT_FILE + '.tmp';
await fs.writeFile(tmpFile, newContent);
await fs.rename(tmpFile, CONTENT_FILE);
```

---

## 7. Logging, Monitoring & Error Handling
Goal: Improve observability and make debugging easier.

Action items:
- Add structured logging (winston or pino).
- Add request logging (morgan) for HTTP access logs.
- Improve error responses with consistent shape and avoid leaking stack traces in production.

Commands:
```bash
npm install pino morgan
```

---

## 8. Modularize Server Code & Tests
Goal: Improve maintainability and enable unit testing.

Action items:
- Split `cms/server.js` into modules: `api/content.js`, `api/backups.js`, `lib/theme.js`, `lib/file-utils.js`.
- Add unit tests for key functions (theme generation, backup rotation, sanitize/validation).
- Add ESLint and Prettier.

Commands:
```bash
npm install --save-dev jest eslint prettier
```

---

## 9. Add Docker & CI (Medium Priority)
Goal: Easier deployment and reproducible environments.

Action items:
- Create `Dockerfile` and `docker-compose.yml` for local testing.
- Add GitHub Actions workflow to run lint + tests on PR.

Example `Dockerfile` snippet:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "cms/server.js"]
```

---

## 10. Admin UI & UX Improvements (Medium Priority)
Goal: Improve accessibility, save-UX, and maintainability.

Action items:
- Move large HTML templates in `cms/admin/admin.js` into small render helpers or use client templates.
- Add unsaved changes warning, optimistic UI updates, and progress indicators for saving.
- Improve a11y: focus traps in modals, ARIA attributes, keyboard navigation.
- Add role-based UI (viewer/editor) once auth is in place.

---

## 11. Code Cleanup, Admin Panel Bugfixes, and Frontend Performance (Requested)
Goal: Organize and clean the codebase, fix functional/admin UI bugs, and make the public site faster and more maintainable.

Why: A clean codebase reduces future technical debt, makes debugging easier, and improves load times and user experience.

Action items (break down and prioritize):

- Code organization and cleanup
  - Create a logical project layout: `cms/` (server and admin UI), `assets/`, `data/`, `lib/` for shared utilities, and `scripts/` for build/run helpers.
  - Move reusable utilities into `cms/lib/` (file I/O, backups, theme generation, validation helpers).
  - Add an `index.js` that composes and starts the server using imported modules.
  - Remove large inline HTML templates from `cms/admin/admin.js` and replace with small render helper functions or template files.

- Fix admin panel bugs (prioritized)
  - Reproduce and log admin bugs: missing element IDs, modal close edge cases, missing null-checks, and broken event bindings.
  - Add defensive checks in `cms/admin/admin.js` when accessing DOM elements and when reading `this.content` properties.
  - Add unit tests for content sanitization and for form data normalization (`sanitizeContentForSave`).
  - Add integration test (simple script or Playwright) to validate save/restore and backups flows.

- Frontend performance improvements
  - Audit and optimize images in `assets/images/` (resize, compress, serve WebP where possible).
  - Add `loading="lazy"` to image elements (already used in some places — standardize it across the site).
  - Minify and bundle static assets for production (use esbuild/rollup/webpack for JS and PostCSS/ cssnano for CSS).
  - Use cache-busting hashed filenames for CSS and JS in production and configure server headers for long-term caching for those assets.
  - Reduce DOM size and unnecessary reflows: minimize heavy DOM operations in `content-manager.js` and use DocumentFragment when building lists.

Quick actionable checklist for this step:

- Create `cms/lib/file-utils.js` and move atomic write and backup rotation logic there.
- Refactor `cms/server.js` to import `cms/lib/*` modules and reduce the file size.
- Replace large admin template strings with `cms/admin/templates/` partials or helper functions.
- Add a lightweight build step (esbuild) that produces `dist/` with hashed assets for production.

Estimated effort: 2-5 days (depending on scope and test coverage).

---

## 11. File Uploads (Images, PDFs) (Optional)
Goal: Allow secure uploads and avoid embedding large files in JSON.

Action items:
- Add secure upload endpoint (`/api/uploads`) with `multer` limiting file types/sizes.
- Store uploads outside of webroot (or use cloud storage with signed URLs).
- Replace inline base64 images with file references in `content.json`.

Commands:
```bash
npm install multer
```

---

## 12. Revamp Recent Updates and Blog Modules
Goal: Improve how the site presents updates and blog content so the homepage stays focused while deeper content is still easy to browse.

What you want:
- On the main page, show only the 3 most recent updates.
- On the main page, show only the 2 most recent blog posts.
- Add a button at the bottom of the Recent Updates section that opens a full updates view.
- The full updates view should present all updates in a timeline format, ordered in a new, more readable sequence.
- Add a button that says "Show All Posts" in the blog section.
- That button should navigate to a dedicated blog page that showcases all blog posts.

Action items:
- Update the data rendering logic in `content-manager.js` so the homepage slices updates and blog posts before rendering.
- Add sorting rules for both modules so the newest entries are always shown first on the homepage.
- Create a new updates page or timeline view that uses the same content source but displays the full update history in timeline order.
- Create a new blog index page that lists every published post with filters or pagination if needed.
- Add call-to-action buttons in the homepage sections that link to the full updates view and blog index page.
- Make the new pages consistent with the existing theme and mobile layout.
- Ensure the full updates and blog pages are fast to load and do not duplicate rendering logic.

Suggested implementation steps:
1. Update the homepage renderer to limit visible items to the most recent entries.
2. Add routes or static pages for `/updates` and `/blog` if the site structure supports separate pages.
3. Reuse shared card/timeline components so the homepage and full pages stay consistent.
4. Add a clear "Show All Updates" button and a "Show All Posts" button with obvious placement.
5. Verify that empty states still render cleanly when there are fewer than 3 updates or 2 posts.

Notes:
- If the site stays single-page, the "new pages" can be modal or anchored sections, but dedicated pages are preferred for the blog archive.
- The timeline should be visually distinct from the homepage preview so users can scan the full history quickly.

---

## 12. Performance & Caching (Low-Medium)
Goal: Improve load times for public site.

Action items:
- For production builds, use hashed asset filenames and enable long-term caching on static assets.
- Keep API endpoints `no-cache` but enable caching for images, CSS, JS.
- Consider pre-building a static site from `content.json` for CDN delivery.

---

## 13. Tests, Lint & CI (Medium Priority)
Goal: Prevent regressions and improve code quality.

Action items:
- Add unit tests for server modules and sanitize/validate logic.
- Add E2E test for admin save/restore flow (Playwright or Cypress).
- Setup GitHub Actions to run lint + tests.

---

## 14. Deliverables & Timeline (Suggested)
- Week 1: Add authentication, JSON validation, basic sanitization, and atomic writes.
- Week 2: Add backup rotation, logging, modularize server, and tests for core functions.
- Week 3: Harden headers/CORS/CSRF, add Docker, CI, and improve admin UX.
- Week 4+: File uploads, prebuild static site, performance tuning, broader test coverage.

---

## 15. Quick command references
- Start CMS locally:
```bash
cd cms
npm install
node server.js
```

- Run tests (after adding Jest):
```bash
npm test
```

---

## 16. Related files
- Server: `cms/server.js`
- Admin UI: `cms/admin/index.html`, `cms/admin/admin.js`
- Client renderer: `content-manager.js`
- Frontend script: `script.js`
- Content: `data/content.json` and backups in `data/backups/`

---

If you'd like, I can start by implementing one of the high-priority items (suggested: Basic Auth + JSON schema validation + atomic write). Tell me which one to implement first and I'll create a focused patch and tests.
