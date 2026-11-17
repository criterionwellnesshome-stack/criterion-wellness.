# 07. systeme.io setup guide (for a non-developer)
Files: `work/build/landing-page.html` (open in a browser to preview) and `work/build/systeme-paste/landing-page-paste.html` (the block to paste). Images are in `work/build/images/`. See `06-systeme-notes.md` for the research behind these steps.

## Before you start
1. Open `landing-page.html` in Chrome on your phone or laptop and check the look. It is a **mock**: yellow **[BRACKETS]**, "MOCK" tags and a yellow test bar are on purpose.
2. Items to replace before going live are listed at the end.

## A. Create the page
1. In systeme.io go to **Funnels → Create funnel**, choose **Sales funnel** (or "Build from scratch"). **Do not use an "Info" page type. Raw HTML is not available there.**
2. Open the first step (Sales page) and click **Edit**. Use a blank/empty page template.
3. Set the page to a clean full-width layout and remove any default header/footer sections, so that only our block shows.

## B. Upload the images
1. In the editor open **Media** (or an Image element) and upload the 2 files: `pack-front.webp` and `pack-back.webp`. (`pack-both.webp` and `pack-mockup.jpg` are spares.)
2. Copy each image's URL from systeme.io's media library.

## C. Add the Raw HTML element
1. Add a section, then add a **Raw HTML** element.
2. Open `systeme-paste/landing-page-paste.html`, copy **everything**, and paste it into the Raw HTML box. **Save.**
3. In the pasted code, search for `images/pack-front.webp` and `images/pack-back.webp` and replace each with the media URL you copied. (Each image has an `<!-- IMAGE: ... -->` comment above it.)
4. **If systeme.io says the block is too big or shows an error**, tell me and I will split it into 2 to 3 blocks. No size limit is documented, and this block is ~29 KB.

## D. Change the WhatsApp number (one place only)
Near the bottom of the pasted code, find:
```
var LP_WHATSAPP = "2348000000000";
```
Replace the digits with the real number (country code, **no +, no spaces**), e.g. `2348164553746`. All WhatsApp buttons update. Also edit `LP_WA_TEXT` if you want a different opening message.

## E. The order form (recommended: use systeme.io's own form)
The form in the pasted block is a **mock**: it only shows a thank-you message and sends nothing. For real orders:
1. Below the Raw HTML element (or in place of the `lp-form` section), add a systeme.io **Form** element with fields: Full name, Phone, State, Address. (Add a hidden field or tag for the package chosen.)
2. In the form settings choose a **thank-you page** (a second funnel step) and, if you want, a tag/automation to email or notify your team.
3. To remove the mock form: in the pasted code delete everything from `<form class="lp-form"` down to its closing `</form>`, keep the heading above it. Keep the `id="lp-order"` section so the buttons still scroll to it.
4. (Alternative: if you prefer WhatsApp orders only, keep the WhatsApp buttons and drop the form.)

## F. Meta Pixel (later, when you run ads)
1. Do **not** paste the Pixel into the Raw HTML block.
2. In the page editor click **Settings** (left side) → find **Edit header code** (tracking section) → paste the Pixel base code → Save. You can also put it in the funnel's settings.
3. Fire the **Lead** (or Purchase) event on the **thank-you page**, or on form submit. The page has a `PIXEL:` comment where the event would go for the mock form.
4. Check with the Meta Pixel Helper extension.

## G. Test and publish
1. **Save**. Raw HTML does **not** show in the editor Preview. Use **Publish**, then open the live link on your phone.
2. Test: all buttons scroll to the form; WhatsApp buttons open WhatsApp; FAQ opens; the sticky bar appears on mobile; no sideways scrolling.
3. If you cannot publish a mock publicly, use a private/unlisted link or the shared preview link.

## H. Before it goes live: must replace
- [ ] **Remove the test mode:** in the pasted code change `class="lp-root lp-test"` to `class="lp-root"`. This hides the yellow bar and the "MOCK" tags.
- [ ] **Mock testimonials** (4, marked `MOCK TESTIMONIAL` in the code): replace with real, consented ones, or delete the section.
- [ ] **WhatsApp number**: replace `+234 800 000 0000`.
- [ ] **NAFDAC No** (hero table, FAQ, footer): `[TO BE ADDED]`.
- [ ] **Ingredients**: `[TO BE ADDED]` (section "What's in the cup" and FAQ). *The pack currently names "Olax subscorpioidea, Gongronema latifolium and other well established herbal formulas", while our research said Dongoyaro and Negro pepper. Resolve which is correct.*
- [ ] **Directions**: confirm "once a day" vs "morning and night" (the pack says both).
- [ ] **Delivery fee, delivery time, pay on delivery, refund policy**: placeholders.
- [ ] **Logo**: add the Criterion Herbaceuticals logo (the repo's logo says "Holistic Wellness Home").
- [ ] **Pack photos**: the pack is an AI-style mock-up. Use real photos.
- [ ] **Product name and label**: see the risks in the QA report (name "Terminator", "Pile Treatment", "improve blood flow and reduce inflammation").
- [ ] Fact-check with a pharmacist, add the Pixel, test the real form.
