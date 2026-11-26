// Criterion Admin Portal - API Client

export async function adminFetch(endpoint, options = {}) {
  const defaultHeaders = {
    'Accept': 'application/json',
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  options.headers = {
    ...defaultHeaders,
    ...options.headers,
  };

  options.credentials = 'same-origin';

  try {
    const response = await fetch(endpoint, options);

    if (response.status === 401) {
      // Unauthenticated: Redirect to login if not already on login page
      if (!window.location.pathname.endsWith('/admin/login.html')) {
        window.location.href = '/admin/login.html?expired=1';
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    throw err;
  }
}
