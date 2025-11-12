# Virtual Scroll Implementation Guide

## Why Virtual Scrolling?

Traditional list rendering becomes unusable with large datasets:

- **1,000 items**: 5-10MB DOM, noticeable lag
- **10,000 items**: 50MB+ DOM, severe performance issues
- **22,000 items** (email checker blocklist): Browser crash or freeze

Virtual scrolling solves this by rendering only visible items plus a buffer.

## Performance Comparison

| Items | Traditional | Virtual Scroll | Improvement |
|-------|-------------|----------------|-------------|
| 100   | ~60 FPS     | ~60 FPS        | None        |
| 1,000 | ~30 FPS     | ~60 FPS        | 2x          |
| 10,000| ~5 FPS      | ~60 FPS        | 12x         |
| 22,000| Crash       | ~60 FPS        | ∞           |

## Core Algorithm

### Basic Implementation

```javascript
class VirtualScroller {
  constructor(container, items, itemHeight, renderItem) {
    this.container = container;        // Scrollable container element
    this.items = items;                // Full dataset
    this.itemHeight = itemHeight;      // Height of each item in pixels
    this.renderItem = renderItem;      // Function to render single item
    this.bufferSize = 5;               // Extra items to render (buffer)

    this.init();
  }

  init() {
    // Create tall container (scroll area)
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.height = `${this.items.length * this.itemHeight}px`;
    this.scrollContainer.style.position = 'relative';

    // Create viewport (visible items only)
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.width = '100%';

    this.scrollContainer.appendChild(this.viewport);
    this.container.appendChild(this.scrollContainer);

    // Attach scroll listener
    this.container.addEventListener('scroll', () => this.onScroll());

    // Initial render
    this.render();
  }

  onScroll() {
    // Use RAF for smooth scrolling
    requestAnimationFrame(() => this.render());
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;

    // Calculate which items are visible
    const visibleStart = Math.floor(scrollTop / this.itemHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / this.itemHeight);

    // Add buffer
    const startIndex = Math.max(0, visibleStart - this.bufferSize);
    const endIndex = Math.min(this.items.length, visibleEnd + this.bufferSize);

    // Clear viewport
    this.viewport.innerHTML = '';

    // Position viewport at correct scroll offset
    this.viewport.style.transform = `translateY(${startIndex * this.itemHeight}px)`;

    // Render visible items
    for (let i = startIndex; i < endIndex; i++) {
      const itemElement = this.renderItem(this.items[i], i);
      itemElement.style.height = `${this.itemHeight}px`;
      this.viewport.appendChild(itemElement);
    }
  }

  // Public API
  updateItems(newItems) {
    this.items = newItems;
    this.scrollContainer.style.height = `${newItems.length * this.itemHeight}px`;
    this.render();
  }

  scrollToItem(index) {
    this.container.scrollTop = index * this.itemHeight;
  }

  scrollToTop() {
    this.container.scrollTop = 0;
  }
}
```

### Usage Example

```javascript
// Email checker: render 22,000 blocked emails
const container = document.getElementById('email-list');

const scroller = new VirtualScroller(
  container,
  blockedEmails,  // 22,000 emails
  40,             // 40px height per email
  (email, index) => {
    const div = document.createElement('div');
    div.className = 'email-item';
    div.innerHTML = `
      <span class="email">${escapeHtml(email)}</span>
      <span class="index">#${index + 1}</span>
    `;
    return div;
  }
);
```

## Advanced Features

### 1. Variable Height Items

When items have different heights:

