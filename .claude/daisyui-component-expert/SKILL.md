---
name: daisyui-component-expert
description: Specialist in daisyUI component library, responsive design patterns, theme customization, and accessibility best practices. Focuses on building consistent, maintainable UI components using daisyUI's utility-first approach with Tailwind CSS foundation. Invoke when building UI components, converting HTML to daisyUI, implementing responsive layouts, customizing themes, ensuring accessibility, or creating interactive forms.
---

# daisyUI Component Expert

## Overview

The daisyUI Component Expert skill provides comprehensive expertise in building modern, accessible, and maintainable user interfaces using the daisyUI component library. daisyUI is a plugin for Tailwind CSS that adds semantic component classes while maintaining the utility-first approach. This skill covers the complete spectrum of UI development, from basic component usage to advanced responsive design patterns, theme customization, and accessibility compliance.

This skill is specifically designed for projects using vanilla JavaScript with daisyUI, focusing on practical implementation patterns for real-world applications. Whether you're building data-heavy interfaces like email list managers, creating responsive dashboards, or ensuring WCAG compliance, this skill provides the knowledge and templates needed for consistent, professional UI development.

The expertise encompasses daisyUI's entire component library, responsive design strategies using Tailwind's breakpoint system, theme customization through CSS variables, component composition patterns, and comprehensive accessibility practices including ARIA attributes, keyboard navigation, and screen reader support.

## Core Competencies

### daisyUI Component Library Mastery

Deep knowledge of daisyUI's complete component catalog across all categories: Actions (buttons, dropdowns, modals), Data Display (cards, tables, badges, stats), Navigation (navbar, drawer, menu, breadcrumbs), and Feedback (alerts, progress, tooltips). Understanding of component variants, modifier classes, and state management patterns. Expertise in component composition, nesting patterns, and creating complex UI elements from basic building blocks.

### Responsive Design Implementation

Proficiency in mobile-first design using Tailwind's breakpoint system (sm:640px, md:768px, lg:1024px, xl:1280px, 2xl:1536px). Implementation of responsive tables with horizontal scroll and mobile-stacked layouts, collapsible navigation patterns using daisyUI drawer component, adaptive grid systems, and touch-friendly interfaces with appropriate target sizing (minimum 44x44px).

### Theme System Expertise

Comprehensive understanding of daisyUI's theme system including 30+ built-in themes, custom theme creation through tailwind.config.js, CSS variable architecture, dynamic theme switching with JavaScript, and brand identity integration. Knowledge of color scheme implementation (primary, secondary, accent, neutral, info, success, warning, error) and dark mode considerations.

### Component Composition Patterns

Advanced patterns for building complex interfaces from simple components: nested cards for hierarchical data, button groups with dropdowns, form layouts with validation states, modal dialogs with multi-step forms, table rows with expandable details, and navigation structures with nested menus.

### Accessibility and WCAG Compliance

Implementation of WCAG 2.1 Level AA standards including proper ARIA roles (button, dialog, tabpanel, menuitem), labels (aria-label, aria-labelledby), and descriptions (aria-describedby). Keyboard navigation patterns (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys), focus management with focus-visible, screen reader support with semantic HTML and ARIA live regions, color contrast ratios (4.5:1 for normal text, 3:1 for large text), and error announcement patterns.

### Form Design and Validation

Expertise in form component patterns including input variants (text, email, file, checkbox, radio, select, textarea), validation states (success, error, warning), inline error messages with icon indicators, multi-step form flows, file upload with drag-and-drop, form state management without frameworks, and user feedback patterns (loading states, success confirmations, error recovery).

## When to Invoke This Skill

### Building New UI Components

Invoke this skill when creating new interface elements from scratch. Whether building a data table with sorting and filtering, a card-based layout for displaying items, or an interactive form with validation, this skill provides the component patterns, accessibility requirements, and responsive design strategies needed for production-ready components.

### Converting Existing HTML to daisyUI

When refactoring legacy HTML or migrating from other frameworks (Bootstrap, Material UI), this skill guides the conversion process. It provides equivalent daisyUI components for common patterns, helps maintain semantic HTML structure, ensures accessibility isn't lost in translation, and optimizes for Tailwind's utility-first approach.

