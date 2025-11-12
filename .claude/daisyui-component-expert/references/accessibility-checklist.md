# Accessibility Checklist

This comprehensive guide ensures your daisyUI interfaces meet WCAG 2.1 Level AA standards and provide excellent experiences for all users.

## ARIA Implementation Guide

### ARIA Roles

Roles define what an element is and how it should be treated by assistive technologies.

**Common Roles:**

```html
<!-- Buttons (when not using <button>) -->
<div role="button" tabindex="0">Clickable div</div>

<!-- Dialogs and modals -->
<div role="dialog" aria-labelledby="dialogTitle" aria-modal="true">
  <h2 id="dialogTitle">Confirmation</h2>
</div>

<!-- Alerts and notifications -->
<div role="alert" aria-live="assertive">
  Error: Please fix the following issues
</div>

<!-- Status updates -->
<div role="status" aria-live="polite">
  Processing complete
</div>

<!-- Navigation -->
<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    <li role="none"><a role="menuitem">Home</a></li>
  </ul>
</nav>

<!-- Tabs -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel2">Tab 2</button>
</div>
<div role="tabpanel" id="panel1">Content 1</div>

<!-- Search -->
<div role="search">
  <input type="search" aria-label="Search emails" />
</div>
```

### ARIA Labels

Labels provide accessible names for elements.

**aria-label:**
```html
<!-- Icon-only buttons -->
<button class="btn btn-circle" aria-label="Close modal">
  <svg><path d="..."/></svg>
</button>

<!-- Input without visible label -->
<input type="search" class="input" aria-label="Search email lists" />

<!-- Action buttons with icons -->
<button class="btn" aria-label="Download as CSV">
  <svg><path d="..."/></svg>
</button>
```

**aria-labelledby:**
```html
<!-- Reference existing text as label -->
<dialog role="dialog" aria-labelledby="modalTitle">
  <h3 id="modalTitle">Confirm Deletion</h3>
  <p>Are you sure?</p>
</dialog>

<!-- Multiple labels -->
<div aria-labelledby="title subtitle">
  <h2 id="title">Email List</h2>
  <p id="subtitle">Italy Contacts</p>
</div>
```

**aria-describedby:**
```html
<!-- Input with help text -->
<input type="email" 
       class="input input-bordered"
       aria-describedby="emailHelp" />
<p id="emailHelp" class="text-sm">Enter one email per line</p>

<!-- Button with additional context -->
<button class="btn btn-error" 
        aria-describedby="deleteWarning">
  Delete List
</button>
<p id="deleteWarning" class="sr-only">
  This action cannot be undone
</p>
```

### ARIA States and Properties

**aria-expanded:**
```html
<!-- Dropdown/accordion state -->
<button aria-expanded="false" aria-controls="dropdown-menu">
  Options
</button>
<div id="dropdown-menu" hidden>Menu items</div>

<script>
button.addEventListener('click', () => {
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', !expanded);
  menu.hidden = expanded;
});
</script>
```

**aria-pressed:**
```html
<!-- Toggle button -->
<button class="btn" aria-pressed="false">
  Subscribe
</button>
```

**aria-checked:**
```html
<!-- Custom checkbox -->
<div role="checkbox" aria-checked="false" tabindex="0">
  Accept terms
</div>
```

**aria-invalid:**
```html
<!-- Form validation -->
<input type="email" 
       class="input input-bordered input-error"
       aria-invalid="true"
       aria-describedby="emailError" />
<span id="emailError" class="text-error">Invalid email format</span>
```

**aria-required:**
```html
<!-- Required field -->
<input type="text" 
       class="input input-bordered"
       aria-required="true" />
```

**aria-disabled:**
```html
<!-- Disabled state (when can't use disabled attribute) -->
<div class="btn btn-disabled" aria-disabled="true">
  Disabled Action
</div>
```

---

## Keyboard Navigation Requirements

### Tab Order

Ensure logical tab order through focusable elements:

```html
<!-- Good: Logical flow -->
<nav>
  <a href="#" tabindex="0">Home</a>
  <a href="#" tabindex="0">Lists</a>
  <a href="#" tabindex="0">Settings</a>
</nav>
<main>
  <button class="btn">Action</button>
</main>

<!-- Bad: Broken flow with positive tabindex -->
<button tabindex="3">Third</button>
<button tabindex="1">First</button>
<button tabindex="2">Second</button>

<!-- Use tabindex="-1" to remove from tab order -->
<button tabindex="-1">Not keyboard accessible</button>
```

### Keyboard Shortcuts

**Standard patterns:**
- **Tab / Shift+Tab**: Navigate forward/backward
- **Enter / Space**: Activate buttons and controls
- **Escape**: Close modals, dropdowns, dialogs
- **Arrow keys**: Navigate within menus, tabs, lists
- **Home / End**: Jump to first/last item
- **Page Up / Page Down**: Scroll or navigate pages

**Implementation:**

