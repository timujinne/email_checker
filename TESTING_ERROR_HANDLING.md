# Testing Guide: Smart Filter Error Handling

## Quick Testing Scenarios

### Test 1: Connection Check ✅
**Simulate:** Backend offline
```bash
# Stop the web server
# In browser: Navigate to Smart Filter page
```
**Expected:**
1. Click "Apply Filter"
2. See toast: "Cannot connect to server. Please check your connection and try again."

**Result:** ✅ Pass / ❌ Fail

---

### Test 2: Network Timeout ⏱️
**Simulate:** Slow network response
```python
# In web_server.py, add delay to /api/smart-filter/apply
import time
time.sleep(65)  # Exceed 60s timeout
```
**Expected:**
1. Loading overlay appears
2. After 60 seconds: "Request took too long. The server might be busy."

**Result:** ✅ Pass / ❌ Fail

---

### Test 3: Retry Logic 🔄
**Simulate:** Temporary server error
```python
# In web_server.py, return 503 on first 2 attempts
attempt_count = 0
if attempt_count < 2:
    attempt_count += 1
    return jsonify({"success": False, "error": "Service temporarily unavailable"}), 503
```
**Expected:**
1. Loading: "Applying filter..."
2. Loading: "Retrying... Attempt 1 of 3 (waiting 1s)"
3. Loading: "Retrying... Attempt 2 of 3 (waiting 2s)"
4. Success on 3rd attempt

**Result:** ✅ Pass / ❌ Fail

---

### Test 4: Operation Cancellation 🛑
**Simulate:** Long operation
```python
# In web_server.py, add sleep
import time
time.sleep(30)  # 30 second operation
```
**Expected:**
1. Loading overlay appears
2. Click "Cancel" button
3. Toast: "Operation cancelled"
4. Loading overlay disappears
5. No error modal

**Result:** ✅ Pass / ❌ Fail

---

### Test 5: Invalid Configuration ⚠️
**Simulate:** Missing required fields
```javascript
// In browser console
window.smartFilterInstance.currentConfig.metadata.name = '';
window.smartFilterInstance.applyFilter();
```
**Expected:**
1. Toast: "Configuration is invalid. Please check your filter settings."
2. No API call made

**Result:** ✅ Pass / ❌ Fail

---

