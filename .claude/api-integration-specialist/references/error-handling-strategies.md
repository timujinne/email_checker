# Error Handling Strategies

Comprehensive error handling for production-ready applications.

## Error Classification

### Error Types
```javascript
class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.userMessage = 'Cannot connect to server';
  }
}

class HTTPError extends Error {
  constructor(status, statusText) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HTTPError';
    this.status = status;
    this.userMessage = this.getUserMessage();
  }

  getUserMessage() {
    if (this.status >= 500) return 'Server error';
    if (this.status === 404) return 'Not found';
    if (this.status === 401) return 'Unauthorized';
    return 'Request failed';
  }
}

class ValidationError extends Error {
  constructor(message, fields) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
    this.userMessage = message;
  }
}
```

## Centralized Handler

See SKILL.md for complete ErrorHandler implementation with:
- Error logging with context
- User-friendly notifications
- Development vs production modes
- Custom error callbacks

## Retry Strategies

### When to Retry
- ✅ Network errors (connection lost)
- ✅ 5xx server errors
- ✅ 429 rate limits
- ❌ 4xx client errors (except 429)
- ❌ Validation errors

### Exponential Backoff
```javascript
// Retry with: 1s, 2s, 4s, 8s...
const delay = baseDelay * Math.pow(2, attempt - 1);
```

### With Jitter
```javascript
// Add randomness to prevent thundering herd
const jitter = Math.random() * 1000;
const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
```

## User Feedback

### Toast Notifications
```javascript
function showToast(message, severity = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${severity}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
```

### Inline Errors
```javascript
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const error = document.createElement('div');
  error.className = 'field-error';
  error.textContent = message;
  field.parentNode.appendChild(error);
}
```

## Best Practices

1. **Classify errors** by type
2. **Show user-friendly messages** (never raw errors)
3. **Log detailed errors** for debugging
4. **Retry transient failures** automatically
5. **Provide recovery options** when possible
6. **Use error boundaries** in complex UIs
7. **Monitor error rates** in production
