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
      // Follow HTTP redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && options.method !== 'POST') {
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
  console.log('Starting Cloudflare Pages local dev with Wrangler...');
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
    if (text.includes('Ready on') || text.includes('error') || text.includes('Error')) {
      process.stdout.write('[Wrangler] ' + text);
    }
  });

  devProcess.stderr.on('data', (d) => {
    process.stderr.write('[Wrangler Err] ' + d.toString());
  });

  console.log(`Waiting for ${BASE_URL} to respond...`);
  const ready = await waitForServer();
  if (!ready) {
    console.error('Server failed to start within timeout');
    devProcess.kill();
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('CRITERION CMS PHASE 1 - AUTOMATED VERIFICATION SUITE');
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
    // 1. Public Site Integrity
    console.log('--- 1. Public Site Integrity ---');
    const resHome = await request('/');
    assert(resHome.status === 200, 'Public Homepage serves HTTP 200', `Status is ${resHome.status}`);
    assert(resHome.body.includes('PEACE.') && resHome.body.includes('VITALITY.'), 'Homepage contains editorial headline');
    assert(!resHome.body.includes('admin.css'), 'Homepage does NOT load admin styles');

    const resNav = await request('/components/nav.html');
    assert(resNav.status === 200, 'Nav component serves HTTP 200');
    assert(resNav.body.includes('criterion-logo-horizontal.png'), 'Nav component contains official logo');

    const resProducts = await request('/products.html');
    assert(resProducts.status === 200, 'Products page serves HTTP 200', `Status is ${resProducts.status}`);

    // 2. Unauthenticated Admin API Protection
    console.log('\n--- 2. Unauthenticated Admin API Protection ---');
    const resStatsNoAuth = await request('/api/admin/stats');
    assert(resStatsNoAuth.status === 401, 'Unauthenticated /api/admin/stats returns 401', `Status is ${resStatsNoAuth.status}`);

    const resStaffNoAuth = await request('/api/admin/staff');
    assert(resStaffNoAuth.status === 401, 'Unauthenticated /api/admin/staff returns 401', `Status is ${resStaffNoAuth.status}`);

    const resLoginHtml = await request('/admin/login.html');
    console.log('resLoginHtml status:', resLoginHtml.status, 'body preview:', resLoginHtml.body?.substring(0, 80));
    assert(resLoginHtml.status === 200, 'Login page /admin/login.html serves HTTP 200', `Status is ${resLoginHtml.status}`);
    assert(resLoginHtml.body.includes('Password Recovery Notice'), 'Login page displays honest recovery notice');

    // 3. Authentication & Invalid Credentials
    console.log('\n--- 3. Authentication & Security ---');
    const resInvalidLogin = await request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@criterionwellness.local', password: 'WrongPassword123!' },
    });
    console.log('resInvalidLogin status:', resInvalidLogin.status, 'body:', resInvalidLogin.body);
    assert(resInvalidLogin.status === 401, 'Invalid password returns 401', `Status is ${resInvalidLogin.status}`);

    // 4. Successful Authentication & Session Issuance
    console.log('\n--- 4. Successful Staff Authentication ---');
    const resValidLogin = await request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@criterionwellness.local', password: 'CriterionAdmin2026!' },
    });
    console.log('resValidLogin status:', resValidLogin.status, 'body:', resValidLogin.body);
    assert(resValidLogin.status === 200, 'Valid credentials return HTTP 200', `Status is ${resValidLogin.status}`);
    assert(resValidLogin.json?.success === true, 'Response body indicates success: true');
    assert(resValidLogin.json?.staff?.role === 'admin', 'Returned staff role is admin');

    const cookieHeader = resValidLogin.headers['set-cookie'];
    assert(Boolean(cookieHeader), 'Server issued Set-Cookie header');
    const sessionCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    const cookieVal = sessionCookie?.split(';')[0];
    assert(cookieVal && cookieVal.startsWith('crt_admin_session='), 'Cookie is crt_admin_session token');

    // 5. Authenticated Protected Endpoints
    console.log('\n--- 5. Authenticated Protected Operations ---');
    const authHeaders = {
      'Cookie': cookieVal,
      'Content-Type': 'application/json',
    };

    const resMe = await request('/api/admin/auth/me', { headers: authHeaders });
    assert(resMe.status === 200, '/api/admin/auth/me returns 200 for active session');
    assert(resMe.json?.staff?.email === 'admin@criterionwellness.local', 'Session profile email matches');

    const resStatsAuth = await request('/api/admin/stats', { headers: authHeaders });
    assert(resStatsAuth.status === 200, '/api/admin/stats returns 200 for active session');
    assert(resStatsAuth.json?.staff?.activeTotal >= 1, 'Stats reports active staff >= 1');

    const resStaffList = await request('/api/admin/staff', { headers: authHeaders });
    assert(resStaffList.status === 200, '/api/admin/staff returns 200 for active session');
    assert(Array.isArray(resStaffList.json?.staff), 'Staff list is an array');

    // 6. Staff Account Provisioning via Admin
    console.log('\n--- 6. Staff Provisioning by Administrator ---');
    const uniqueEmail = `jane.doe.${Date.now()}@criterionwellness.local`;
    const resCreateStaff = await request('/api/admin/staff', {
      method: 'POST',
      headers: authHeaders,
      body: {
        fullName: 'Jane Doe',
        email: uniqueEmail,
        password: 'JaneSecurePassword2026!',
        role: 'content_staff',
      },
    });
    assert(resCreateStaff.status === 201, 'Administrator can create new staff (HTTP 201)', `Status: ${resCreateStaff.status} Body: ${resCreateStaff.body}`);
    assert(resCreateStaff.json?.staff?.role === 'content_staff', 'New staff created with content_staff role');

    // 7. Logout & Session Revocation
    console.log('\n--- 7. Logout & Session Revocation ---');
    const resLogout = await request('/api/admin/auth/logout', {
      method: 'POST',
      headers: authHeaders,
    });
    assert(resLogout.status === 200, 'Logout endpoint returns HTTP 200');

    // Verify session is revoked
    const resMeAfterLogout = await request('/api/admin/auth/me', { headers: authHeaders });
    assert(resMeAfterLogout.status === 401, 'Subsequent request with revoked session returns 401');

    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    devProcess.kill();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
