# daisyUI Components Reference

This comprehensive reference provides detailed documentation for all daisyUI component categories with practical usage examples, modifier classes, and composition patterns.

## Component Categories Overview

daisyUI organizes its component library into four main categories:
- **Actions** - Interactive elements (buttons, modals, dropdowns)
- **Data Display** - Information presentation (cards, tables, badges)
- **Navigation** - Movement through interfaces (navbar, drawer, menu)
- **Feedback** - Status communication (alerts, progress, loading)

---

## Actions Components

### Buttons

The button component is the most versatile action element with extensive modifier support.

**Base Classes:**
```html
<button class="btn">Button</button>
```

**Color Variants:**
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-accent">Accent</button>
<button class="btn btn-neutral">Neutral</button>
<button class="btn btn-info">Info</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-warning">Warning</button>
<button class="btn btn-error">Error</button>
```

**Style Variants:**
```html
<button class="btn btn-outline">Outline</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-link">Link</button>
<button class="btn btn-glass">Glass</button>
```

**Size Variants:**
```html
<button class="btn btn-lg">Large</button>
<button class="btn btn-md">Medium (default)</button>
<button class="btn btn-sm">Small</button>
<button class="btn btn-xs">Extra Small</button>
```

**Shape Variants:**
```html
<button class="btn btn-square">Square</button>
<button class="btn btn-circle">Circle</button>
<button class="btn btn-wide">Wide</button>
<button class="btn btn-block">Full Width</button>
```

**State Modifiers:**
```html
<button class="btn btn-active">Active</button>
<button class="btn btn-disabled" disabled>Disabled</button>
<button class="btn btn-loading">Loading</button>
```

**Button Groups with Join:**
```html
<div class="join">
  <button class="join-item btn">Button 1</button>
  <button class="join-item btn">Button 2</button>
  <button class="join-item btn">Button 3</button>
</div>
```

### Dropdowns

Dropdowns provide context menus and action lists.

**Basic Dropdown:**
```html
<div class="dropdown">
  <button tabindex="0" class="btn">Dropdown</button>
  <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
    <li><a>Item 1</a></li>
    <li><a>Item 2</a></li>
  </ul>
</div>
```

**Position Variants:**
```html
<div class="dropdown dropdown-end"><!-- Right aligned --></div>
<div class="dropdown dropdown-top"><!-- Opens upward --></div>
<div class="dropdown dropdown-bottom"><!-- Opens downward (default) --></div>
<div class="dropdown dropdown-left"><!-- Opens left --></div>
<div class="dropdown dropdown-right"><!-- Opens right --></div>
```

**Trigger Variants:**
```html
<div class="dropdown dropdown-hover"><!-- Opens on hover --></div>
<div class="dropdown dropdown-open"><!-- Always open --></div>
```

**Dropdown with Icons:**
```html
<div class="dropdown dropdown-end">
  <button tabindex="0" class="btn btn-ghost btn-circle">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
    </svg>
  </button>
  <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
    <li><a>Edit</a></li>
    <li><a>Delete</a></li>
  </ul>
</div>
```

### Modals

Modals display dialogs and overlays.

**Basic Modal (HTML Dialog):**
```html
<dialog id="myModal" class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Hello!</h3>
    <p class="py-4">This is a modal dialog</p>
    <div class="modal-action">
      <form method="dialog">
        <button class="btn">Close</button>
      </form>
    </div>
  </div>
</dialog>

<script>
document.getElementById('openBtn').addEventListener('click', () => {
  document.getElementById('myModal').showModal();
});
</script>
```

**Modal with Backdrop Close:**
```html
<dialog class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Modal Title</h3>
    <p class="py-4">Modal content</p>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
```

**Modal Sizes:**
```html
<div class="modal-box w-11/12 max-w-5xl">Extra Large</div>
<div class="modal-box">Default</div>
<div class="modal-box modal-box-sm">Small</div>
```

**Modal Positions:**
```html
<dialog class="modal modal-bottom"><!-- Bottom of screen --></dialog>
<dialog class="modal modal-middle"><!-- Center (default) --></dialog>
<dialog class="modal modal-top"><!-- Top of screen --></dialog>
```

---

## Data Display Components

### Cards

Cards are versatile containers for grouped content.

**Basic Card:**
```html
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Card Title</h2>
    <p>Card content goes here</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

**Card with Image:**
```html
<div class="card bg-base-100 shadow-xl">
  <figure><img src="image.jpg" alt="Description" /></figure>
  <div class="card-body">
    <h2 class="card-title">Image Card</h2>
    <p>Description text</p>
  </div>
</div>
```

**Card Variants:**
```html
<div class="card card-compact"><!-- Less padding --></div>
<div class="card card-normal"><!-- Default padding --></div>
<div class="card card-side"><!-- Image and content side-by-side --></div>
<div class="card card-bordered"><!-- With border --></div>
<div class="card image-full"><!-- Image as background --></div>
```

