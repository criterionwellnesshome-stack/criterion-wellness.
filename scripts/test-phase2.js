import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = 8788;
const BASE_URL = `http://localhost:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(path, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));

    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      // Allow caller to inspect 301 redirects if options.noFollowRedirects is true
      if (!options.noFollowRedirects && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location && options.method !== 'POST') {
        return resolve(request(res.headers.location, options, redirectCount + 1));
      }

      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          json,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await request('/');
      if (res.status === 200) return true;
    } catch {}
    await sleep(1000);
  }
  return false;
}

async function runTests() {
  console.log('Starting Cloudflare Pages dev server with Wrangler...');
  const npxCmd = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const args =
    process.platform === 'win32'
      ? ['/c', 'npx', 'wrangler', 'pages', 'dev', '.', '--port', String(PORT)]
      : ['wrangler', 'pages', 'dev', '.', '--port', String(PORT)];

  const devProcess = spawn(npxCmd, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  devProcess.stdout.on('data', (d) => {
    const text = d.toString();
    if (text.includes('Ready on') || text.includes('Error')) {
      process.stdout.write('[Wrangler] ' + text);
    }
  });

  devProcess.stderr.on('data', (d) => {
    const t = d.toString();
    if (t.includes('Error') || t.includes('Exception')) {
      process.stderr.write('[Wrangler Err] ' + t);
    }
  });

  console.log(`Waiting for ${BASE_URL} to respond...`);
  const ready = await waitForServer();
  if (!ready) {
    console.error('Server failed to start within timeout');
    devProcess.kill();
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('CRITERION CMS PHASE 2 - END-TO-END VERIFICATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${details ? ': ' + details : ''}`);
      failed++;
    }
  }

  try {
    // 1. Staff Authentication
    console.log('--- 1. Staff Authentication ---');
    const loginRes = await request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@criterionwellness.local', password: 'CriterionAdmin2026!' },
    });
    assert(loginRes.status === 200, 'Admin login succeeds (HTTP 200)');
    const cookieHeader = loginRes.headers['set-cookie'];
    const sessionCookie = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)?.split(';')[0];
    assert(Boolean(sessionCookie), 'Received session cookie');

    const authHeaders = {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    };

    // 2. Category Management
    console.log('\n--- 2. Category Management & Seeding ---');
    const catListRes = await request('/api/admin/categories', { headers: authHeaders });
    assert(catListRes.status === 200, 'GET /api/admin/categories returns 200');
    assert(catListRes.json?.categories?.length >= 9, 'Default 9 seed categories present in D1');

    const catName = `Botanical Protocols ${Date.now()}`;
    const newCatRes = await request('/api/admin/categories', {
      method: 'POST',
      headers: authHeaders,
      body: { name: catName },
    });
    assert(newCatRes.status === 201, 'POST /api/admin/categories creates new category', `Status: ${newCatRes.status}`);
    const customCatId = newCatRes.json?.category?.id;

    // 3. Media Upload & Serving
    console.log('\n--- 3. Media Upload & Serving ---');
    const fakeImageBytes = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB]);
    const formData = new FormData();
    const fileBlob = new Blob([fakeImageBytes], { type: 'image/jpeg' });
    formData.append('file', fileBlob, 'test-tincture.jpg');
    formData.append('alt_text', 'Botanical Tincture Bottle');

    const rawUpload = await fetch(`${BASE_URL}/api/admin/media`, {
      method: 'POST',
      headers: { 'Cookie': sessionCookie },
      body: formData,
    });
    const uploadJson = await rawUpload.json().catch(() => null);

    assert(rawUpload.status === 201, 'POST /api/admin/media uploads image to R2 (HTTP 201)', `Status: ${rawUpload.status}, Error: ${uploadJson?.error}`);
    const mediaItem = uploadJson?.media;
    assert(Boolean(mediaItem?.publicUrl), 'Media item has publicUrl');

    // Test Media Serving
    const streamRes = await request(mediaItem.publicUrl);
    assert(streamRes.status === 200, 'GET /api/media/:key streams object from R2 (HTTP 200)');
    assert(streamRes.headers['content-type'] === 'image/jpeg', 'Content-Type header is image/jpeg');
    assert(Boolean(streamRes.headers['cache-control']), 'Cache-Control header is set');

    // 4. Article Creation & HTML Sanitization
    console.log('\n--- 4. Article Creation, Sanitization & Draft State ---');
    const dirtyArticleHtml = '<p>Herbal care supports hormone balance.</p><p><script>alert("xss")</script><a href="javascript:bad()">bad</a><a href="https://example.com" target="_blank">good</a></p>';
    const articleSlug = `herbal-vitality-protocol-${Date.now()}`;

    const createArtRes = await request('/api/admin/articles', {
      method: 'POST',
      headers: authHeaders,
      body: {
        title: 'Herbal Protocols for Endocrine Equilibrium',
        slug: articleSlug,
        summary: 'A detailed naturopathic guide to herbal remedies and cycle balance.',
        content: dirtyArticleHtml,
        category_id: customCatId,
        cover_image_url: mediaItem.publicUrl,
        image_alt_text: 'Herbal Medicine Tincture',
        publication_status: 'draft',
      },
    });
    assert(createArtRes.status === 201, 'Article created as draft (HTTP 201)');
    const createdArtId = createArtRes.json?.article?.id;
    assert(createArtRes.json?.article?.publication_status === 'draft', 'Status is draft');

    // Verify sanitization and reading time
    const getArtRes = await request(`/api/admin/articles/${createdArtId}`, { headers: authHeaders });
    assert(!getArtRes.json?.article?.content.includes('<script>'), 'Server-side sanitizer stripped <script>');
    assert(!getArtRes.json?.article?.content.includes('javascript:bad'), 'Server-side sanitizer stripped javascript: URL');
    assert(getArtRes.json?.article?.reading_time_minutes >= 1, 'Calculated reading time is >= 1 min');

    // Verify draft does NOT appear on public blog
    const publicListDraftCheck = await request('/api/blog/articles');
    const foundInPublic = (publicListDraftCheck.json?.articles || []).some((a) => a.id === createdArtId);
    assert(!foundInPublic, 'Draft article does NOT appear in public blog listings');

    // 5. Article Publication
    console.log('\n--- 5. Article Publishing & SSR Clean URLs ---');
    const publishRes = await request(`/api/admin/articles/${createdArtId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'published' },
    });
    assert(publishRes.status === 200, 'PATCH status to published returns HTTP 200');

    // Public blog listing now contains article
    const publicListPubCheck = await request('/api/blog/articles');
    const foundInPublicPub = (publicListPubCheck.json?.articles || []).some((a) => a.id === createdArtId);
    assert(foundInPublicPub, 'Published article appears in public blog listings');

    // SSR Clean URL test: /blog/:slug
    const ssrRes = await request(`/blog/${articleSlug}`);
    assert(ssrRes.status === 200, 'Clean URL /blog/:slug serves HTTP 200');
    assert(ssrRes.body.includes('Herbal Protocols for Endocrine Equilibrium'), 'SSR pre-rendered article title in HTML');
    assert(ssrRes.body.includes('og:title'), 'SSR injected OpenGraph meta tags');
    assert(ssrRes.body.includes(mediaItem.publicUrl), 'SSR rendered cover image');

    // 6. Slug Modification & 301 Redirect Protection (Safeguards 4 & 5)
    console.log('\n--- 6. Slug Modification & Automatic 301 Redirect ---');
    const newSlug = `herbal-vitality-protocol-updated-${Date.now()}`;
    const updateSlugRes = await request(`/api/admin/articles/${createdArtId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        title: 'Herbal Protocols for Endocrine Equilibrium (Updated)',
        slug: newSlug,
        content: getArtRes.json?.article?.content,
        category_id: customCatId,
        cover_image_url: mediaItem.publicUrl,
        publication_status: 'published',
      },
    });
    assert(updateSlugRes.status === 200, 'Article slug updated successfully');
    assert(updateSlugRes.json?.article?.publication_status === 'published', 'Article remains published after edit');

    // Requesting old slug returns 301 Permanent Redirect
    const redirectRes = await request(`/blog/${articleSlug}`, { noFollowRedirects: true });
    assert(redirectRes.status === 301, 'Visiting old slug returns HTTP 301 Permanent Redirect');
    assert(redirectRes.headers['location'] === `/blog/${newSlug}`, 'Redirect location points to new slug');

    // 7. Media Reference Protection (Safeguard 3)
    console.log('\n--- 7. Media Reference Protection Before Deletion ---');
    const deleteMediaBlockedRes = await request(`/api/admin/media/${mediaItem.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(deleteMediaBlockedRes.status === 409, 'Deleting in-use media is blocked with HTTP 409 Conflict');
    assert(Boolean(deleteMediaBlockedRes.json?.referencingArticles?.length), 'Response identifies referencing articles');

    // 8. Category Deletion & Reassignment (Safeguard 7)
    console.log('\n--- 8. Category Deletion & Article Reassignment ---');
    const deleteCatBlockedRes = await request(`/api/admin/categories/${customCatId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(deleteCatBlockedRes.status === 409, 'Deleting category with assigned articles returns 409');
    assert(deleteCatBlockedRes.json?.requiresReassignment === true, 'Response flags requiresReassignment');

    // Delete with reassignment to cat_female_fertility
    const deleteCatReassignedRes = await request(`/api/admin/categories/${customCatId}?reassign_to=cat_female_fertility`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(deleteCatReassignedRes.status === 200, 'Category deleted after reassigning articles (HTTP 200)', `Status: ${deleteCatReassignedRes.status}, Body: ${deleteCatReassignedRes.body}`);

    // Verify article was transferred to cat_female_fertility
    const articleAfterCatDelete = await request(`/api/admin/articles/${createdArtId}`, { headers: authHeaders });
    assert(articleAfterCatDelete.json?.article?.category_id === 'cat_female_fertility', 'Article category reassigned');

    // 9. Unpublishing
    console.log('\n--- 9. Unpublishing Workflow ---');
    const unpublishRes = await request(`/api/admin/articles/${createdArtId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'unpublished' },
    });
    assert(unpublishRes.status === 200, 'Article unpublished (HTTP 200)');

    const publicListAfterUnpublish = await request('/api/blog/articles');
    const foundAfterUnpub = (publicListAfterUnpublish.json?.articles || []).some((a) => a.id === createdArtId);
    assert(!foundAfterUnpub, 'Unpublished article no longer appears in public blog');

    console.log('\n======================================================');
    console.log(`PHASE 2 TEST SUMMARY: ${passed} passed, ${failed} failed.`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    devProcess.kill();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