### Implementing Responsive Layouts

Call upon this skill when building interfaces that must work across all device sizes. This includes mobile-first table designs that gracefully degrade on small screens, navigation patterns that collapse into drawers on mobile, card grids that adapt to viewport width, and touch-friendly interfaces with appropriate target sizing.

### Customizing Themes for Brand Identity

Invoke when integrating brand colors, typography, and design language into daisyUI's theme system. This includes creating custom theme configurations, implementing dynamic theme switching, ensuring brand colors meet accessibility standards, and maintaining consistency across light and dark modes.

### Ensuring Accessibility Compliance

Critical for projects requiring WCAG compliance or universal design. This skill provides accessibility auditing guidance, ARIA implementation patterns, keyboard navigation strategies, screen reader testing approaches, and remediation techniques for common accessibility issues.

### Creating Interactive Forms

Essential when building forms for data collection, user registration, search interfaces, or configuration panels. This skill covers validation patterns, error display strategies, multi-step form flows, file upload components, and user feedback mechanisms that guide users through successful form completion.

## daisyUI Component Architecture

### Component Categories and Organization

daisyUI organizes components into four primary categories that align with common UI development patterns:

**Actions**: Interactive elements that trigger behavior including buttons (btn, btn-primary, btn-secondary, btn-outline, btn-ghost), dropdowns (dropdown, dropdown-hover, dropdown-end), modals (modal, modal-open, modal-bottom), and swaps (swap, swap-rotate, swap-flip). These components handle user input and state changes.

**Data Display**: Components for presenting information including cards (card, card-body, card-title, card-actions), tables (table, table-zebra, table-pin-rows), badges (badge, badge-primary, badge-outline), stats (stat, stat-title, stat-value), and avatars (avatar, avatar-group). These components structure content for optimal readability.

**Navigation**: Elements for moving through interfaces including navbar (navbar, navbar-start, navbar-center, navbar-end), drawer (drawer, drawer-toggle, drawer-side), menu (menu, menu-horizontal, menu-vertical), breadcrumbs (breadcrumbs), tabs (tabs, tab-active), and pagination (join, btn-group). These components create intuitive navigation hierarchies.

**Feedback**: Components for communicating state including alerts (alert, alert-success, alert-error), progress bars (progress, radial-progress), loading spinners (loading, loading-spinner), tooltips (tooltip, tooltip-open), and toasts (toast, toast-top, toast-end). These components provide real-time user feedback.

### Modifier Classes and Variants

daisyUI uses a consistent modifier system across components. **Size variants** follow the pattern: component-xs, component-sm, component-md (default), component-lg, component-xl. Example: btn-xs, btn-sm, btn-lg.

**Color schemes** apply semantic colors: component-primary, component-secondary, component-accent, component-neutral, component-info, component-success, component-warning, component-error. Example: alert-success, badge-error, btn-primary.

**Style variants** modify appearance: component-outline (border only), component-ghost (transparent until hover), component-link (styled as link), component-glass (glassmorphism effect). Example: btn-outline, btn-ghost, card-glass.

**State modifiers** control component state: component-active, component-disabled, component-loading. Example: btn-active, btn-disabled, btn-loading.

### Component Composition and Nesting

Complex interfaces are built through component composition. A card can contain a badge in the corner, a title, description text, and a button group in card-actions. A table can have each cell contain a badge, avatar, and text stack. A modal can contain a form with multiple input groups and a button group for actions.

```html
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <div class="badge badge-secondary absolute top-4 right-4">New</div>
    <h2 class="card-title">Composed Card</h2>
    <p>This card demonstrates component composition.</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary btn-sm">View</button>
      <button class="btn btn-ghost btn-sm">Edit</button>
    </div>
  </div>
</div>
```

### State Management Patterns

daisyUI components use class-based state management. Toggle states use the :checked pseudo-class with hidden checkboxes. Example: drawer-toggle input controls drawer-side visibility. Modal state is controlled by modal-open class or modal-toggle checkbox pattern.

