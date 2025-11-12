/**
 * VirtualScroller - Efficient rendering for large lists
 *
 * Only renders visible items + buffer, dramatically reducing DOM nodes
 * and improving performance for lists with thousands of items.
 *
 * Usage:
 *   const scroller = new VirtualScroller(
 *     document.getElementById('container'),
 *     items,                // Array of data
 *     40,                   // Height per item in pixels
 *     (item, index) => {    // Render function
 *       const div = document.createElement('div');
 *       div.textContent = item;
 *       return div;
 *     }
 *   );
 */

class VirtualScroller {
  constructor(container, items, itemHeight, renderItem) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;

    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.bufferSize = 5;  // Extra items above/below viewport
    this.renderPending = false;

    this.init();
  }

  init() {
    // Create scrollable container with total height
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.height = `${this.items.length * this.itemHeight}px`;
    this.scrollContainer.style.position = 'relative';

    // Create viewport for visible items
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.width = '100%';

    this.scrollContainer.appendChild(this.viewport);
    this.container.appendChild(this.scrollContainer);

    // Attach scroll listener with RAF optimization
    this.scrollHandler = () => this.onScroll();
    this.container.addEventListener('scroll', this.scrollHandler);

    // Initial render
    this.render();
  }

  onScroll() {
    // Prevent multiple RAF calls
    if (this.renderPending) return;

    this.renderPending = true;
    requestAnimationFrame(() => {
      this.render();
      this.renderPending = false;
    });
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;

    // Calculate visible range
    this.visibleStart = Math.floor(scrollTop / this.itemHeight);
    this.visibleEnd = Math.ceil((scrollTop + containerHeight) / this.itemHeight);

    // Add buffer
    const startIndex = Math.max(0, this.visibleStart - this.bufferSize);
    const endIndex = Math.min(this.items.length, this.visibleEnd + this.bufferSize);

    // Clear viewport
    this.viewport.innerHTML = '';

    // Position viewport at correct offset
    this.viewport.style.transform = `translateY(${startIndex * this.itemHeight}px)`;

    // Render visible items
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const itemElement = this.renderItem(this.items[i], i);
      itemElement.style.height = `${this.itemHeight}px`;
      fragment.appendChild(itemElement);
    }
    this.viewport.appendChild(fragment);
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

  scrollToBottom() {
    this.container.scrollTop = this.items.length * this.itemHeight;
  }

  getVisibleRange() {
    return {
      start: this.visibleStart,
      end: this.visibleEnd
    };
  }

  destroy() {
    this.container.removeEventListener('scroll', this.scrollHandler);
    this.viewport.innerHTML = '';
  }
}

/**
 * RecyclingVirtualScroller - Advanced version with DOM recycling
 *
 * Reuses DOM elements instead of recreating them, providing even
 * better performance for complex items.
 */

class RecyclingVirtualScroller extends VirtualScroller {
  constructor(container, items, itemHeight, renderItem) {
    super(container, items, itemHeight, null);
    this.renderItemInto = renderItem;  // Different signature: (item, index, element)
    this.pool = [];                    // Pool of reusable elements
    this.visibleElements = new Map();  // Track visible elements by index
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
      // Try to reuse existing element or get from pool
      let element = this.visibleElements.get(i) || this.pool.pop();

      // Create new element if needed
      if (!element) {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.width = '100%';
        element.style.height = `${this.itemHeight}px`;
      }

      // Update element content and position
      this.renderItemInto(this.items[i], i, element);
      element.style.transform = `translateY(${i * this.itemHeight}px)`;

      // Add to viewport if not already there
      if (!this.viewport.contains(element)) {
        this.viewport.appendChild(element);
      }

      newVisibleElements.set(i, element);
    }

    // Recycle elements that are no longer visible
    for (const [index, element] of this.visibleElements) {
      if (!newVisibleElements.has(index)) {
        this.pool.push(element);
        element.remove();
      }
    }

    this.visibleElements = newVisibleElements;
  }

  destroy() {
    super.destroy();
    this.pool = [];
    this.visibleElements.clear();
  }
}

/**
 * Example usage for email checker blocklist
 */

function createBlocklistViewer(containerId, emails) {
  const container = document.getElementById(containerId);

  // Simple version
  const scroller = new VirtualScroller(
    container,
    emails,
    40,
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

  // Add search functionality
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    if (!query) {
      scroller.updateItems(emails);
    } else {
      const filtered = emails.filter(email => email.includes(query));
      scroller.updateItems(filtered);
    }
    scroller.scrollToTop();
  }, 300));

  return scroller;
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VirtualScroller, RecyclingVirtualScroller };
}
