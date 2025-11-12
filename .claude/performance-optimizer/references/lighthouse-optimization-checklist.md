# Lighthouse Optimization Checklist

## Running Audits

### Chrome DevTools
1. Open DevTools (F12)
2. Lighthouse tab
3. Select categories and device
4. Generate report

### CLI
```bash
npm install -g lighthouse
lighthouse http://localhost:8080 --view
lighthouse http://localhost:8080 --only-categories=performance --output json
```

## Core Web Vitals

### Largest Contentful Paint (LCP) <2.5s

**Target:** Main content renders in <2.5s

**Common Fixes:**
- Remove render-blocking resources
- Preload critical assets
- Optimize images (WebP, proper sizing)
- Use CDN
- Minimize server response time

```html
<!-- Preload critical resources -->
<link rel="preload" href="/dist/main.css" as="style">
<link rel="preload" href="/dist/main.js" as="script">

<!-- Optimize images -->
<img src="hero.webp" width="800" height="600" loading="eager">
```

### First Input Delay (FID) <100ms

**Target:** User interaction responds in <100ms

**Common Fixes:**
- Break up long tasks (>50ms)
- Code splitting
- Defer non-critical JS
- Use Web Workers
- Reduce JavaScript execution time

```javascript
// Break up long tasks
async function processLargeList(items) {
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    processBatch(batch);
    await new Promise(resolve => setTimeout(resolve, 0));  // Yield to browser
  }
}
```

### Cumulative Layout Shift (CLS) <0.1

**Target:** Minimal visual shifting during load

**Common Fixes:**
- Set explicit dimensions for images/videos
- Reserve space for dynamic content
- Preload fonts
- Avoid inserting content above existing content

```html
<!-- Set dimensions to prevent shifts -->
<img src="image.jpg" width="800" height="600">

<!-- Reserve space for ads -->
<div style="min-height: 250px;">
  <!-- Ad loads here -->
</div>

<!-- Preload fonts -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
```

## Performance Category

### Eliminate Render-Blocking Resources

```html
<!-- BAD: Blocking CSS -->
<link rel="stylesheet" href="styles.css">

<!-- GOOD: Non-blocking CSS for non-critical styles -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>

<!-- Defer non-critical JavaScript -->
<script src="non-critical.js" defer></script>
```

### Minimize Unused JavaScript

```javascript
// Code splitting
const routes = {
  '/admin': () => import('./admin.js'),
  '/reports': () => import('./reports.js')
};

// Dynamic imports for features
button.addEventListener('click', async () => {
  const { Feature } = await import('./feature.js');
  new Feature().render();
});
```

### Optimize Images

```html
<!-- Use modern formats -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description">
</picture>

<!-- Lazy load off-screen images -->
<img src="placeholder.jpg" data-src="real-image.jpg" loading="lazy">

<!-- Responsive images -->
<img srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
     sizes="(max-width: 600px) 480px, 800px"
     src="medium.jpg">
```

### Enable Text Compression

```javascript
// Express.js
const compression = require('compression');
app.use(compression());
```

## Accessibility Category

### Color Contrast

Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text

```css
/* BAD: Low contrast */
.text { color: #888; background: #fff; } /* 2.85:1 */

/* GOOD: High contrast */
.text { color: #333; background: #fff; } /* 12.6:1 */
```

### ARIA Labels

```html
<!-- Buttons without text -->
<button aria-label="Close dialog">×</button>

<!-- Form inputs -->
<label for="email">Email</label>
<input id="email" type="email" aria-required="true">

<!-- Dynamic content -->
<div role="status" aria-live="polite">
  Loading results...
</div>
```

### Keyboard Navigation

```javascript
// Ensure all interactive elements are focusable
<button>Click me</button>  <!-- Naturally focusable -->
<div role="button" tabindex="0" onkeypress="...">Click me</div>  <!-- Make focusable -->

// Keyboard event handling
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick();
  }
});
```

## Best Practices Category

### HTTPS

```nginx
# Nginx redirect
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

### No Console Errors

```javascript
// Remove debug code
// console.log('Debug info');  // Remove in production

// Graceful error handling
try {
  riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  showUserFriendlyError();
}
```

## SEO Category

### Meta Tags

```html
<head>
  <title>Email Checker - Validate Email Lists</title>
  <meta name="description" content="Fast email list validation tool with blocklist filtering">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://example.com/email-checker">
</head>
```

### Semantic HTML

```html
<!-- Use proper heading hierarchy -->
<h1>Main Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>

<!-- Descriptive link text -->
<a href="/docs">Documentation</a>  <!-- Good -->
<a href="/docs">Click here</a>  <!-- Bad -->
```

## Email Checker Specific

### Target Scores
- Performance: >90
- Accessibility: >95
- Best Practices: 100
- SEO: >90

### Priority Optimizations
1. Virtual scrolling for large lists (critical for performance)
2. Code splitting (admin vs user features)
3. Image lazy loading
4. Bundle size <200KB gzipped
5. Proper ARIA labels for accessibility

### Quick Wins
```html
<!-- Add to email_list_manager.html -->
<link rel="preload" href="main.css" as="style">
<link rel="preload" href="main.js" as="script">
<meta name="description" content="Email list validation tool">
<meta name="viewport" content="width=device-width, initial-scale=1">
```

## CI Integration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: http://localhost:8080
          budgetPath: ./budget.json
          uploadArtifacts: true
```

```json
// budget.json
{
  "performance": 90,
  "accessibility": 95,
  "best-practices": 100,
  "seo": 90
}
```