Loading states are indicated by btn-loading class which adds a spinner and disables interaction. Disabled states use disabled attribute on form elements or btn-disabled class for non-form elements. Active states for navigation use tab-active, menu-active, or btn-active classes.

Form validation states use color-coded inputs: input-success (green border), input-error (red border), input-warning (yellow border), each typically paired with a helper text div using matching alert colors.

## Key Components for Email Checker

### Tables: Email List Display

Tables are the primary component for displaying email lists with sortable columns, row selection, and status indicators. Use the table component with responsive wrappers and zebra striping for readability.

```html
<div class="overflow-x-auto">
  <table class="table table-zebra">
    <thead>
      <tr>
        <th><input type="checkbox" class="checkbox" /></th>
        <th>Email <button class="btn btn-ghost btn-xs">↑</button></th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><input type="checkbox" class="checkbox" /></td>
        <td>user@example.com</td>
        <td><span class="badge badge-success">Clean</span></td>
        <td>
          <div class="dropdown dropdown-end">
            <button class="btn btn-ghost btn-xs">⋮</button>
            <ul class="dropdown-content menu">
              <li><a>View Details</a></li>
              <li><a>Block</a></li>
            </ul>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

For mobile responsiveness, wrap tables in overflow-x-auto for horizontal scrolling, or use card-based layouts on small screens with conditional rendering based on breakpoints.

### Cards: List Item Containers

Cards display individual email list metadata, processing status, and action buttons. Use card-compact for dense layouts and card-bordered for visual separation.

```html
<div class="card bg-base-100 shadow-md border border-base-300">
  <div class="card-body">
    <div class="flex justify-between items-start">
      <h3 class="card-title text-base">Italy_Contacts.txt</h3>
      <div class="badge badge-info">Processing</div>
    </div>
    <div class="text-sm text-base-content/70">
      <p>5,234 emails • Last updated: Oct 28, 2025</p>
      <p>Clean: 4,890 • Blocked: 344</p>
    </div>
    <div class="card-actions justify-end mt-2">
      <button class="btn btn-primary btn-sm">View Report</button>
      <button class="btn btn-ghost btn-sm">Export</button>
    </div>
  </div>
</div>
```

### Buttons: Action Controls

Buttons trigger processing, exports, and navigation. Use semantic color schemes and loading states for async operations.

```html
<!-- Primary action with loading state -->
<button class="btn btn-primary" id="processBtn">
  <svg class="hidden" id="spinner"><!-- spinner icon --></svg>
  Process Lists
</button>

<!-- Button group for related actions -->
<div class="join">
  <button class="join-item btn">Export TXT</button>
  <button class="join-item btn">Export CSV</button>
  <button class="join-item btn">Export JSON</button>
</div>

<!-- Icon button for compact actions -->
<button class="btn btn-square btn-ghost">
  <svg class="w-5 h-5"><!-- icon --></svg>
</button>
```

### Forms: Input and Validation

Forms collect email lists, configure processing options, and manage filters. Use form-control wrapper for consistent spacing and validation display.

```html
<div class="form-control">
  <label class="label">
    <span class="label-text">Upload Email List</span>
  </label>
  <input type="file" class="file-input file-input-bordered w-full"
         accept=".txt,.lvp" />
  <label class="label">
    <span class="label-text-alt text-error hidden" id="fileError">
      Please select a valid file (.txt or .lvp)
    </span>
  </label>
</div>

<div class="form-control">
  <label class="label cursor-pointer">
    <span class="label-text">Exclude Duplicates</span>
    <input type="checkbox" class="toggle toggle-primary" checked />
  </label>
</div>
```

### Modals: Dialogs and Detail Views

Modals display processing results, confirmation dialogs, and detailed email metadata. Use modal-backdrop for background dimming and modal-action for button groups.

```html
<dialog id="confirmModal" class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Confirm Processing</h3>
    <p class="py-4">Process 5,234 emails? This may take a few minutes.</p>
    <div class="modal-action">
      <button class="btn btn-ghost">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
