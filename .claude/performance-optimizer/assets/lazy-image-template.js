/**
 * LazyImageLoader - Efficient image lazy loading using Intersection Observer
 *
 * Loads images only when they enter the viewport, improving initial page load
 * performance and reducing bandwidth usage.
 *
 * Usage:
 *   const loader = new LazyImageLoader({ rootMargin: '100px' });
 *   loader.observeAll();
 *
 * HTML:
 *   <img data-src="actual-image.jpg" src="placeholder.jpg" alt="Description">
 */

class LazyImageLoader {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.1;
    this.rootMargin = options.rootMargin || '50px';
    this.onLoad = options.onLoad || null;
    this.onError = options.onError || null;

    this.observer = new IntersectionObserver(
      entries => this.handleIntersection(entries),
      {
        threshold: this.threshold,
        rootMargin: this.rootMargin
      }
    );
  }

  observe(img) {
    this.observer.observe(img);
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Add loading class for CSS transitions
    img.classList.add('loading');

    // Create temporary image to load
    const tempImg = new Image();

    tempImg.onload = () => {
      img.src = src;
      img.classList.remove('loading');
      img.classList.add('loaded');

      // Call custom onLoad handler
      if (this.onLoad) {
        this.onLoad(img);
      }
    };

    tempImg.onerror = () => {
      img.classList.remove('loading');
      img.classList.add('error');

      // Call custom onError handler
      if (this.onError) {
        this.onError(img);
      }
    };

    tempImg.src = src;
  }

  observeAll(container = document) {
    const images = container.querySelectorAll('img[data-src]');
    images.forEach(img => this.observe(img));
  }

  disconnect() {
    this.observer.disconnect();
  }
}

/**
 * LazyContentLoader - Generic lazy loader for any content
 *
 * Loads any content (images, iframes, sections) when scrolled into view.
 */

class LazyContentLoader {
  constructor(options = {}) {
    this.rootMargin = options.rootMargin || '200px';
    this.loaders = new Map();

    this.observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadContent(entry.target);
          this.observer.unobserve(entry.target);
        }
      }),
      { rootMargin: this.rootMargin }
    );
  }

  register(element, loader) {
    this.loaders.set(element, loader);
    this.observer.observe(element);
  }

  async loadContent(element) {
    const loader = this.loaders.get(element);
    if (!loader) return;

    element.classList.add('loading');

    try {
      await loader(element);
      element.classList.remove('loading');
      element.classList.add('loaded');
    } catch (error) {
      console.error('Failed to load content:', error);
      element.classList.add('error');
    }

    this.loaders.delete(element);
  }

  disconnect() {
    this.observer.disconnect();
    this.loaders.clear();
  }
}

/**
 * Example usage patterns
 */

// Basic image lazy loading
const lazyLoader = new LazyImageLoader({
  rootMargin: '100px',
  onLoad: (img) => console.log('Loaded:', img.src),
  onError: (img) => console.log('Failed:', img.dataset.src)
});

lazyLoader.observeAll();

// Lazy load sections with content
const contentLoader = new LazyContentLoader({ rootMargin: '200px' });

document.querySelectorAll('.lazy-section').forEach(section => {
  contentLoader.register(section, async (element) => {
    const dataUrl = element.dataset.url;
    const response = await fetch(dataUrl);
    const html = await response.text();
    element.innerHTML = html;
  });
});

// Lazy load metadata tables
document.querySelectorAll('.metadata-section').forEach(section => {
  contentLoader.register(section, async (element) => {
    const emailId = element.dataset.emailId;
    const response = await fetch(`/api/metadata/${emailId}`);
    const metadata = await response.json();
    renderMetadata(element, metadata);
  });
});

function renderMetadata(container, metadata) {
  container.innerHTML = `
    <table class="metadata-table">
      <tr><th>Email</th><td>${metadata.email}</td></tr>
      <tr><th>Domain</th><td>${metadata.domain}</td></tr>
      <tr><th>Company</th><td>${metadata.company || 'N/A'}</td></tr>
      <tr><th>Country</th><td>${metadata.country || 'N/A'}</td></tr>
    </table>
  `;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LazyImageLoader, LazyContentLoader };
}