```javascript
class VariableHeightScroller extends VirtualScroller {
  constructor(container, items, estimateHeight, renderItem) {
    super(container, items, 0, renderItem);
    this.estimateHeight = estimateHeight;  // Function to estimate height
    this.measuredHeights = new Map();      // Cache measured heights
    this.offsets = [];                     // Cumulative offsets
    this.calculateOffsets();
  }

  calculateOffsets() {
    this.offsets = [0];
    let offset = 0;

    for (let i = 0; i < this.items.length; i++) {
      const height = this.measuredHeights.get(i) || this.estimateHeight(this.items[i]);
      offset += height;
      this.offsets.push(offset);
    }
  }

  findVisibleRange(scrollTop, containerHeight) {
    // Binary search for start index
    let start = 0;
    let end = this.offsets.length - 1;

    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (this.offsets[mid] < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }

    const startIndex = Math.max(0, start - this.bufferSize);

    // Find end index
    const scrollBottom = scrollTop + containerHeight;
    let endIndex = startIndex;

    while (endIndex < this.offsets.length && this.offsets[endIndex] < scrollBottom) {
      endIndex++;
    }

    endIndex = Math.min(this.items.length, endIndex + this.bufferSize);

    return { startIndex, endIndex };
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;

    const { startIndex, endIndex } = this.findVisibleRange(scrollTop, containerHeight);

    this.viewport.innerHTML = '';
    this.viewport.style.transform = `translateY(${this.offsets[startIndex]}px)`;

    for (let i = startIndex; i < endIndex; i++) {
      const itemElement = this.renderItem(this.items[i], i);
      this.viewport.appendChild(itemElement);

      // Measure actual height after render
      const actualHeight = itemElement.offsetHeight;
      if (!this.measuredHeights.has(i) || this.measuredHeights.get(i) !== actualHeight) {
        this.measuredHeights.set(i, actualHeight);
        this.needsRecalculation = true;
      }
    }

    // Recalculate offsets if heights changed
    if (this.needsRecalculation) {
      this.needsRecalculation = false;
      this.calculateOffsets();
      this.scrollContainer.style.height = `${this.offsets[this.offsets.length - 1]}px`;
    }
  }
}
```

### 2. DOM Recycling

Reuse DOM elements instead of recreating:

```javascript
class RecyclingScroller extends VirtualScroller {
  constructor(container, items, itemHeight, renderItem) {
    super(container, items, itemHeight, renderItem);
    this.pool = [];          // Pool of reusable elements
    this.visibleElements = new Map();  // Track visible elements
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;

    const visibleStart = Math.floor(scrollTop / this.itemHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / this.itemHeight);
    const startIndex = Math.max(0, visibleStart - this.bufferSize);
    const endIndex = Math.min(this.items.length, visibleEnd + this.bufferSize);

    const newVisibleElements = new Map();

    // Render visible items
    for (let i = startIndex; i < endIndex; i++) {
      let element = this.visibleElements.get(i) || this.pool.pop();

      if (!element) {
        element = document.createElement('div');
        element.style.height = `${this.itemHeight}px`;
      }

      // Update element content
      this.renderItem(this.items[i], i, element);
      element.style.transform = `translateY(${i * this.itemHeight}px)`;

      if (!this.viewport.contains(element)) {
        this.viewport.appendChild(element);
      }

      newVisibleElements.set(i, element);
    }

    // Recycle hidden elements
    for (const [index, element] of this.visibleElements) {
      if (!newVisibleElements.has(index)) {
        this.pool.push(element);
        element.remove();
      }
    }

    this.visibleElements = newVisibleElements;
  }
}
```

### 3. Smooth Scrolling with Momentum

Add inertia and momentum:

```javascript
class SmoothScroller extends VirtualScroller {
  constructor(container, items, itemHeight, renderItem) {
    super(container, items, itemHeight, renderItem);
    this.velocity = 0;
    this.lastScrollTop = 0;
    this.momentum();
  }

  momentum() {
    const currentScroll = this.container.scrollTop;
    const delta = currentScroll - this.lastScrollTop;

    this.velocity = delta * 0.8 + this.velocity * 0.2;
    this.lastScrollTop = currentScroll;

    requestAnimationFrame(() => this.momentum());
  }

  onScroll() {
    // Only render if velocity is low (scrolling has slowed)
    if (Math.abs(this.velocity) < 5) {
      requestAnimationFrame(() => this.render());
    }
  }
}
```

## Performance Optimization

### 1. Optimize Render Function

```javascript
// BAD: Heavy computation on every render
renderItem: (email, index) => {
  const div = document.createElement('div');
  div.innerHTML = highlightKeywords(email, searchTerm);  // Expensive
  div.addEventListener('click', () => handleClick(email));  // Memory leak
  return div;
}

// GOOD: Pre-process data, use event delegation
// Pre-process highlights
const processedEmails = emails.map(email => ({
  email,
  html: highlightKeywords(email, searchTerm)
}));

renderItem: (data, index) => {
  const div = document.createElement('div');
  div.innerHTML = data.html;  // Pre-processed
  div.dataset.email = data.email;  // For event delegation
  return div;
}

// Event delegation (outside scroller)
container.addEventListener('click', (e) => {
  const item = e.target.closest('[data-email]');
  if (item) {
    handleClick(item.dataset.email);
  }
});
```

### 2. Debounce/Throttle Scroll

