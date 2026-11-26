// Criterion Admin Portal - Dashboard Metrics Controller

import { adminFetch } from './admin-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const stats = await adminFetch('/api/admin/stats');
    if (!stats) return;

    const elEnquiriesTotal = document.getElementById('statEnquiriesTotal');
    const elEnquiriesNew = document.getElementById('statEnquiriesNew');
    const elArticlesTotal = document.getElementById('statArticlesTotal');
    const elResourcesTotal = document.getElementById('statResourcesTotal');
    const elStaffTotal = document.getElementById('statStaffTotal');

    if (elEnquiriesTotal) elEnquiriesTotal.textContent = stats.enquiries?.total ?? 0;
    if (elEnquiriesNew) elEnquiriesNew.textContent = `${stats.enquiries?.new ?? 0} new`;
    if (elArticlesTotal) elArticlesTotal.textContent = stats.articles?.total ?? 0;
    if (elResourcesTotal) elResourcesTotal.textContent = stats.resources?.total ?? 0;
    if (elStaffTotal) elStaffTotal.textContent = stats.staff?.activeTotal ?? 0;
  } catch (err) {
    console.error('Error fetching dashboard statistics:', err);
  }
});
