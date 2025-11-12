# Lazy Loading Patterns

## Image Lazy Loading

### Intersection Observer Approach

```javascript
class LazyImageLoader {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.1;
    this.rootMargin = options.rootMargin || '50px';

    this.observer = new IntersectionObserver(
      entries => this.handleIntersection(entries),
      { threshold: this.threshold, rootMargin: this.rootMargin }
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

    img.classList.add('loading');
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.remove('loading');
      img.classList.add('loaded');
    };
    tempImg.onerror = () => img.classList.add('error');
    tempImg.src = src;
  }

  observeAll(container = document) {
    container.querySelectorAll('img[data-src]').forEach(img => this.observe(img));
  }
}
```

### Progressive Image Loading

```javascript
// Load low-res placeholder, then full image
<img
  src="placeholder-tiny.jpg"
  data-src="full-image.jpg"
  class="progressive-image"
/>
```

## Module Lazy Loading

### Dynamic Imports

```javascript
// Load feature on demand
async function loadSmartFilter() {
  const { SmartFilter } = await import('./smart-filter.js');
  return new SmartFilter();
}

// With loading state
async function loadFeature(modulePath, elementId) {
  const loader = document.getElementById(`${elementId}-loader`);
  const container = document.getElementById(elementId);

  try {
    loader.style.display = 'block';
    const module = await import(modulePath);
    module.default.render(container);
  } catch (error) {
    showError(container, error);
  } finally {
    loader.style.display = 'none';
  }
}
```

### Module Preloading

```javascript
// Prefetch module before user needs it
function preloadModule(modulePath) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = modulePath;
  document.head.appendChild(link);
}

// Prefetch on hover
button.addEventListener('mouseenter', () => {
  preloadModule('./heavy-feature.js');
}, { once: true });
```

## Component Lazy Loading

### Skeleton Screens

```javascript
function showSkeleton(container) {
  container.innerHTML = `
    <div class="skeleton">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  `.repeat(3);
}

async function loadComponent(container) {
  showSkeleton(container);
  const data = await fetchData();
  renderComponent(container, data);
}
```

### Intersection Observer for Components

```javascript
class LazyComponentLoader {
  constructor() {
    this.observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadComponent(entry.target);
          this.observer.unobserve(entry.target);
        }
      }),
      { rootMargin: '200px' }
    );
  }

  register(element, loader) {
    element.dataset.loader = loader;
    this.observer.observe(element);
  }

  async loadComponent(element) {
    const loaderName = element.dataset.loader;
    const module = await import(`./${loaderName}.js`);
    module.default.render(element);
  }
}
```

## Email Checker Patterns

### Lazy Load Reports

```javascript
class ReportViewer {
  constructor() {
    this.reportButton = document.getElementById('view-report-btn');
    this.reportContainer = document.getElementById('report-container');
    this.reportButton.addEventListener('click', () => this.loadReport());
  }

  async loadReport() {
    this.reportButton.disabled = true;
    this.reportButton.textContent = 'Loading...';

    try {
      const { ReportGenerator } = await import('./report-generator.js');
      const generator = new ReportGenerator();
      await generator.render(this.reportContainer);
    } catch (error) {
      this.showError(error);
    } finally {
      this.reportButton.disabled = false;
      this.reportButton.textContent = 'View Report';
    }
  }
}
```

### Lazy Load Chart Library

```javascript
let chartLibrary = null;

async function renderChart(data) {
  if (!chartLibrary) {
    showLoadingSpinner();
    chartLibrary = await import('chart.js');
    hideLoadingSpinner();
  }

  const chart = new chartLibrary.Chart(ctx, { ... });
}
```

## Best Practices

1. **Prioritize critical content** - Load above-the-fold content immediately
2. **Use appropriate thresholds** - rootMargin of 50-200px for smooth experience
3. **Provide loading feedback** - Show skeletons or spinners
4. **Handle errors gracefully** - Fallback content for failed loads
5. **Prefetch intelligently** - Anticipate user actions (hover, route change)