```

### Alerts: Status Feedback

Alerts communicate processing status, errors, and success messages. Use role="alert" and aria-live="polite" for screen reader announcements.

```html
<div class="alert alert-success" role="alert">
  <svg class="stroke-current shrink-0 w-6 h-6"><!-- check icon --></svg>
  <span>Processing completed! 4,890 clean emails found.</span>
</div>

<div class="alert alert-error" role="alert">
  <svg class="stroke-current shrink-0 w-6 h-6"><!-- error icon --></svg>
  <div>
    <h3 class="font-bold">Processing Failed</h3>
    <div class="text-sm">Invalid file format. Please upload .txt or .lvp files.</div>
  </div>
</div>
```

### Badges: Status Indicators

Badges show email status (clean, blocked, invalid), priority levels, and counts. Use badge-outline for subtle indicators.

```html
<span class="badge badge-success badge-sm">Clean</span>
<span class="badge badge-error badge-sm">Blocked</span>
<span class="badge badge-warning badge-sm">Invalid</span>
<span class="badge badge-info badge-outline">5,234</span>
```

### Dropdowns: Action Menus

Dropdowns provide context menus for row actions, filter options, and bulk operations. Use dropdown-end to align right, dropdown-hover for hover trigger.

```html
<div class="dropdown dropdown-end">
  <button tabindex="0" class="btn btn-ghost btn-sm">
    Actions ▾
  </button>
  <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
    <li><a><svg><!-- icon --></svg> View Details</a></li>
    <li><a><svg><!-- icon --></svg> Export Clean</a></li>
    <li><a><svg><!-- icon --></svg> Export Blocked</a></li>
    <li class="border-t"><a class="text-error"><svg><!-- icon --></svg> Delete</a></li>
  </ul>
</div>
```

## Responsive Design Patterns

### Mobile-First Approach

daisyUI and Tailwind CSS follow mobile-first design principles. Base styles apply to all screen sizes, with breakpoint prefixes adding styles at larger viewports. This ensures optimal performance on mobile devices and progressive enhancement for larger screens.

Start with mobile layout using single-column layouts, stacked cards, full-width buttons, and simplified navigation. Then add tablet and desktop enhancements using breakpoint prefixes: sm: (640px), md: (768px), lg: (1024px), xl: (1280px), 2xl: (1536px).

```html
<!-- Mobile: stacked, Desktop: side-by-side -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="card"><!-- content --></div>
  <div class="card"><!-- content --></div>
  <div class="card"><!-- content --></div>
</div>
```

### Breakpoint System Implementation

Use breakpoint prefixes consistently across components. For buttons: btn-sm on mobile, btn-md on tablet, btn-lg on desktop. For typography: text-sm base, md:text-base, lg:text-lg. For spacing: p-4 base, md:p-6, lg:p-8.

Example responsive card grid that adapts from 1 column (mobile) to 2 columns (tablet) to 4 columns (desktop):

```html
<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-4">
  <!-- Cards automatically reflow based on screen size -->
</div>
```

### Responsive Tables

Tables present challenges on mobile due to horizontal content. Implement three strategies: **horizontal scroll** (simplest, wrap table in overflow-x-auto div), **stacked layout** (hide table on mobile, show card-based layout), **column priority** (hide less important columns on mobile using hidden sm:table-cell).

```html
<!-- Horizontal scroll approach -->
<div class="overflow-x-auto">
  <table class="table"><!-- table content --></table>
</div>

<!-- Column priority approach -->
<table class="table">
  <thead>
    <tr>
      <th>Email</th>
      <th class="hidden md:table-cell">Status</th>
      <th class="hidden lg:table-cell">Date</th>
      <th>Actions</th>
    </tr>
  </thead>