```javascript
// Modal keyboard handling
const modal = document.getElementById('modal');

modal.addEventListener('keydown', (e) => {
  // Close on Escape
  if (e.key === 'Escape') {
    closeModal();
  }
});

// Dropdown keyboard handling
const dropdown = document.getElementById('dropdown');
const items = dropdown.querySelectorAll('[role="menuitem"]');

dropdown.addEventListener('keydown', (e) => {
  const currentIndex = Array.from(items).indexOf(document.activeElement);
  
  switch(e.key) {
    case 'ArrowDown':
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex].focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex].focus();
      break;
    case 'Escape':
      closeDropdown();
      break;
  }
});

// Make custom clickable elements keyboard accessible
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

---

## Focus Management

### Visible Focus Indicators

Always provide visible focus indicators:

```html
<!-- Good: Visible focus -->
<button class="btn focus:ring-2 focus:ring-primary focus:ring-offset-2">
  Action
</button>

<!-- Using Tailwind focus-visible (better UX) -->
<button class="btn focus-visible:ring-2 focus-visible:ring-primary">
  Action
</button>

<!-- Custom focus styles -->
<style>
.btn:focus-visible {
  outline: 2px solid hsl(var(--p));
  outline-offset: 2px;
}
</style>
```

### Focus Trapping (Modals)

Keep focus within modal dialogs:

```javascript
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) { // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else { // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });
  
  // Focus first element when modal opens
  firstFocusable.focus();
}

// Usage
const modal = document.getElementById('modal');
modal.addEventListener('open', () => trapFocus(modal));
```

### Focus Management on Route Changes

Return focus appropriately:

```javascript
// Store previous focus
let previousFocus;

function openModal() {
  previousFocus = document.activeElement;
  modal.showModal();
  trapFocus(modal);
}

function closeModal() {
  modal.close();
  // Return focus to trigger element
  if (previousFocus) {
    previousFocus.focus();
  }
}
```

---

## Screen Reader Support

### Semantic HTML

Use semantic HTML as foundation:

```html
<!-- Good: Semantic structure -->
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Email Lists</h1>
    <section>
      <h2>Active Lists</h2>
    </section>
  </article>
</main>
<footer>
  <p>&copy; 2025</p>
</footer>

<!-- Bad: Div soup -->
<div class="header">
  <div class="nav">
    <div class="link">Home</div>
  </div>
</div>
```

### ARIA Live Regions

Announce dynamic content changes:

```html
<!-- Status updates -->
<div role="status" aria-live="polite" aria-atomic="true">
  <span id="statusMessage"></span>
</div>

<!-- Error announcements -->
<div role="alert" aria-live="assertive" aria-atomic="true">
  <span id="errorMessage"></span>
</div>

<script>
// Announce status change
function updateStatus(message) {
  document.getElementById('statusMessage').textContent = message;
}

// Announce error
function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  
  // Clear after announcement
  setTimeout(() => {
    document.getElementById('errorMessage').textContent = '';
  }, 5000);
}
</script>
```

**aria-live values:**
- `off`: No announcement (default)
- `polite`: Announce when screen reader is idle
- `assertive`: Interrupt and announce immediately

### Screen Reader Only Content

Provide additional context for screen readers:

```html
<!-- Tailwind sr-only class -->
<span class="sr-only">Screen reader only text</span>

<!-- Custom sr-only -->
<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
</style>

<!-- Skip links -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 btn btn-primary">
  Skip to main content
</a>

<main id="main-content">
  <!-- Content -->
</main>
```

### Descriptive Link Text

```html
<!-- Bad: Non-descriptive -->
<a href="report.html">Click here</a>
<a href="details.html">Read more</a>

<!-- Good: Descriptive -->
<a href="report.html">View October 2025 Email Report</a>
<a href="details.html">Read more about email validation</a>

<!-- Icon links with label -->
<a href="delete.html" aria-label="Delete Italy Contacts list">
  <svg><path d="..."/></svg>
</a>
```

---

## Color Contrast Compliance

### WCAG Requirements

**Level AA (Minimum):**
- Normal text (< 18pt): 4.5:1 contrast ratio
- Large text (18pt+ or 14pt+ bold): 3:1 contrast ratio
- UI components and graphics: 3:1 contrast ratio

### Testing Tools

- WebAIM Contrast Checker
- Chrome DevTools (Lighthouse)
- WAVE Browser Extension
- Accessible Colors

### Implementation

```html
<!-- Good: Sufficient contrast -->
<div class="bg-primary text-primary-content">
  Text with good contrast (checked: 4.8:1)
</div>

<!-- Bad: Insufficient contrast -->
<div class="bg-gray-200 text-gray-400">
  Low contrast text (2.1:1) ❌
</div>

<!-- Use daisyUI color pairings -->
<div class="bg-success text-success-content">Success message</div>
<div class="bg-error text-error-content">Error message</div>
```

### Don't Rely on Color Alone

```html
<!-- Bad: Color only -->
<span class="text-success">Available</span>
<span class="text-error">Unavailable</span>

