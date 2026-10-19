# Matomo usage tracking

QUINT uses Matomo's JavaScript tracker (site 38 at
https://stats.humanbrainproject.eu/). SSR is unnecessary. The previous HTML
snippet has been replaced with a single initialization in `src/main.jsx` and
explicit tracking of the screen displayed by `Header`.

Tracking runs only in production builds. Set `VITE_MATOMO_ENABLED=false` at
build time to disable it. No extra Matomo plugins or custom dimensions are needed.
The existing cookie/consent configuration is retained; Do Not Track is respected.

## Page views and time

Projects, WebAlign, WebWarp, WebIlastik, WebNutil, MeshView, Plots, Login and
User agreement have fixed titles and virtual URLs such as `/#/view/nutil`.
Deployment base paths are preserved. These URLs are analytics labels; they do
not change browser navigation or add deep-link support.

The first view is sent after authentication loading finishes. Consecutive
identical screens and repeated effects do not add page views. Failed navigation
does not create a tool page view. Each transition updates the tracked URL, title
and referrer and clears page custom variables. Only the initial view includes
browser page-load performance timings. A 15-second heartbeat improves active
visit duration without adding page views or counting background tabs.

## Events

In Matomo's **Behaviour > Events**, categories group usage as follows:

| Category | Event names | Actions |
| --- | --- | --- |
| Workspace | Project, Image series, Create project | selected; started/succeeded/failed for creation |
| Upload | Images, Segmentations | started/succeeded/failed; value is file count |
| Processing | Generate registration | started/succeeded/failed; counts for start and success |
| Processing | Convert images | started/submitted/failed; submission count |
| Processing | Quantification | started/submitted/succeeded/failed/cancelled |
| Results | Export results, Segmentation backup | started/succeeded/failed |
| Results | Save for plotting | succeeded; value is result count |
| Plots | Load result, Change chart type | started/succeeded/failed for loading; selected for chart changes |
| MeshView | Open result | opened |
| Help | Documentation, Example dataset | opened |
| Navigation | Missing project or image series | blocked |

`submitted` means the service accepted a job, not that processing finished.
Quantification completion/failure is tracked only when observed by the app's
existing polling. Jobs that finish after the tab is closed cannot report their
outcome through this browser. Conversion reports submission, not completion.
Download success means a blob was handed to the browser; it cannot confirm that
the user saved it. A failed download followed by the existing new-tab fallback
reports failure of the direct download, not success of the fallback.

## Data boundaries

Only allowlisted screen names, event names, actions and optional nonnegative
numeric counts are passed to Matomo. No user IDs, email, project/series names,
filenames, search input, error text, task IDs or embedded-tool URLs are supplied.
Tracked page URLs exclude actual query strings and fragments (including OAuth
callbacks), and the initial referrer contains only its origin. Automatic link
tracking is intentionally replaced with explicit help/download events because
application links can contain credentials or private resource paths. Standard
Matomo visitor/device/network metadata still follows the server configuration.

Cross-origin iframes are outside QUINT's observable interactions. Opening their
tabs/results is tracked here. Their internal actions need instrumentation in
each tool, or a coordinated, origin-validated `postMessage` protocol.

## Verify a deployment

1. Build and preview with `npm run build` and `npm run preview`.
2. In browser DevTools, filter Network by `matomo.php`. Finish authentication,
   switch tabs, revisit a previous tab and try a tool with no project selected.
3. Check one page-view request per successful screen change, fixed titles and
   `url` values, and no extra view for a blocked transition or repeated tab click.
4. Upload files, submit processing, load/export results and open documentation.
   Check `e_c` (category), `e_a` (action), `e_n` (name), and `e_v` (count if present).
5. Check that callback tokens, signed URLs and resource names appear nowhere in
   tracking requests. With Do Not Track enabled, requests should be suppressed.
6. Block `matomo.js` and confirm the app still navigates and performs its work.
7. Confirm data arrives in Matomo's visitor log, page reports and event reports.

Local automated tests use a mocked tracker and send no analytics traffic.

References: [Matomo SPA guidance](https://developer.matomo.org/guides/spa-tracking)
and [JavaScript tracker API](https://developer.matomo.org/guides/tracking-javascript).
