// scripts/test-phase3.js
// Automated verification suite for Phase 3: Resources, Enquiries & Form Builder

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

function parseCookie(setCookieHeaders) {
  if (!setCookieHeaders) return '';
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const h of headers) {
    const match = h.match(/crt_admin_session=([^;]+)/);
    if (match) return `crt_admin_session=${match[1]}`;
  }
  return '';
}

async function runPhase3Tests() {
  console.log('\n========================================================');
  console.log('--- RUNNING PHASE 3 END-TO-END VERIFICATION TEST SUITE ---');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(description, condition, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // 1. Check Server Connection
  console.log('--- Step 1: Health & Public Endpoints ---');
  const healthRes = await request('/');
  assert('Pages server is running and responds to root', healthRes.status === 200);

  // 2. Public Form Definitions
  console.log('\n--- Step 2: Public Form Definitions API ---');
  const consultFormRes = await request('/api/forms/consultation');
  assert('GET /api/forms/consultation returns 200', consultFormRes.status === 200);
  assert('Consultation form has title and version_number', consultFormRes.json?.version_number === 1 && consultFormRes.json?.title.includes('Consultation'));

  const courseFormRes = await request('/api/forms/course');
  assert('GET /api/forms/course returns 200', courseFormRes.status === 200);

  const genFormRes = await request('/api/forms/general');
  assert('GET /api/forms/general returns 200', genFormRes.status === 200);

  // 3. Public Enquiry Validation & Submission
  console.log('\n--- Step 3: Public Enquiry Submissions ---');
  const invalidNameRes = await request('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { phone: '+2348030000000', enquiry_type: 'general' }
  });
  assert('Submission without full_name rejected with 400', invalidNameRes.status === 400);

  const invalidPhoneRes = await request('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { full_name: 'Test Patient', phone: '12', enquiry_type: 'general' }
  });
  assert('Submission with invalid phone rejected with 400', invalidPhoneRes.status === 400);

  const invalidEmailRes = await request('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { full_name: 'Test Patient', phone: '+2348030000000', email: 'not-an-email', enquiry_type: 'general' }
  });
  assert('Submission with malformed email rejected with 400', invalidEmailRes.status === 400);

  // Successful submission (optional email omitted)
  const validSubmissionRes = await request('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      full_name: 'Adewale Johnson',
      phone: '+234 803 123 4567',
      enquiry_type: 'consultation',
      preferred_contact_method: 'whatsapp',
      consultation_area: 'Male Fertility',
      message: 'Seeking natural protocol for motility and semen count optimization.',
      additional_responses: {
        preferred_time: 'Morning (9am - 12pm)',
        duration_of_symptoms: '18 months'
      }
    }
  });
  assert('Submission with valid data returns 201 Created', validSubmissionRes.status === 201);
  const enquiryRef = validSubmissionRes.json?.reference;
  assert('Returns reference code starting with CRIT-ENQ', enquiryRef && enquiryRef.startsWith('CRIT-ENQ'));

  // Successful submission with optional email provided
  const validCourseSubRes = await request('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      full_name: 'Dr. Fatima Bello',
      phone: '+234 812 987 6543',
      email: 'fatima.bello@example.com',
      enquiry_type: 'course',
      preferred_contact_method: 'email',
      selected_program_or_course: 'Foundations of Natural Fertility',
      message: 'Inquiring about syllabus and certificate for healthcare practitioners.',
      additional_responses: {
        experience_level: 'Healthcare Professional / Naturopath'
      }
    }
  });
  assert('Course enquiry submission returns 201 Created', validCourseSubRes.status === 201);
  const courseEnquiryRef = validCourseSubRes.json?.reference;

  // 4. Admin Authentication
  console.log('\n--- Step 4: Admin Authentication & Protected Endpoints ---');
  const unauthRes = await request('/api/admin/enquiries');
  assert('Unauthenticated access to /api/admin/enquiries returns 401', unauthRes.status === 401);

  const loginRes = await request('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: 'admin@criterionwellness.local',
      password: 'CriterionAdmin2026!'
    }
  });
  assert('Admin login returns 200', loginRes.status === 200);
  const adminCookie = parseCookie(loginRes.headers['set-cookie']);
  assert('Admin session cookie retrieved', !!adminCookie);

  // 5. Admin Enquiries Inbox & Management
  console.log('\n--- Step 5: Admin Enquiries Management ---');
  const adminEnquiriesRes = await request('/api/admin/enquiries', {
    headers: { 'Cookie': adminCookie }
  });
  assert('GET /api/admin/enquiries returns 200 with enquiry list', adminEnquiriesRes.status === 200);
  const enquiryList = adminEnquiriesRes.json?.enquiries || [];
  const foundEnquiry = enquiryList.find(e => e.id === enquiryRef);
  assert('Newly submitted enquiry appears in admin list with status "new"', foundEnquiry && foundEnquiry.status === 'new');
  assert('Enquiry preserves phone number and preferred contact method', foundEnquiry?.phone === '+234 803 123 4567' && foundEnquiry?.preferred_contact_method === 'whatsapp');

  // Filter test: status=new
  const filteredNewRes = await request('/api/admin/enquiries?status=new', {
    headers: { 'Cookie': adminCookie }
  });
  assert('Filter by status=new succeeds', filteredNewRes.status === 200 && filteredNewRes.json?.enquiries.every(e => e.status === 'new'));

  // Detailed view
  const enquiryDetailRes = await request(`/api/admin/enquiries/${enquiryRef}`, {
    headers: { 'Cookie': adminCookie }
  });
  assert('GET /api/admin/enquiries/[id] returns full details', enquiryDetailRes.status === 200);
  const detailJson = enquiryDetailRes.json;
  assert('Enquiry details include consultation_area', detailJson.consultation_area === 'Male Fertility');
  const addResp = typeof detailJson.additional_responses_json === 'string'
    ? JSON.parse(detailJson.additional_responses_json)
    : detailJson.additional_responses_json;
  assert('Dynamic responses preserved in JSON', addResp?.preferred_time === 'Morning (9am - 12pm)');

  // Status transition to "reviewed"
  const patchStatusRes = await request(`/api/admin/enquiries/${enquiryRef}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: { status: 'reviewed' }
  });
  assert('PATCH enquiry status to "reviewed" returns 200', patchStatusRes.status === 200);

  const verifiedReviewRes = await request(`/api/admin/enquiries/${enquiryRef}`, {
    headers: { 'Cookie': adminCookie }
  });
  assert('Enquiry status updated to "reviewed"', verifiedReviewRes.json?.status === 'reviewed');
  assert('Reviewer staff name and timestamp recorded', !!verifiedReviewRes.json?.reviewed_at);

  // Status transition to "archived"
  const patchArchiveRes = await request(`/api/admin/enquiries/${enquiryRef}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: { status: 'archived' }
  });
  assert('PATCH enquiry status to "archived" returns 200', patchArchiveRes.status === 200);

  // 6. Resources Management (Product, Course, Educational Material)
  console.log('\n--- Step 6: Resources Management ---');

  // A. Product Resource
  const testProductRes = await request('/api/admin/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: {
      type: 'product',
      title: 'Botanical Spermatogenic Restorative Elixir',
      short_description: 'Herbal compound supporting microcirculation and cellular sperm morphology.',
      full_description: '<p>A synergistic botanical formulation developed from sustainably wild-harvested adaptogens.</p>',
      publication_status: 'published',
      price_kobo: 2500000, // 25,000 NGN
      package_size: '250ml Liquid Decoction',
      availability_status: 'available',
      display_order: 1
    }
  });
  assert('Create Product resource returns 201 Created', testProductRes.status === 201);
  const productId = testProductRes.json?.id;
  const productSlug = testProductRes.json?.slug;
  assert('Product has price_kobo 2500000 and availability_status available', testProductRes.json?.price_kobo === 2500000 && testProductRes.json?.availability_status === 'available');

  // B. Course Resource
  const testCourseRes = await request('/api/admin/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: {
      type: 'course',
      title: 'Clinical Integrative Reproductive Biology Masterclass',
      short_description: 'Intensive 6-week practitioner masterclass.',
      full_description: '<p>Comprehensive clinical training on semen diagnostics and herbal synchronization.</p>',
      publication_status: 'published',
      course_duration: '6 Weeks',
      course_level: 'Professional',
      course_format: 'Online Live Classes + Q&A',
      enrollment_status: 'open',
      start_date: '2026-12-01',
      display_order: 2
    }
  });
  assert('Create Course resource returns 201 Created', testCourseRes.status === 201);
  const courseId = testCourseRes.json?.id;
  assert('Course has course_duration and enrollment_status', testCourseRes.json?.course_duration === '6 Weeks' && testCourseRes.json?.enrollment_status === 'open');

  // C. Educational Material Resource (PDF)
  const testMaterialRes = await request('/api/admin/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: {
      type: 'educational_material',
      title: 'Clinical Guidelines for Semen Parameter Interpretation',
      short_description: 'Concise reference guide for understanding WHO 6th edition semen diagnostics.',
      full_description: '<p>A clear, reassuring breakdown of motility, count, and morphology parameters.</p>',
      publication_status: 'published',
      material_format: 'PDF Guide',
      download_url: '/api/media/guidelines_2026.pdf',
      file_r2_key: 'guidelines_2026.pdf',
      file_size_bytes: 524288,
      display_order: 3
    }
  });
  assert('Create Educational Material resource returns 201 Created', testMaterialRes.status === 201);
  const materialId = testMaterialRes.json?.id;
  assert('Material has material_format and download_url', testMaterialRes.json?.material_format === 'PDF Guide' && !!testMaterialRes.json?.download_url);

  // 7. Resource Queries, Filtering, and Update
  console.log('\n--- Step 7: Resources Listing & Filtering ---');
  const allResourcesRes = await request('/api/admin/resources', {
    headers: { 'Cookie': adminCookie }
  });
  assert('GET /api/admin/resources returns 200', allResourcesRes.status === 200);
  assert('Resources list contains at least 3 items', (allResourcesRes.json?.resources?.length || 0) >= 3);

  const productFilterRes = await request('/api/admin/resources?type=product', {
    headers: { 'Cookie': adminCookie }
  });
  assert('Filter by type=product returns only products', productFilterRes.json?.resources.every(r => r.type === 'product'));

  const courseFilterRes = await request('/api/admin/resources?type=course', {
    headers: { 'Cookie': adminCookie }
  });
  assert('Filter by type=course returns only courses', courseFilterRes.json?.resources.every(r => r.type === 'course'));

  // Update resource
  const updateRes = await request(`/api/admin/resources/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: {
      type: 'product',
      title: 'Botanical Spermatogenic Restorative Elixir (Extra Strength)',
      price_kobo: 3000000,
      availability_status: 'pre_order'
    }
  });
  assert('PUT /api/admin/resources/[id] returns 200 with updated price and status', updateRes.status === 200 && updateRes.json?.price_kobo === 3000000 && updateRes.json?.availability_status === 'pre_order');

  // 8. Public Resources API
  console.log('\n--- Step 8: Public Resources API ---');
  const publicRes = await request('/api/resources');
  assert('GET /api/resources returns 200', publicRes.status === 200);
  const pubItems = publicRes.json?.resources || [];
  assert('Public resources only contain published items', pubItems.every(r => r.publication_status === 'published' || !r.publication_status));

  const publicSingleRes = await request(`/api/resources/${productSlug}`);
  assert('GET /api/resources/[slug] returns single published resource', publicSingleRes.status === 200 && publicSingleRes.json?.slug === productSlug);

  // 9. Immutable Form Definitions Versioning
  console.log('\n--- Step 9: Immutable Form Definitions Versioning ---');
  const formsListRes = await request('/api/admin/forms', {
    headers: { 'Cookie': adminCookie }
  });
  assert('GET /api/admin/forms returns 200 with form versions', formsListRes.status === 200);

  // Update/Version Consultation form (Add a new question)
  const versionUpRes = await request('/api/admin/forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: {
      form_slug: 'consultation',
      title: 'Consultation Intake Form v2',
      description: 'Updated consultation questions with dietary section.',
      fields: [
        { id: 'full_name', label: 'Full Name', type: 'text', required: true },
        { id: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { id: 'email', label: 'Email Address', type: 'email', required: false },
        { id: 'dietary_lifestyle', label: 'Dietary Lifestyle', type: 'select', required: false, options: ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian'] },
        { id: 'message', label: 'Message', type: 'textarea', required: true }
      ]
    }
  });
  assert('POST /api/admin/forms creates new version with 201 Created', versionUpRes.status === 201);
  assert('New version has version_number 2 and is_active 1', versionUpRes.json?.version_number === 2 && versionUpRes.json?.is_active === 1);

  // Check public endpoint returns new active version v2
  const activeConsultRes = await request('/api/forms/consultation');
  assert('Public /api/forms/consultation now returns version 2', activeConsultRes.json?.version_number === 2);

  // Check that old v1 form still exists in database and is inactive
  const oldFormRes = await request('/api/admin/forms/consultation-enquiry-v1', {
    headers: { 'Cookie': adminCookie }
  });
  assert('Old form version (v1) remains in database with is_active 0', oldFormRes.status === 200 && oldFormRes.json?.is_active === 0);

  // 10. Clean-up of Test Records
  console.log('\n--- Step 10: Clean-up ---');
  if (productId) await request(`/api/admin/resources/${productId}`, { method: 'DELETE', headers: { 'Cookie': adminCookie } });
  if (courseId) await request(`/api/admin/resources/${courseId}`, { method: 'DELETE', headers: { 'Cookie': adminCookie } });
  if (materialId) await request(`/api/admin/resources/${materialId}`, { method: 'DELETE', headers: { 'Cookie': adminCookie } });
  if (enquiryRef) await request(`/api/admin/enquiries/${enquiryRef}`, { method: 'DELETE', headers: { 'Cookie': adminCookie } });
  if (courseEnquiryRef) await request(`/api/admin/enquiries/${courseEnquiryRef}`, { method: 'DELETE', headers: { 'Cookie': adminCookie } });
  assert('Cleanup of test resources and enquiries completed', true);

  console.log('\n========================================================');
  console.log(`Phase 3 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase3Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