</table>
```

### Navigation Collapse Patterns

Use daisyUI drawer component for mobile navigation that collapses into a hamburger menu. The drawer-toggle checkbox controls visibility, drawer-side contains the navigation menu, and drawer-content contains the main page content.

```html
<div class="drawer lg:drawer-open">
  <input id="nav-drawer" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content">
    <!-- Navbar with hamburger on mobile -->
    <div class="navbar lg:hidden">
      <label for="nav-drawer" class="btn btn-square btn-ghost">
        <svg><!-- hamburger icon --></svg>
      </label>
    </div>
    <!-- Main content -->
  </div>
  <div class="drawer-side">
    <label for="nav-drawer" class="drawer-overlay"></label>
    <ul class="menu w-80 min-h-full bg-base-200">
      <!-- Navigation items -->
    </ul>
  </div>
</div>
```

### Touch-Friendly Targets

Ensure interactive elements meet minimum touch target size of 44x44 pixels on mobile. daisyUI buttons default to appropriate sizes, but custom interactive elements need explicit sizing.

```html
<!-- Touch-friendly checkbox -->
<input type="checkbox" class="checkbox w-5 h-5 sm:w-4 sm:h-4" />

<!-- Touch-friendly icon button -->
<button class="btn btn-square btn-ghost min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0">
  <svg class="w-6 h-6"><!-- icon --></svg>
</button>
```

### Responsive Typography

Use Tailwind's responsive text utilities for optimal readability across devices. Smaller base text on mobile conserves space, larger text on desktop improves readability.

```html
<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Email List Manager
</h1>
<p class="text-sm sm:text-base lg:text-lg">
  Process and validate your email lists with ease.
</p>
```

## Theme Customization

### Built-in Themes

daisyUI includes 30+ built-in themes covering light and dark variants with different color schemes. Popular themes: light (default), dark, cupcake (pink), bumblebee (yellow), emerald (green), corporate (professional gray), synthwave (cyberpunk), retro (vintage), cyberpunk (neon), valentine (pink/red), halloween (orange), garden (green), forest (dark green), aqua (blue), lofi (minimal), pastel (soft colors), fantasy (purple), wireframe (minimal), black (dark), luxury (gold), dracula (dark purple), cmyk (print), autumn (warm), business (professional), acid (bright), lemonade (yellow), night (dark blue), coffee (brown), winter (cool blue).

Apply themes using data-theme attribute on html or parent element:

```html
<html data-theme="dark">
<!-- All components use dark theme -->
</html>

<div data-theme="cupcake">
  <!-- Components in this div use cupcake theme -->
</div>
```

### Custom Theme Creation

Create custom themes in tailwind.config.js using daisyUI's theme configuration. Define color variables for primary, secondary, accent, neutral, and semantic colors (info, success, warning, error), plus base colors for backgrounds and text.

```javascript
module.exports = {
  daisyui: {
    themes: [
      {
        emailchecker: {
          "primary": "#3b82f6",      // Blue
          "secondary": "#8b5cf6",    // Purple
          "accent": "#06b6d4",       // Cyan
          "neutral": "#1f2937",      // Dark gray
          "base-100": "#ffffff",     // White background
          "base-200": "#f3f4f6",     // Light gray
          "base-300": "#e5e7eb",     // Medium gray
          "info": "#3b82f6",         // Blue
          "success": "#10b981",      // Green
          "warning": "#f59e0b",      // Orange
          "error": "#ef4444",        // Red
        },
      },
    ],
  },
}
```

### CSS Variable Approach

daisyUI themes use CSS variables for dynamic theming. Access theme colors using utilities like bg-primary, text-secondary, or directly with CSS variables: var(--p) for primary, var(--s) for secondary, var(--b1) for base-100.

Create theme variants by overriding variables:

```css
[data-theme="emailchecker-dark"] {
  --p: 59 130 246;      /* primary (oklch format) */
  --s: 139 92 246;      /* secondary */
  --b1: 31 41 55;       /* base-100 (dark background) */
  --bc: 243 244 246;    /* base-content (light text) */
}
```

### Theme Switcher Implementation

Implement dynamic theme switching using JavaScript to toggle data-theme attribute and persist selection in localStorage.

```javascript
// Theme switcher function
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// Load theme on page load
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

