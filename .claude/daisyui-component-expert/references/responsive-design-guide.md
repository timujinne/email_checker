# Responsive Design Guide

This guide provides comprehensive strategies for building mobile-first responsive interfaces using daisyUI and Tailwind CSS breakpoints.

## Mobile-First Philosophy

Mobile-first design means writing base styles for mobile devices and progressively enhancing for larger screens. This approach ensures:
- Optimal performance on mobile devices (base styles are lighter)
- Progressive enhancement for desktop users
- Better maintainability (adding complexity upward vs. subtracting downward)
- Accessibility focus (mobile constraints force simpler, clearer UIs)

**Breakpoint System:**
- **Base (< 640px)**: Mobile phones (default, no prefix)
- **sm: (640px+)**: Large phones, small tablets
- **md: (768px+)**: Tablets
- **lg: (1024px+)**: Laptops, small desktops
- **xl: (1280px+)**: Desktops
- **2xl: (1536px+)**: Large desktops

---

## Responsive Layout Patterns

### Grid Layouts

Grid layouts automatically reflow based on screen size.

**Single Column to Multi-Column:**
```html
<!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns, Large: 4 columns -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
  <div class="card">Card 4</div>
</div>
```

**Responsive Column Spans:**
```html
<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
  <!-- Sidebar: Full width on mobile, 3 columns on desktop -->
  <aside class="md:col-span-3">
    <div class="card">Sidebar</div>
  </aside>
  <!-- Main: Full width on mobile, 9 columns on desktop -->
  <main class="md:col-span-9">
    <div class="card">Main Content</div>
  </main>
</div>
```

**Auto-Fit Grid (Dynamic Columns):**
```html
<!-- Automatically fits as many columns as possible with min 250px width -->
<div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  <div class="card">Flexible Card</div>
  <div class="card">Flexible Card</div>
  <div class="card">Flexible Card</div>
</div>
```

### Flexbox Layouts

Flexbox provides flexible alignment and distribution.

**Stack on Mobile, Row on Desktop:**
```html
<div class="flex flex-col md:flex-row gap-4">
  <div class="flex-1">Item 1</div>
  <div class="flex-1">Item 2</div>
  <div class="flex-1">Item 3</div>
</div>
```

**Responsive Alignment:**
```html
<div class="flex flex-col items-center md:flex-row md:justify-between gap-4">
  <h1 class="text-2xl">Title</h1>
  <div class="flex gap-2">
    <button class="btn">Action 1</button>
    <button class="btn">Action 2</button>
  </div>
</div>
```

---

## Responsive Tables

Tables are challenging on mobile due to horizontal scrolling. Here are three approaches:

### 1. Horizontal Scroll (Simplest)

Wrap table in `overflow-x-auto` for horizontal scrolling on mobile.

```html
<div class="overflow-x-auto">
  <table class="table">
    <thead>
      <tr>
        <th>Email</th>
        <th>Status</th>
        <th>Date Added</th>
        <th>Source</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>user@example.com</td>
        <td><span class="badge badge-success">Clean</span></td>
        <td>2025-10-29</td>
        <td>Import</td>
        <td><button class="btn btn-xs">View</button></td>
      </tr>
    </tbody>
  </table>
</div>
```

**When to use:** Simple tables with few columns, data that benefits from comparison across rows.

### 2. Column Priority (Hide Less Important Columns)

Hide less critical columns on smaller screens.

```html
<div class="overflow-x-auto">
  <table class="table">
    <thead>
      <tr>
        <th>Email</th>
        <th>Status</th>
        <th class="hidden md:table-cell">Date Added</th>
        <th class="hidden lg:table-cell">Source</th>
        <th class="hidden lg:table-cell">Country</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>user@example.com</td>
        <td><span class="badge badge-success">Clean</span></td>
        <td class="hidden md:table-cell">2025-10-29</td>
        <td class="hidden lg:table-cell">Import</td>
        <td class="hidden lg:table-cell">Italy</td>
        <td><button class="btn btn-xs">View</button></td>
      </tr>
    </tbody>
  </table>
</div>
```

**When to use:** Tables with many columns where some information is supplementary.

**Priority Guidelines:**
- Always visible: Primary identifier (email, name), status, actions
- Medium priority (md:): Secondary identifiers, dates
- Low priority (lg:): Metadata, categories, tags

### 3. Stacked Cards (Mobile-Friendly Alternative)

Show table on desktop, cards on mobile.