### Test 6: HTTP 400 Error ❌
**Simulate:** Invalid request
```python
# In web_server.py
return jsonify({"success": False, "error": "Invalid filter configuration"}), 400
```
**Expected:**
1. Toast: "Invalid request. Please check your filter configuration."
2. Error modal with Retry button
3. No automatic retries (4xx errors don't retry)

**Result:** ✅ Pass / ❌ Fail

---

### Test 7: Successful Operation ✅
**Simulate:** Normal operation
```python
# Backend returns success
return jsonify({
    "success": True,
    "output_files": ["list_HIGH_PRIORITY.txt", "list_MEDIUM_PRIORITY.txt"]
})
```
**Expected:**
1. Loading overlay: "Applying filter..."
2. Success toast: "Filter applied successfully!"
3. Success modal with file list
4. Modal shows 2 output files

**Result:** ✅ Pass / ❌ Fail

---

### Test 8: Retry After Failure 🔄
**Simulate:** Fail once, then manual retry
```python
# Backend returns error
return jsonify({"success": False, "error": "Processing failed"}), 500
```
**Expected:**
1. After 3 auto-retries, error modal appears
2. Click "Retry" button
3. Operation re-executed
4. New loading overlay
5. Can succeed or fail again

**Result:** ✅ Pass / ❌ Fail

---

### Test 9: Multiple Rapid Clicks 🖱️
**Simulate:** User clicks "Apply Filter" multiple times
```javascript
// Click Apply Filter button 5 times quickly
```
**Expected:**
1. Only one operation executes
2. Loading overlay prevents additional clicks
3. No duplicate API calls

**Result:** ✅ Pass / ❌ Fail

---

### Test 10: Dark Mode Compatibility 🌙
**Simulate:** Switch theme
```javascript
// In browser console
document.documentElement.setAttribute('data-theme', 'dark');
```
**Expected:**
1. Loading overlay has dark background
2. Text is readable in dark mode
3. Modals styled correctly

**Result:** ✅ Pass / ❌ Fail

---

## Browser Console Testing

### Test Connection Check
```javascript
await window.smartFilterInstance.checkConnection()
// Expected: true (if server running) or false (if offline)
```

### Test Error Formatting
```javascript
// Network error
console.log(window.smartFilterInstance.formatError(new Error('fetch failed')));
// Expected: "Network connection lost. Please check your internet connection."

// HTTP error
const httpError = new Error('HTTP 500');
httpError.status = 500;
console.log(window.smartFilterInstance.formatError(httpError));
// Expected: "Server error. Please try again later."

// Timeout error
const timeoutError = new Error('Request timeout');
timeoutError.name = 'TimeoutError';
console.log(window.smartFilterInstance.formatError(timeoutError));
// Expected: "Request took too long. The server might be busy. Please try again."
```

### Test Loading States
```javascript
// Show loading
window.smartFilterInstance.showLoading('Testing...');

// Update loading
window.smartFilterInstance.updateLoading('Still testing...', '50%');

// Hide loading
window.smartFilterInstance.hideLoading();
```

### Test Cancellation
```javascript
// Start operation
window.smartFilterInstance.executeApplyFilter();

// Cancel after 2 seconds
setTimeout(() => {
    window.smartFilterInstance.cancelOperation();
}, 2000);
```

---

## Network Throttling Test

### Chrome DevTools
1. Open DevTools (F12)
2. Network tab → Throttling dropdown
3. Select "Slow 3G"
4. Apply filter
5. **Expected:** Loading overlay shows, operation completes or times out

---

## Mobile Testing

### Responsive Design
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (iPhone 12)
4. Apply filter
5. **Expected:** Loading overlay is properly sized, buttons accessible

---

## Error Log Inspection

### Console Output
```javascript
// Should see structured logs:
console.log('🎯 Initializing Smart Filter Studio...');
console.log('✅ Smart Filter Studio initialized');
console.log('⚙️ Config updated:', config.metadata.name);
console.log('✓ Filter applied:', response);

// Errors should be clear:
console.error('❌ Error in applyFilter:', error);
console.error('❌ Error executing filter:', error);
```

---

## Backend API Testing

### Manual API Call
```bash
# Test /api/status endpoint
curl http://localhost:8080/api/status

# Test /api/smart-filter/apply endpoint
curl -X POST http://localhost:8080/api/smart-filter/apply \
  -H "Content-Type: application/json" \
  -d '{"config": {...}, "timestamp": "2025-10-30T12:00:00Z"}'
```

---

## Regression Testing

### Existing Functionality
- [ ] Visual builder still works
- [ ] JSON editor still works
- [ ] Template library still works
- [ ] Filter tester still works
- [ ] Tab switching works
- [ ] Save/load templates work
- [ ] Download JSON works

### New Functionality
- [ ] Apply filter validates config
- [ ] Connection check before API call
- [ ] Loading overlay displays
- [ ] Retry logic executes
- [ ] Cancellation works
- [ ] Error messages are clear
- [ ] Success modal shows files
- [ ] Retry button re-executes

---

## Performance Testing

### Timing Measurements
```javascript
// Measure connection check
console.time('connectionCheck');
await window.smartFilterInstance.checkConnection();
console.timeEnd('connectionCheck');
// Expected: <5 seconds

// Measure retry delays
// Attempt 1: 1 second
// Attempt 2: 2 seconds
// Attempt 3: 4 seconds
// Attempt 4: 8 seconds (if max not reached)
```

---

## Automated Testing (Future)

### Jest Unit Tests
```javascript
describe('SmartFilter Error Handling', () => {
  test('formats network errors correctly', () => {
    const error = new Error('fetch failed');
    const message = smartFilter.formatError(error);
    expect(message).toContain('Network connection lost');
  });

  test('retries on 500 errors', async () => {
    // Mock API to fail twice, then succeed
    // Verify 3 total attempts
  });

  test('does not retry on 400 errors', async () => {
    // Mock API to return 400
    // Verify only 1 attempt
  });
});
```

### Cypress E2E Tests
```javascript
describe('Smart Filter - Error Handling', () => {
  it('shows loading overlay on apply', () => {
    cy.visit('/smart-filter');
    cy.get('[data-test="apply-filter-btn"]').click();
    cy.get('#smart-filter-loading').should('be.visible');
  });

  it('shows error modal on failure', () => {
    // Intercept API to return error
    cy.intercept('POST', '/api/smart-filter/apply', {
      statusCode: 500,
      body: { success: false, error: 'Server error' }
    });

    cy.visit('/smart-filter');
    cy.get('[data-test="apply-filter-btn"]').click();
    cy.contains('Operation Failed').should('be.visible');
  });
});
```

---

## Test Results Template

```
Test Date: _______________
Tester: _______________
Browser: _______________
Version: _______________

Test 1 (Connection Check):        ✅ Pass / ❌ Fail
Test 2 (Network Timeout):         ✅ Pass / ❌ Fail
Test 3 (Retry Logic):             ✅ Pass / ❌ Fail
Test 4 (Cancellation):            ✅ Pass / ❌ Fail
Test 5 (Invalid Config):          ✅ Pass / ❌ Fail
Test 6 (HTTP 400):                ✅ Pass / ❌ Fail
Test 7 (Success):                 ✅ Pass / ❌ Fail
Test 8 (Retry After Failure):    ✅ Pass / ❌ Fail
Test 9 (Rapid Clicks):            ✅ Pass / ❌ Fail
Test 10 (Dark Mode):              ✅ Pass / ❌ Fail

Notes:
_________________________________
_________________________________
_________________________________
```

---

## Debugging Tips

### Common Issues

**Issue:** "smartFilterInstance is not defined"
**Solution:** Ensure Smart Filter page is loaded first
```javascript
// Navigate to smart-filter route
window.location.hash = '#/smart-filter';
// Wait for initialization
setTimeout(() => console.log(window.smartFilterInstance), 1000);
```

**Issue:** Loading overlay doesn't appear
**Solution:** Check z-index and container
```javascript
// Verify overlay exists
document.getElementById('smart-filter-loading');
// Check z-index
getComputedStyle(overlay).zIndex; // Should be 50
```

**Issue:** Retries not working
**Solution:** Check error status codes
```javascript
// 4xx errors don't retry (except 429)
// 5xx errors do retry
// Network errors do retry
```

**Issue:** Cancel button not working
**Solution:** Verify global function is bound
```javascript
typeof window.smartFilterCancelOperation === 'function';
// Should be true
```

---

## Test Coverage Goals

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** All API endpoints
- **E2E Tests:** Critical user flows
- **Manual Tests:** UI/UX validation

---

**Last Updated:** October 30, 2025
**Status:** Ready for testing