// Theme toggle button
document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
});
```

### Brand Color Integration

Integrate brand colors while maintaining accessibility. Ensure primary brand color meets WCAG contrast ratios (4.5:1 for normal text, 3:1 for large text). Use tools like WebAIM Contrast Checker to validate.

Map brand colors to daisyUI semantic colors: primary for main brand color, secondary for complementary color, accent for call-to-action highlights. Use neutral for text and borders to maintain readability.

### Dark Mode Considerations

When implementing dark mode themes, adjust not just colors but also shadow intensities (lighter in dark mode), border contrasts (less contrast in dark mode), and image handling (consider CSS filters for brightness adjustment).

Test dark themes for: color contrast compliance, shadow visibility, focus indicators, and form input readability. Ensure form inputs have sufficient background contrast against the dark base color.

## Accessibility Best Practices

### ARIA Labels and Roles

Implement ARIA attributes to communicate component purpose and state to assistive technologies. Use role attribute to define element semantics when HTML semantics are insufficient.

**Common ARIA roles**: button (for clickable divs), dialog (for modals), menuitem (for dropdown items), tab/tabpanel (for tabbed interfaces), alert (for notifications), status (for live updates), search (for search forms).

**ARIA labels**: aria-label provides accessible name when visible text is insufficient. aria-labelledby references visible text element(s) by ID. aria-describedby provides additional context or instructions.

```html
<!-- Button with accessible label -->
<button class="btn btn-square" aria-label="Close dialog">
  <svg><!-- X icon --></svg>
</button>

<!-- Input with description -->
<input type="text" class="input"
       aria-label="Email address"
       aria-describedby="email-help" />
<p id="email-help" class="text-sm">Enter one email per line</p>

<!-- Modal with role and label -->
<dialog class="modal" role="dialog" aria-labelledby="modal-title">
  <div class="modal-box">
    <h3 id="modal-title">Confirm Action</h3>
  </div>
</dialog>
```

### Keyboard Navigation Patterns

Implement full keyboard accessibility following standard patterns. **Tab/Shift+Tab**: Navigate between focusable elements. **Enter/Space**: Activate buttons and controls. **Escape**: Close modals, dropdowns, and dialogs. **Arrow keys**: Navigate within menus, tabs, and lists.

Ensure custom interactive elements (divs with click handlers) have tabindex="0" to receive keyboard focus and keyboard event handlers for Enter/Space activation.

```javascript
// Make custom clickable div keyboard accessible
const customButton = document.getElementById('customButton');
customButton.setAttribute('tabindex', '0');
customButton.setAttribute('role', 'button');
customButton.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    customButton.click();
  }
});
```

### Focus Management

Maintain visible focus indicators for keyboard users. daisyUI components include focus styles, but custom styles need explicit focus-visible classes.

```html
<!-- Custom focus styles -->
<button class="btn focus:outline-primary focus:outline-offset-2">
  Custom Focus
</button>

<!-- Focus within groups -->
<div class="menu focus-within:ring-2 focus-within:ring-primary">
  <!-- Menu items -->
</div>
```

When opening modals, move focus to the first focusable element inside. When closing, return focus to the element that triggered the modal. Trap focus within modals to prevent keyboard navigation outside the dialog.

```javascript
// Focus trap for modal
const modal = document.getElementById('modal');
const focusableElements = modal.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
const firstElement = focusableElements[0];
const lastElement = focusableElements[focusableElements.length - 1];

modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
});
```

### Screen Reader Support

Use semantic HTML as foundation: nav for navigation, main for main content, article for articles, aside for sidebars. Add landmark roles when semantic HTML is insufficient: role="search", role="banner", role="contentinfo".

Implement ARIA live regions for dynamic content updates. Use aria-live="polite" for non-urgent updates (success messages), aria-live="assertive" for urgent updates (errors).

```html
<!-- Status updates for screen readers -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
  <span id="processingStatus"></span>
</div>

<script>
// Update status for screen readers
function updateStatus(message) {
  document.getElementById('processingStatus').textContent = message;
}
</script>
```

Provide skip links to bypass repetitive navigation:

```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 btn btn-primary">
  Skip to main content