<!-- Good: Color + text/icon -->
<span class="badge badge-success">
  <svg><path d="...check"/></svg>
  Available
</span>
<span class="badge badge-error">
  <svg><path d="...x"/></svg>
  Unavailable
</span>
```

---

## Form Accessibility

### Labels and Inputs

```html
<!-- Always associate labels -->
<label class="label">
  <span class="label-text">Email Address</span>
</label>
<input type="email" class="input input-bordered" id="email" name="email" />

<!-- Or wrap input -->
<label class="label cursor-pointer">
  <span class="label-text">Remember me</span>
  <input type="checkbox" class="checkbox" />
</label>
```

### Required Fields

```html
<label class="label">
  <span class="label-text">
    Email Address
    <span class="text-error" aria-label="required">*</span>
  </span>
</label>
<input type="email" 
       class="input input-bordered" 
       required
       aria-required="true" />
```

### Error Messages

```html
<div class="form-control">
  <label class="label">
    <span class="label-text">Email Address</span>
  </label>
  <input type="email" 
         class="input input-bordered input-error"
         aria-invalid="true"
         aria-describedby="emailError" />
  <label class="label">
    <span id="emailError" class="label-text-alt text-error" role="alert">
      Please enter a valid email address (e.g., user@example.com)
    </span>
  </label>
</div>
```

### Fieldsets and Legends

```html
<fieldset class="border border-base-300 rounded-lg p-4">
  <legend class="text-lg font-semibold px-2">Processing Options</legend>
  <label class="label cursor-pointer">
    <span class="label-text">Exclude Duplicates</span>
    <input type="checkbox" class="checkbox" />
  </label>
  <label class="label cursor-pointer">
    <span class="label-text">Generate Report</span>
    <input type="checkbox" class="checkbox" />
  </label>
</fieldset>
```

---

## Common Accessibility Mistakes

### 1. Missing Alt Text

```html
<!-- Bad -->
<img src="chart.png" />

<!-- Good -->
<img src="chart.png" alt="Email validation statistics showing 80% clean rate" />

<!-- Decorative images -->
<img src="decoration.png" alt="" role="presentation" />
```

### 2. Non-Accessible Custom Controls

```html
<!-- Bad: Div as button without accessibility -->
<div class="btn" onclick="submit()">Submit</div>

<!-- Good: Proper button -->
<button class="btn" onclick="submit()">Submit</button>

<!-- Good: Accessible div -->
<div class="btn" 
     role="button" 
     tabindex="0" 
     onclick="submit()"
     onkeydown="if(event.key==='Enter'||event.key===' ')submit()">
  Submit
</div>
```

### 3. Missing Form Labels

```html
<!-- Bad: Placeholder as label -->
<input type="text" class="input" placeholder="Email" />

<!-- Good: Proper label -->
<label class="label">
  <span class="label-text">Email</span>
</label>
<input type="text" class="input" placeholder="user@example.com" />
```

### 4. Insufficient Color Contrast

Always test contrast ratios. Use browser DevTools or online checkers.

### 5. Keyboard Trap

```html
<!-- Bad: Can't escape modal with keyboard -->
<dialog class="modal">
  <div class="modal-box">
    <p>Trapped!</p>
  </div>
</dialog>

<!-- Good: Escape key closes modal -->
<dialog class="modal" id="myModal">
  <div class="modal-box">
    <p>Content</p>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
```

### 6. Auto-Playing Media

```html
<!-- Bad: Auto-play video -->
<video autoplay src="video.mp4"></video>

<!-- Good: User-controlled -->
<video controls src="video.mp4"></video>
```

---

## Accessibility Testing Checklist

### Automated Testing

- [ ] Run Lighthouse audit (Chrome DevTools)
- [ ] Use WAVE browser extension
- [ ] Check with axe DevTools
- [ ] Validate HTML (W3C Validator)

### Manual Testing

- [ ] Navigate entire site using only keyboard (Tab, Enter, Escape, Arrows)
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Zoom to 200% and verify layout doesn't break
- [ ] Test with browser extensions disabled
- [ ] Check color contrast for all text
- [ ] Verify form validation messages are announced
- [ ] Test with reduced motion preference enabled

### Screen Reader Testing

```css
/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Quick Reference

**Must-Have Attributes:**
- `alt` on images
- `aria-label` or `aria-labelledby` on icon buttons
- `role` on custom interactive elements
- `tabindex="0"` on keyboard-accessible custom elements
- `aria-describedby` for inputs with help text
- `aria-invalid` and `aria-describedby` for form errors
- `aria-live` for dynamic content updates

**Keyboard Support:**
- All interactive elements reachable via Tab
- Enter/Space activates buttons
- Escape closes modals and dropdowns
- Arrow keys navigate menus and lists

**Visual Indicators:**
- Visible focus indicators on all interactive elements
- Don't rely on color alone
- Maintain 4.5:1 contrast for text
- Maintain 3:1 contrast for UI components

By following this checklist, your daisyUI interfaces will be accessible to all users, regardless of how they interact with your application.
