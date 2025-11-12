# Fetch API Patterns

Complete reference for using the Fetch API with proper configuration, error handling, and retry logic.

## Basic Configuration

### Standard GET Request
```javascript
const response = await fetch('/api/endpoint', {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  credentials: 'same-origin', // include, same-origin, omit
  cache: 'default', // default, no-store, reload, no-cache, force-cache
  mode: 'cors', // cors, no-cors, same-origin
  redirect: 'follow' // follow, error, manual
});
```

### POST with JSON Body
```javascript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    key: 'value',
    nested: { data: 'here' }
  })
});
```

### POST with Form Data
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'File description');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
  // Don't set Content-Type header - browser sets it with boundary
});
```

## Timeout Handling

### Using AbortController
```javascript
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// Usage
try {
  const response = await fetchWithTimeout('/api/slow-endpoint', {}, 5000);
  const data = await response.json();
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Request timed out');
  }
}
```

### Manual Cancellation
```javascript
const controller = new AbortController();

// Start request
fetch('/api/data', { signal: controller.signal })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => {
    if (error.name === 'AbortError') {
      console.log('Request was cancelled');
    }
  });

// Cancel from another part of code
cancelButton.addEventListener('click', () => {
  controller.abort();
});
```

## Error Handling

### Comprehensive Error Handler
```javascript
async function fetchWithErrorHandling(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    // Network error (no response from server)
    throw new NetworkError('Cannot connect to server', error);
  }

  // HTTP error (got response but status indicates error)
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    throw new HTTPError(
      response.status,
      response.statusText,
      errorData
    );
  }

  return response;
}

// Usage
try {
  const response = await fetchWithErrorHandling('/api/data');
  const data = await response.json();
  return data;
} catch (error) {
  if (error instanceof NetworkError) {
    showError('Please check your internet connection');
  } else if (error instanceof HTTPError) {
    showError(`Server error: ${error.userMessage}`);
  } else {
    showError('An unexpected error occurred');
  }
}
```

### Response Status Checks
```javascript
async function handleResponse(response) {
  if (response.status === 204) {
    // No content - success with no body
    return null;
  }

  if (response.status === 401) {
    // Unauthorized - redirect to login
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (response.status === 403) {
    // Forbidden - access denied
    throw new Error('Access denied');
  }

  if (response.status === 404) {
    // Not found
    throw new Error('Resource not found');
  }

  if (response.status === 429) {
    // Rate limited
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`Rate limited. Try again in ${retryAfter} seconds`);
  }

  if (response.status >= 500) {
    // Server error
    throw new Error('Server error. Please try again later');
  }

  if (!response.ok) {
    // Other error
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}
```

## Retry Logic

### Exponential Backoff
```javascript
async function fetchWithRetry(url, options = {}, config = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = defaultShouldRetry
  } = config;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      // Check if we should retry this error
      if (!shouldRetry(response.status, attempt)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      if (!shouldRetry(0, attempt)) {
        throw error;
      }
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    console.log(`Retry ${attempt}/${maxRetries} in ${delay}ms...`);

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw lastError;
}

function defaultShouldRetry(statusCode, attempt) {
  // Retry on network errors (statusCode === 0)
  if (statusCode === 0) return true;

  // Don't retry client errors (except 429)
  if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return false;
  }

  // Retry server errors and rate limits
  return true;
}
```

### Conditional Retry
```javascript
async function fetchWithConditionalRetry(url, options = {}) {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // Success
      if (response.ok) {
        return response;
      }

      // Don't retry on client errors
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      // Retry on server errors
      if (i < maxRetries - 1) {
        console.log(`Server error, retrying... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      // Network error - retry
      if (i < maxRetries - 1) {
        console.log(`Network error, retrying... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      throw error;
    }
  }
}
```

## Response Parsing

### Safe JSON Parsing
```javascript
async function parseJSON(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Invalid JSON:', text);
    throw new Error('Invalid JSON response from server');
  }
}

// Usage
const response = await fetch('/api/data');
const data = await parseJSON(response);
```

### Content Type Detection
```javascript
async function parseResponse(response) {
  const contentType = response.headers.get('Content-Type');

  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  if (contentType && contentType.includes('text/')) {
    return await response.text();
  }

  if (contentType && contentType.includes('application/octet-stream')) {
    return await response.blob();
  }

  // Default to text
  return await response.text();
}
```

## Parallel Requests

### Promise.all for Required Requests
```javascript
async function fetchMultiple() {
  try {
    const [lists, metadata, reports] = await Promise.all([
      fetch('/api/lists').then(r => r.json()),
      fetch('/api/metadata').then(r => r.json()),
      fetch('/api/reports').then(r => r.json())
    ]);

    return { lists, metadata, reports };
  } catch (error) {
    // If any request fails, all fail
    console.error('One or more requests failed:', error);
    throw error;
  }
}
```

### Promise.allSettled for Optional Requests
```javascript
async function fetchMultipleOptional() {
  const results = await Promise.allSettled([
    fetch('/api/lists').then(r => r.json()),
    fetch('/api/metadata').then(r => r.json()),
    fetch('/api/reports').then(r => r.json())
  ]);

  const data = {};
  const errors = [];

  results.forEach((result, index) => {
    const endpoints = ['lists', 'metadata', 'reports'];

    if (result.status === 'fulfilled') {
      data[endpoints[index]] = result.value;
    } else {
      errors.push({
        endpoint: endpoints[index],
        error: result.reason
      });
      // Set default/fallback value
      data[endpoints[index]] = null;
    }
  });

  return { data, errors };
}
```

## Progress Tracking (XHR Alternative)

For file uploads or downloads where you need progress tracking:

```javascript
function fetchWithProgress(url, options = {}, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = (e.loaded / e.total) * 100;
        onProgress({ percent, loaded: e.loaded, total: e.total });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Request aborted'));
    });

    xhr.open(options.method || 'GET', url);

    // Set headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    xhr.send(options.body);
  });
}

// Usage
const uploadButton = document.getElementById('upload');
const progressBar = document.getElementById('progress');

uploadButton.addEventListener('click', async () => {
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const result = await fetchWithProgress(
      '/api/upload',
      {
        method: 'POST',
        body: formData
      },
      (progress) => {
        progressBar.style.width = `${progress.percent}%`;
        progressBar.textContent = `${Math.round(progress.percent)}%`;
      }
    );

    console.log('Upload complete:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
});
```

## Best Practices

1. **Always check response.ok** before parsing
2. **Use try-catch** for both network errors and parsing errors
3. **Set appropriate headers** (Content-Type, Accept)
4. **Handle timeouts** for long-running requests
5. **Implement retry logic** for transient failures
6. **Don't retry 4xx errors** (except 429 rate limits)
7. **Use AbortController** for cancellable requests
8. **Parse errors carefully** - server may return HTML on errors
9. **Log errors** but show user-friendly messages
10. **Consider request deduplication** for identical concurrent requests