**Card with Badge:**
```html
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <div class="badge badge-secondary absolute top-4 right-4">NEW</div>
    <h2 class="card-title">Product Name</h2>
    <p>Product description</p>
  </div>
</div>
```

### Tables

Tables display structured data.

**Basic Table:**
```html
<table class="table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
      <td><span class="badge badge-success">Active</span></td>
    </tr>
  </tbody>
</table>
```

**Table Variants:**
```html
<table class="table table-zebra"><!-- Striped rows --></table>
<table class="table table-pin-rows"><!-- Sticky header --></table>
<table class="table table-pin-cols"><!-- Sticky columns --></table>
<table class="table table-xs"><!-- Extra small --></table>
<table class="table table-sm"><!-- Small --></table>
<table class="table table-md"><!-- Medium (default) --></table>
<table class="table table-lg"><!-- Large --></table>
```

**Interactive Table Row:**
```html
<tr class="hover"><!-- Hover effect --></tr>
<tr class="active"><!-- Active state --></tr>
```

**Responsive Table Wrapper:**
```html
<div class="overflow-x-auto">
  <table class="table"><!-- table content --></table>
</div>
```

### Badges

Badges display status indicators and counts.

**Basic Badges:**
```html
<span class="badge">Default</span>
<span class="badge badge-primary">Primary</span>
<span class="badge badge-secondary">Secondary</span>
<span class="badge badge-accent">Accent</span>
<span class="badge badge-ghost">Ghost</span>
```

**Badge Sizes:**
```html
<span class="badge badge-lg">Large</span>
<span class="badge badge-md">Medium</span>
<span class="badge badge-sm">Small</span>
<span class="badge badge-xs">Extra Small</span>
```

**Badge Variants:**
```html
<span class="badge badge-outline">Outline</span>
<span class="badge badge-neutral">Neutral</span>
<span class="badge badge-info">Info</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
```

**Badge in Card:**
```html
<div class="card">
  <div class="card-body">
    <h2 class="card-title">
      Title
      <span class="badge badge-secondary">NEW</span>
    </h2>
  </div>
</div>
```

---

## Navigation Components

### Navbar

Navbar provides top-level navigation.

**Basic Navbar:**
```html
<div class="navbar bg-base-100">
  <div class="navbar-start">
    <a class="btn btn-ghost text-xl">Logo</a>
  </div>
  <div class="navbar-center">
    <ul class="menu menu-horizontal px-1">
      <li><a>Link 1</a></li>
      <li><a>Link 2</a></li>
    </ul>
  </div>
  <div class="navbar-end">
    <button class="btn">Button</button>
  </div>
</div>
```

**Navbar with Dropdown:**
```html
<div class="navbar bg-base-100">
  <div class="navbar-start">
    <div class="dropdown">
      <button tabindex="0" class="btn btn-ghost lg:hidden">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
        <li><a>Item 1</a></li>
        <li><a>Item 2</a></li>
      </ul>
    </div>
  </div>
</div>
```

### Drawer

Drawer provides side navigation panels.

**Basic Drawer:**
```html
<div class="drawer">
  <input id="my-drawer" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content">
    <label for="my-drawer" class="btn btn-primary drawer-button">Open Drawer</label>
    <!-- Main content -->
  </div>
  <div class="drawer-side">
    <label for="my-drawer" class="drawer-overlay"></label>
    <ul class="menu p-4 w-80 min-h-full bg-base-200">
      <li><a>Menu Item 1</a></li>
      <li><a>Menu Item 2</a></li>
    </ul>
  </div>
</div>
```

**Drawer Variants:**
```html
<div class="drawer drawer-end"><!-- Opens from right --></div>
<div class="drawer drawer-mobile"><!-- Responsive (deprecated, use lg:drawer-open) --></div>
<div class="drawer lg:drawer-open"><!-- Always open on large screens --></div>
```

### Menu

Menu provides vertical or horizontal navigation lists.

**Vertical Menu:**
```html
<ul class="menu bg-base-200 w-56 rounded-box">
  <li><a>Item 1</a></li>
  <li><a>Item 2</a></li>
  <li><a>Item 3</a></li>
</ul>
```

**Horizontal Menu:**
```html
<ul class="menu menu-horizontal bg-base-200 rounded-box">
  <li><a>Item 1</a></li>
  <li><a>Item 2</a></li>
  <li><a>Item 3</a></li>
</ul>
```

**Menu with Submenu:**
```html
<ul class="menu bg-base-200 w-56 rounded-box">
  <li><a>Item 1</a></li>
  <li>
    <details open>
      <summary>Parent</summary>
      <ul>
        <li><a>Submenu 1</a></li>
        <li><a>Submenu 2</a></li>
      </ul>
    </details>
  </li>
</ul>
```

**Menu Sizes:**
```html
<ul class="menu menu-xs"><!-- Extra small --></ul>
<ul class="menu menu-sm"><!-- Small --></ul>
<ul class="menu menu-md"><!-- Medium (default) --></ul>
<ul class="menu menu-lg"><!-- Large --></ul>
```