```html
<!-- Table for desktop -->
<div class="hidden lg:block overflow-x-auto">
  <table class="table table-zebra">
    <thead>
      <tr>
        <th>Email</th>
        <th>Status</th>
        <th>Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>user@example.com</td>
        <td><span class="badge badge-success">Clean</span></td>
        <td>2025-10-29</td>
        <td><button class="btn btn-sm">View</button></td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Cards for mobile -->
<div class="lg:hidden space-y-4">
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body p-4">
      <div class="flex justify-between items-start">
        <div class="font-semibold truncate flex-1">user@example.com</div>
        <span class="badge badge-success badge-sm">Clean</span>
      </div>
      <div class="text-sm text-base-content/70">Added: 2025-10-29</div>
      <div class="card-actions justify-end mt-2">
        <button class="btn btn-sm btn-primary">View Details</button>
      </div>
    </div>
  </div>
</div>
```

**When to use:** Complex tables with many columns, data that doesn't require row comparison, detail-heavy information.

---

## Responsive Navigation

### Drawer Pattern (Recommended)

Use drawer for mobile hamburger menu that becomes sidebar on desktop.

```html
<div class="drawer lg:drawer-open">
  <!-- Drawer toggle checkbox -->
  <input id="main-drawer" type="checkbox" class="drawer-toggle" />
  
  <!-- Main content area -->
  <div class="drawer-content flex flex-col">
    <!-- Navbar (mobile only) -->
    <div class="navbar bg-base-100 lg:hidden">
      <div class="navbar-start">
        <label for="main-drawer" class="btn btn-square btn-ghost">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </label>
      </div>
      <div class="navbar-center">
        <span class="text-xl font-bold">App Name</span>
      </div>
    </div>
    
    <!-- Main content -->
    <main class="flex-1 p-4 lg:p-6">
      <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
      <!-- Content here -->
    </main>
  </div>
  
  <!-- Sidebar -->
  <div class="drawer-side">
    <label for="main-drawer" class="drawer-overlay"></label>
    <aside class="menu p-4 w-80 min-h-full bg-base-200">
      <h2 class="text-xl font-bold mb-4">Navigation</h2>
      <ul>
        <li><a>Dashboard</a></li>
        <li><a>Lists</a></li>
        <li><a>Settings</a></li>
      </ul>
    </aside>
  </div>
</div>
```

### Navbar Collapse Pattern

Collapse navigation items into dropdown on mobile.

```html
<div class="navbar bg-base-100 shadow-md">
  <div class="navbar-start">
    <div class="dropdown">
      <button tabindex="0" class="btn btn-ghost lg:hidden">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
        <li><a>Dashboard</a></li>
        <li><a>Lists</a></li>
        <li><a>Reports</a></li>
        <li><a>Settings</a></li>
      </ul>
    </div>
    <a class="btn btn-ghost text-xl">Logo</a>
  </div>
  <div class="navbar-center hidden lg:flex">
    <ul class="menu menu-horizontal px-1">
      <li><a>Dashboard</a></li>
      <li><a>Lists</a></li>
      <li><a>Reports</a></li>
      <li><a>Settings</a></li>
    </ul>
  </div>
  <div class="navbar-end">
    <button class="btn btn-ghost btn-circle">
      <svg class="w-5 h-5"><path/></svg>
    </button>
  </div>
</div>
```

---

## Touch Target Sizing

Ensure interactive elements are touch-friendly on mobile (minimum 44×44 pixels).

### Buttons

daisyUI buttons meet touch targets by default, but custom sizing needs attention:

```html
<!-- Good: Adequate touch target on mobile -->
<button class="btn btn-sm sm:btn-xs">Action</button>

<!-- Better: Explicit minimum sizing -->
<button class="btn btn-square min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0">
  <svg class="w-5 h-5"><path/></svg>
</button>
```

### Checkboxes and Radio Buttons

```html
<!-- Default (too small for touch) -->
<input type="checkbox" class="checkbox" />

<!-- Touch-friendly -->
<input type="checkbox" class="checkbox w-6 h-6 sm:w-5 sm:h-5" />
```

### Icon Buttons

```html
<!-- Ensure icon buttons have adequate padding -->
<button class="btn btn-ghost btn-square">
  <svg class="w-6 h-6"><path/></svg>
</button>
```

### Spacing Between Interactive Elements

```html
<!-- Adequate spacing on mobile -->
<div class="flex flex-wrap gap-3 sm:gap-2">
  <button class="btn">Button 1</button>
  <button class="btn">Button 2</button>
  <button class="btn">Button 3</button>
</div>
```

---

## Responsive Typography

Scale text appropriately for different screen sizes.

### Headings