```javascript
class OptimizedScroller extends VirtualScroller {
  constructor(...args) {
    super(...args);
    this.renderPending = false;
  }

  onScroll() {
    if (this.renderPending) return;

    this.renderPending = true;
    requestAnimationFrame(() => {
      this.render();
      this.renderPending = false;
    });
  }
}
```

### 3. Batch DOM Updates

```javascript
render() {
  // ... calculate visible range ...

  // Use DocumentFragment for batch insertion
  const fragment = document.createDocumentFragment();

  for (let i = startIndex; i < endIndex; i++) {
    const element = this.renderItem(this.items[i], i);
    fragment.appendChild(element);
  }

  // Single DOM update
  this.viewport.innerHTML = '';
  this.viewport.appendChild(fragment);
}
```

## Email Checker Integration

### Blocklist Viewer

```javascript
// Render 22,000 blocked emails
class BlocklistViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.searchInput = document.getElementById('blocklist-search');
    this.allEmails = [];
    this.filteredEmails = [];

    this.scroller = new VirtualScroller(
      this.container,
      [],
      40,
      this.renderEmail.bind(this)
    );

    this.setupSearch();
  }

  async loadBlocklist() {
    const response = await fetch('/api/blocklist');
    this.allEmails = await response.json();
    this.filteredEmails = this.allEmails;
    this.scroller.updateItems(this.filteredEmails);
  }

  renderEmail(email, index) {
    const div = document.createElement('div');
    div.className = 'email-item';
    div.innerHTML = `
      <span class="email">${escapeHtml(email)}</span>
      <span class="index">${index + 1} / ${this.filteredEmails.length}</span>
    `;
    return div;
  }

  setupSearch() {
    let searchTimeout;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.filterEmails(e.target.value);
      }, 300);
    });
  }

  filterEmails(query) {
    if (!query) {
      this.filteredEmails = this.allEmails;
    } else {
      const lower = query.toLowerCase();
      this.filteredEmails = this.allEmails.filter(email =>
        email.toLowerCase().includes(lower)
      );
    }

    this.scroller.updateItems(this.filteredEmails);
    this.scroller.scrollToTop();
  }
}

// Initialize
const viewer = new BlocklistViewer('blocklist-container');
viewer.loadBlocklist();
```

### Metadata Table

```javascript
// Virtual scrolling for large metadata tables
class MetadataTable extends VirtualScroller {
  constructor(container, columns) {
    super(container, [], 50, null);
    this.columns = columns;
    this.renderItem = this.renderRow.bind(this);
  }

  renderRow(rowData, index) {
    const tr = document.createElement('tr');

    this.columns.forEach(col => {
      const td = document.createElement('td');
      td.textContent = rowData[col.field] || '';
      tr.appendChild(td);
    });

    return tr;
  }
}
```

## Testing

### Performance Benchmarks

```javascript
function benchmarkScroller(itemCount) {
  const items = Array.from({ length: itemCount }, (_, i) => `item-${i}`);
  const container = document.createElement('div');
  container.style.height = '500px';
  container.style.overflow = 'auto';
  document.body.appendChild(container);

  const startTime = performance.now();

  const scroller = new VirtualScroller(
    container,
    items,
    40,
    (item) => {
      const div = document.createElement('div');
      div.textContent = item;
      return div;
    }
  );

  const initTime = performance.now() - startTime;

  // Test scroll performance
  const scrollStart = performance.now();
  container.scrollTop = 10000;  // Scroll to middle
  const scrollTime = performance.now() - scrollStart;

  console.log(`Init time (${itemCount} items): ${initTime}ms`);
  console.log(`Scroll time: ${scrollTime}ms`);

  container.remove();
}

// Run benchmarks
benchmarkScroller(100);
benchmarkScroller(1000);
benchmarkScroller(10000);
benchmarkScroller(22000);  // Email checker size
```

## Troubleshooting

### Issue: Blank spaces while scrolling

**Cause**: Buffer too small or render function too slow

**Fix**: Increase buffer size or optimize render function

```javascript
this.bufferSize = 10;  // Increase buffer
```

### Issue: Janky scrolling

**Cause**: Synchronous scroll handler

**Fix**: Use requestAnimationFrame

```javascript
onScroll() {
  if (!this.rafPending) {
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.render();
      this.rafPending = false;
    });
  }
}
```

### Issue: Memory leak

**Cause**: Event listeners not cleaned up

**Fix**: Use event delegation or cleanup

```javascript
destroy() {
  this.container.removeEventListener('scroll', this.scrollHandler);
  this.viewport.innerHTML = '';
}
```