---

## Feedback Components

### Alerts

Alerts communicate status messages.

**Basic Alerts:**
```html
<div class="alert">
  <span>Default alert message</span>
</div>

<div class="alert alert-info">
  <svg class="stroke-current shrink-0 w-6 h-6"><path/></svg>
  <span>Info alert message</span>
</div>

<div class="alert alert-success">
  <svg class="stroke-current shrink-0 w-6 h-6"><path/></svg>
  <span>Success alert message</span>
</div>

<div class="alert alert-warning">
  <svg class="stroke-current shrink-0 w-6 h-6"><path/></svg>
  <span>Warning alert message</span>
</div>

<div class="alert alert-error">
  <svg class="stroke-current shrink-0 w-6 h-6"><path/></svg>
  <span>Error alert message</span>
</div>
```

**Alert with Title:**
```html
<div class="alert alert-warning">
  <svg class="stroke-current shrink-0 w-6 h-6"><path/></svg>
  <div>
    <h3 class="font-bold">Warning!</h3>
    <div class="text-xs">This action cannot be undone.</div>
  </div>
</div>
```

**Dismissible Alert:**
```html
<div class="alert" id="dismissAlert">
  <span>Alert message</span>
  <button class="btn btn-sm btn-circle btn-ghost" onclick="document.getElementById('dismissAlert').remove()">✕</button>
</div>
```

### Progress

Progress bars show task completion.

**Linear Progress:**
```html
<progress class="progress w-56"></progress>
<progress class="progress w-56" value="0" max="100"></progress>
<progress class="progress w-56" value="40" max="100"></progress>
<progress class="progress w-56" value="100" max="100"></progress>
```

**Colored Progress:**
```html
<progress class="progress progress-primary" value="40" max="100"></progress>
<progress class="progress progress-secondary" value="40" max="100"></progress>
<progress class="progress progress-accent" value="40" max="100"></progress>
<progress class="progress progress-info" value="40" max="100"></progress>
<progress class="progress progress-success" value="40" max="100"></progress>
<progress class="progress progress-warning" value="40" max="100"></progress>
<progress class="progress progress-error" value="40" max="100"></progress>
```

**Radial Progress:**
```html
<div class="radial-progress" style="--value:70;">70%</div>
<div class="radial-progress text-primary" style="--value:70; --size:12rem; --thickness:2px;">70%</div>
```

### Loading

Loading indicators show processing state.

**Spinner:**
```html
<span class="loading loading-spinner"></span>
<span class="loading loading-spinner loading-xs"></span>
<span class="loading loading-spinner loading-sm"></span>
<span class="loading loading-spinner loading-md"></span>
<span class="loading loading-spinner loading-lg"></span>
```

**Other Loading Styles:**
```html
<span class="loading loading-dots"></span>
<span class="loading loading-ring"></span>
<span class="loading loading-ball"></span>
<span class="loading loading-bars"></span>
<span class="loading loading-infinity"></span>
```

**Colored Loading:**
```html
<span class="loading loading-spinner text-primary"></span>
<span class="loading loading-spinner text-secondary"></span>
<span class="loading loading-spinner text-accent"></span>
```

---

## Component Composition Patterns

### Card with Multiple Components

```html
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <div class="flex justify-between items-start">
      <h2 class="card-title">Product Name</h2>
      <div class="badge badge-secondary">NEW</div>
    </div>
    <div class="flex gap-2">
      <span class="badge badge-outline">Tag 1</span>
      <span class="badge badge-outline">Tag 2</span>
    </div>
    <p>Product description goes here</p>
    <div class="flex items-center gap-2">
      <progress class="progress progress-primary w-full" value="75" max="100"></progress>
      <span class="text-sm">75%</span>
    </div>
    <div class="card-actions justify-end">
      <button class="btn btn-primary btn-sm">Buy Now</button>
      <button class="btn btn-ghost btn-sm">Details</button>
    </div>
  </div>
</div>
```

### Table with Complex Cells

```html
<table class="table">
  <thead>
    <tr>
      <th>User</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <div class="avatar">
            <div class="w-12 h-12 rounded-full">
              <img src="avatar.jpg" alt="User" />
            </div>
          </div>
          <div>
            <div class="font-bold">John Doe</div>
            <div class="text-sm opacity-50">john@example.com</div>
          </div>
        </div>
      </td>
      <td>
        <span class="badge badge-success gap-2">
          <svg class="w-3 h-3"><path/></svg>
          Active
        </span>
      </td>
      <td>
        <div class="dropdown dropdown-end">
          <button class="btn btn-ghost btn-xs">⋮</button>
          <ul class="dropdown-content menu">
            <li><a>Edit</a></li>
            <li><a>Delete</a></li>
          </ul>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

This reference provides the foundation for building consistent, maintainable interfaces with daisyUI. Combine components creatively while maintaining semantic HTML and accessibility standards.
