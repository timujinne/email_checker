# Runtime Performance Guide

## Event Optimization

### Debouncing

Delay execution until user stops triggering event:

```javascript
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Usage: search input
const search = debounce((query) => {
  filterResults(query);
}, 300);

input.addEventListener('input', (e) => search(e.target.value));
```

### Throttling

Limit execution frequency:

```javascript
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage: scroll events
window.addEventListener('scroll', throttle(() => {
  updateScrollIndicator();
}, 100));
```

### Event Delegation

Use single listener instead of many:

```javascript
// BAD: Listener per item
items.forEach(item => {
  item.addEventListener('click', handleClick);
});

// GOOD: Single delegated listener
container.addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (item) handleClick(item);
});
```

## RequestAnimationFrame

### Smooth Animations

```javascript
class SmoothUpdater {
  constructor() {
    this.pending = false;
    this.updates = [];
  }

  schedule(updateFn) {
    this.updates.push(updateFn);
    if (!this.pending) {
      this.pending = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  flush() {
    this.updates.forEach(fn => fn());
    this.updates = [];
    this.pending = false;
  }
}

const updater = new SmoothUpdater();
updater.schedule(() => {
  element.style.transform = `translateX(${x}px)`;
});
```

## Layout Thrashing

### Problem

```javascript
// BAD: Interleaved reads and writes cause reflows
elements.forEach(el => {
  const height = el.offsetHeight;  // Read (forces layout)
  el.style.height = height * 2 + 'px';  // Write
});
```

### Solution

```javascript
// GOOD: Batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight);
heights.forEach((height, i) => {
  elements[i].style.height = height * 2 + 'px';
});
```

### FastDOM Pattern

```javascript
class FastDOM {
  constructor() {
    this.reads = [];
    this.writes = [];
    this.scheduled = false;
  }

  measure(fn) {
    this.reads.push(fn);
    this.schedule();
  }

  mutate(fn) {
    this.writes.push(fn);
    this.schedule();
  }

  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => this.flush());
  }

  flush() {
    this.reads.forEach(fn => fn());
    this.reads = [];
    this.writes.forEach(fn => fn());
    this.writes = [];
    this.scheduled = false;
  }
}

const fastdom = new FastDOM();

fastdom.measure(() => {
  const height = element.offsetHeight;
  fastdom.mutate(() => {
    element.style.height = height * 2 + 'px';
  });
});
```

## Web Workers

### Email Validation Worker

```javascript
// email-validator.worker.js
self.addEventListener('message', (e) => {
  const { emails } = e.data;
  const results = validateEmails(emails);
  self.postMessage(results);
});

function validateEmails(emails) {
  return emails.map(email => ({
    email,
    valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }));
}

// main.js
const worker = new Worker('email-validator.worker.js');

worker.addEventListener('message', (e) => {
  displayResults(e.data);
});

worker.postMessage({ emails: largeEmailList });
```

## Memory Management

### Avoid Memory Leaks

```javascript
// BAD: Event listeners not cleaned up
class Component {
  constructor() {
    window.addEventListener('resize', () => this.onResize());
  }
}

// GOOD: Clean up listeners
class Component {
  constructor() {
    this.handleResize = () => this.onResize();
    window.addEventListener('resize', this.handleResize);
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}
```

### Use WeakMap for Caching

```javascript
// Automatic garbage collection
const cache = new WeakMap();

function processElement(element) {
  if (cache.has(element)) {
    return cache.get(element);
  }

  const result = expensiveOperation(element);
  cache.set(element, result);
  return result;
}
```

## Email Checker Optimizations

### Debounced Search

```javascript
const searchInput = document.getElementById('search');
const handleSearch = debounce((query) => {
  const results = filterEmails(query);
  virtualScroller.updateItems(results);
}, 300);

searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
```

### Throttled Processing Updates

```javascript
let processedCount = 0;
const updateProgress = throttle(() => {
  progressBar.style.width = `${(processedCount / total) * 100}%`;
}, 100);

emails.forEach(email => {
  processEmail(email);
  processedCount++;
  updateProgress();
});
```

## Profiling

### Chrome DevTools

1. Open Performance tab
2. Click Record
3. Perform slow action
4. Stop recording
5. Analyze flame chart

### Performance API

```javascript
performance.mark('start');
expensiveOperation();
performance.mark('end');
performance.measure('operation', 'start', 'end');

const measure = performance.getEntriesByName('operation')[0];
console.log(`Took ${measure.duration}ms`);
```