</a>
<main id="main-content"><!-- content --></main>
```

### Color Contrast Compliance

Ensure all text meets WCAG AA standards: normal text (under 18pt) requires 4.5:1 contrast ratio, large text (18pt+ or 14pt+ bold) requires 3:1 ratio. UI components (buttons, form borders) require 3:1 contrast against adjacent colors.

Test contrast using browser DevTools or online tools (WebAIM Contrast Checker, Colour Contrast Analyser). Don't rely on color alone to convey information—use text labels, icons, or patterns in addition to color.

```html
<!-- Good: Status indicated by icon + color + text -->
<span class="badge badge-success">
  <svg><!-- check icon --></svg>
  Clean
</span>

<!-- Bad: Color only -->
<span class="badge badge-success"></span>
```

### Error Announcement Patterns

When validation errors occur, announce them to screen readers using ARIA live regions and associate error messages with form fields using aria-describedby.

```html
<div class="form-control">
  <label class="label">
    <span class="label-text">Email Address</span>
  </label>
  <input type="email" class="input input-bordered"
         aria-invalid="true"
         aria-describedby="email-error" />
  <label class="label">
    <span id="email-error" class="label-text-alt text-error" role="alert">
      Please enter a valid email address
    </span>
  </label>
</div>
```

Provide helpful error messages that explain how to fix the issue, not just that an error occurred. Example: "Please enter a valid email address (e.g., user@example.com)" instead of "Invalid input".

## Resources

### References Directory

The `references/` directory contains six comprehensive markdown guides that provide deep-dive documentation for specific aspects of daisyUI development:

**daisyui-components-reference.md** - Complete catalog of all daisyUI components with usage examples, modifier classes, and composition patterns. Organized by component category with code examples for buttons, cards, tables, modals, forms, badges, alerts, and dropdowns.

**responsive-design-guide.md** - Comprehensive guide to mobile-first responsive design using Tailwind breakpoints. Covers responsive table techniques, navigation patterns, grid and flexbox layouts, touch target sizing, and responsive typography strategies.

**theme-customization-guide.md** - Deep dive into daisyUI's theme system including built-in themes, custom theme creation in tailwind.config.js, dynamic theme switching with JavaScript, CSS variable architecture, and brand identity integration.

**accessibility-checklist.md** - Complete accessibility implementation guide covering ARIA roles, labels, and descriptions, keyboard navigation requirements, focus management patterns, screen reader testing, WCAG compliance checklist, and common accessibility mistakes to avoid.

**form-patterns.md** - Comprehensive form development guide including input validation patterns, error display techniques, multi-step forms, file upload components with drag-and-drop, checkbox/radio groups, and form state management without frameworks.

**email-checker-ui-patterns.md** - Specialized patterns for email list management interfaces including list/table hybrid views, bulk action patterns, status indicator designs, filter sidebars, processing progress displays, and real-time update UI patterns.

### Assets Directory

The `assets/` directory contains five production-ready HTML template files that demonstrate complete implementation patterns. Each template is fully functional with all necessary HTML, daisyUI classes, and vanilla JavaScript.

**table-component-template.html** - Complete responsive table implementation with sortable columns, row selection checkboxes, status badges, action dropdowns, pagination controls, and responsive horizontal scroll on mobile.

**modal-component-template.html** - Multiple modal patterns including confirmation dialogs with Yes/No buttons, detail view modals for displaying item information, and form modals with input validation. Includes proper backdrop handling and close button functionality.

**form-validation-template.html** - Full form with client-side validation including text inputs, email inputs, file uploads, and checkboxes. Demonstrates inline error messages, submit button with loading state, and complete JavaScript validation logic.

**theme-switcher-template.html** - Complete theme toggle component using daisyUI dropdown with theme list, JavaScript for dynamic theme switching, localStorage persistence, and icons for visual theme representation.

**responsive-layout-template.html** - Complete page layout structure with daisyUI drawer for mobile sidebar navigation, navbar for desktop, main content area with proper spacing, footer, and responsive breakpoint implementation.

These resources provide both theoretical knowledge and practical implementation examples for building production-ready interfaces with daisyUI. Reference the markdown guides for understanding patterns and principles, then use the asset templates as starting points for your own implementations.