```html
<h1 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">
  Main Heading
</h1>

<h2 class="text-xl sm:text-2xl lg:text-3xl font-bold">
  Subheading
</h2>

<h3 class="text-lg sm:text-xl lg:text-2xl font-semibold">
  Section Heading
</h3>
```

### Body Text

```html
<p class="text-sm sm:text-base lg:text-lg">
  Body text that scales appropriately across devices.
</p>
```

### Responsive Line Height

```html
<p class="text-base leading-relaxed lg:leading-loose">
  Text with responsive line height for improved readability.
</p>
```

---

## Responsive Spacing

Adjust spacing for different screen sizes.

### Padding

```html
<!-- Less padding on mobile, more on desktop -->
<div class="p-4 md:p-6 lg:p-8">Content</div>

<!-- Different padding directions -->
<div class="px-4 py-6 md:px-8 md:py-10">Content</div>
```

### Margin

```html
<!-- Responsive vertical spacing -->
<section class="mb-8 md:mb-12 lg:mb-16">Section</section>

<!-- Responsive horizontal centering with max-width -->
<div class="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
  Centered content with responsive side padding
</div>
```

### Gap in Flex/Grid

```html
<!-- Tighter gaps on mobile -->
<div class="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

---

## Responsive Visibility

Show or hide elements based on screen size.

### Display Utilities

```html
<!-- Hidden on mobile, visible on desktop -->
<div class="hidden lg:block">Desktop only content</div>

<!-- Visible on mobile, hidden on desktop -->
<div class="block lg:hidden">Mobile only content</div>

<!-- Visible on tablet and below -->
<div class="md:hidden">Tablet and mobile</div>
```

### Responsive Component Variants

```html
<!-- Compact card on mobile, normal on desktop -->
<div class="card card-compact lg:card-normal">
  <div class="card-body">Content</div>
</div>

<!-- Small buttons on mobile, normal on desktop -->
<button class="btn btn-sm md:btn-md">Responsive Button</button>
```

---

## Best Practices

### 1. Test on Real Devices

- Emulators are helpful but not sufficient
- Test on actual phones, tablets, and desktops
- Use browser DevTools device emulation for rapid iteration

### 2. Design for Touch First

- Assume users interact via touch on mobile
- Provide hover states for desktop
- Don't rely on hover for critical functionality

### 3. Optimize Performance

- Mobile devices often have slower connections
- Use responsive images with `srcset`
- Lazy load off-screen content
- Minimize initial page weight

### 4. Consider Landscape Orientation

```html
<!-- Portrait: stacked, Landscape: row -->
<div class="flex flex-col sm:landscape:flex-row gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### 5. Use Container Queries (Modern Approach)

When available, use container queries for component-level responsiveness:

```css
@container (min-width: 400px) {
  .card-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

---

## Complete Responsive Example

```html
<div class="min-h-screen bg-base-200">
  <!-- Responsive navbar -->
  <nav class="navbar bg-base-100 shadow-md">
    <div class="navbar-start">
      <label for="drawer" class="btn btn-ghost btn-square lg:hidden">☰</label>
      <span class="text-xl font-bold">Email Checker</span>
    </div>
    <div class="navbar-end">
      <button class="btn btn-ghost btn-circle">
        <svg class="w-5 h-5"><path/></svg>
      </button>
    </div>
  </nav>

  <!-- Responsive content grid -->
  <main class="container mx-auto p-4 sm:p-6 lg:p-8">
    <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6">Dashboard</h1>
    
    <!-- Stats cards - responsive grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Total Lists</div>
        <div class="stat-value">12</div>
      </div>
      <!-- More stat cards -->
    </div>

    <!-- Responsive table/card view -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">Recent Lists</h2>
        
        <!-- Table on desktop -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="table table-zebra">
            <thead><tr><th>Name</th><th>Status</th><th>Emails</th><th>Actions</th></tr></thead>
            <tbody>
              <tr>
                <td>Italy_Contacts</td>
                <td><span class="badge badge-success">Clean</span></td>
                <td>5,234</td>
                <td><button class="btn btn-sm">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Cards on mobile/tablet -->
        <div class="lg:hidden space-y-3">
          <div class="border border-base-300 rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-semibold">Italy_Contacts</h3>
              <span class="badge badge-success badge-sm">Clean</span>
            </div>
            <p class="text-sm text-base-content/70 mb-3">5,234 emails</p>
            <button class="btn btn-sm btn-primary w-full">View Details</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>
```

This responsive design guide provides the patterns and techniques needed to build interfaces that work beautifully across all device sizes while maintaining daisyUI's component-based approach.
