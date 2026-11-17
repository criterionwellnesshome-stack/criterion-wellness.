# 06. systeme.io Raw HTML notes
Researched 17 Nov 2026 via web search (systeme.io's help centre and tools). **Items marked ✅ are from systeme.io's own pages, ⚠ are third-party or not found: verify in your own editor before relying on them.**

## Tags and format
- ✅ Do **not** include `<html>`, `<head>`, `<body>` or `<footer>` in Raw HTML / header / footer / tracking code. ([systeme.io help: Is it possible to insert HTML, CSS or JS code?](https://help.systeme.io/article/306-is-it-possible-to-insert-html-css-or-js-code))
- ⚠ systeme.io's free Raw HTML converter tool lists `<html>`, `<head>`, `<body>`, `<meta>`, `<title>` and `<link>` as rejected. ([tool](https://systeme.io/free-tools/raw-html-converter/)) The help article does not list meta/title/link, so we treat them as forbidden to be safe. **Our paste blocks contain none of them.**
- Fonts: load with `@import` inside `<style>` (not `<link>`). The paste block does this. (Fallback fonts are set, so the page still reads if the import is blocked.)
- Every class is prefixed `lp-`, and all CSS is scoped under `.lp-root` so it can't collide with systeme.io styles.

## Page types
- ✅ The Raw HTML element is **not available on Info pages**. Use a **Sales page** (or Opt-in page) in a funnel.

## Preview and JavaScript
- ✅ Raw HTML is **not shown in the editor Preview**. It only shows on the live/published page, so test with the published (or shared preview) URL and save first.
- ⚠ A third-party guide shows `<script>` working inside a Raw HTML block, but systeme.io's docs don't confirm this officially. **Our page works without JavaScript** for reading and ordering. JS only (a) sets the WhatsApp links from one config line, (b) opens the FAQ nicely, (c) shows the thank-you panel in the mock. If scripts are blocked, the WhatsApp links fall back to the form anchor.
- ⚠ Size limit: **none found in the documentation.** The paste block is ~40 KB. If systeme.io rejects it, split at the markers `<!-- SPLIT HERE -->` into 2 to 3 Raw HTML elements (CSS stays in the first).

## How should orders be captured? (comparison)
| Option | Tracking | Deliverability / reliability | Maintenance |
|---|---|---|---|
| **(a) systeme.io native form** placed between Raw HTML blocks | Best: contacts land in systeme.io, can fire the Pixel "Lead" on the thank-you page, can trigger an email/automation/tag | Best: systeme.io stores the contact, sends the confirmation | Easy for a non-developer. Styling is systeme's, and the package choice needs a hidden field or tag per button |
| (b) custom HTML form posting to a webhook / Google Sheet | Pixel event only through our JS; no automatic contact record | Fragile (CORS, spam, script blocks, no retry) | Needs a developer |
| (c) WhatsApp click-to-chat | Click event only. No lead record unless a person types it in | Depends on the customer pressing send. Good for this audience (research: "DM us") | Easiest to build, but manual to track |

**Recommendation: (a) as the main order path, with (c) as a secondary "Chat on WhatsApp" option.** The mock page in `landing-page.html` shows a form that looks like the final one but only displays a thank-you message (nothing is sent). For go-live, replace the `lp-form` block with systeme's native form, as the setup guide describes.

## Pixel
- ✅ Put the Meta Pixel in the page **Settings → "Edit header code"** (tracking section) of the funnel page, or the funnel settings, not inside Raw HTML. ([systeme.io help: How to add Facebook Pixel and setup events](https://help.systeme.io/article/1632-how-to-add-facebook-pixel-and-setup-events)) For event deduplication systeme.io offers the `{{FACEBOOK_EVENT_ID}}` placeholder (CAPI).
- No Pixel ID yet (per your answer). The HTML has a comment where the Lead/Purchase event would fire.
