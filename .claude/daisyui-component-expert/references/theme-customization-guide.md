# Theme Customization Guide

This guide covers daisyUI's powerful theme system, from using built-in themes to creating custom themes and implementing dynamic theme switching.

## Built-in Themes Overview

daisyUI includes 30+ professionally designed themes. Popular themes include:

**Light Themes:**
- `light` - Default light theme
- `cupcake` - Soft pink tones
- `bumblebee` - Warm yellow and black
- `emerald` - Fresh green
- `corporate` - Professional gray and blue
- `retro` - Vintage warm tones
- `cyberpunk` - Bright neon yellow
- `valentine` - Romantic pink and red
- `garden` - Natural green
- `aqua` - Ocean blue
- `lofi` - Minimal gray
- `pastel` - Soft multicolor
- `fantasy` - Purple and pink
- `wireframe` - Ultra minimal
- `cmyk` - Print colors
- `autumn` - Warm earth tones
- `business` - Professional blue-gray
- `acid` - Bright lime green
- `lemonade` - Soft yellow
- `winter` - Cool blue tones

**Dark Themes:**
- `dark` - Default dark theme
- `synthwave` - Retro 80s
- `halloween` - Orange and purple
- `forest` - Deep green
- `black` - Pure black background
- `luxury` - Gold and dark
- `dracula` - Purple-gray
- `night` - Deep blue
- `coffee` - Warm brown

## Using Built-in Themes

### HTML Attribute Method

Apply theme to entire document:

```html
<html data-theme="dark">
  <body>
    <!-- All components use dark theme -->
  </body>
</html>
```

### Scoped Themes

Apply theme to specific sections:

```html
<body data-theme="light">
  <header data-theme="dark">
    <!-- Header uses dark theme -->
  </header>
  <main>
    <!-- Main content uses light theme -->
  </main>
</body>
```

### Enable Multiple Themes in Config

In `tailwind.config.js`:

```javascript
module.exports = {
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark", "cupcake", "synthwave"], // Enable specific themes
    // or
    themes: true, // Enable all themes
    // or
    themes: false, // Disable all themes except light and dark
  },
}
```

---

## Creating Custom Themes

### Basic Custom Theme

Define a custom theme in `tailwind.config.js`:

```javascript
module.exports = {
  daisyui: {
    themes: [
      {
        mytheme: {
          "primary": "#3b82f6",        // Blue
          "secondary": "#8b5cf6",      // Purple
          "accent": "#06b6d4",         // Cyan
          "neutral": "#1f2937",        // Dark gray
          "base-100": "#ffffff",       // White background
          "base-200": "#f3f4f6",       // Light gray background
          "base-300": "#e5e7eb",       // Medium gray background
          "base-content": "#1f2937",   // Text color
          "info": "#3b82f6",           // Blue
          "success": "#10b981",        // Green
          "warning": "#f59e0b",        // Orange
          "error": "#ef4444",          // Red
        },
      },
    ],
  },
}
```

### Complete Theme with All Variables

```javascript
{
  mytheme: {
    // Brand colors
    "primary": "#3b82f6",
    "primary-content": "#ffffff",
    "secondary": "#8b5cf6",
    "secondary-content": "#ffffff",
    "accent": "#06b6d4",
    "accent-content": "#ffffff",
    "neutral": "#1f2937",
    "neutral-content": "#ffffff",
    
    // Base colors
    "base-100": "#ffffff",      // Background
    "base-200": "#f3f4f6",      // Slightly darker
    "base-300": "#e5e7eb",      // Even darker
    "base-content": "#1f2937",  // Text color
    
    // Semantic colors
    "info": "#3b82f6",
    "info-content": "#ffffff",
    "success": "#10b981",
    "success-content": "#ffffff",
    "warning": "#f59e0b",
    "warning-content": "#000000",
    "error": "#ef4444",
    "error-content": "#ffffff",
    
    // Border and other
    "--rounded-box": "1rem",
    "--rounded-btn": "0.5rem",
    "--rounded-badge": "1.9rem",
    "--animation-btn": "0.25s",
    "--animation-input": "0.2s",
    "--btn-focus-scale": "0.95",
    "--border-btn": "1px",
    "--tab-border": "1px",
    "--tab-radius": "0.5rem",
  },
}
```

### Creating Dark Mode Variant

```javascript
{
  themes: [
    {
      mylight: {
        "primary": "#3b82f6",
        "base-100": "#ffffff",
        "base-content": "#1f2937",
        // ... other light colors
      },
    },
    {
      mydark: {
        "primary": "#60a5fa",        // Lighter primary for dark mode
        "base-100": "#1f2937",       // Dark background
        "base-200": "#111827",       // Darker background
        "base-300": "#0f172a",       // Darkest background
        "base-content": "#f3f4f6",   // Light text
        // ... other dark colors
      },
    },
  ],
}
```

---

## CSS Variables

daisyUI themes use CSS custom properties (variables) for dynamic theming.

### Accessing Theme Colors in CSS

```css
.custom-element {
  background-color: hsl(var(--p));      /* Primary */
  color: hsl(var(--pc));                /* Primary content */
  border-color: hsl(var(--b3));         /* Base-300 */
}
```

### Available CSS Variables

```css
--p    /* primary */
--pc   /* primary-content */
--s    /* secondary */
--sc   /* secondary-content */
--a    /* accent */
--ac   /* accent-content */
--n    /* neutral */
--nc   /* neutral-content */
--b1   /* base-100 */
--b2   /* base-200 */
--b3   /* base-300 */
--bc   /* base-content */
--in   /* info */
--inc  /* info-content */
--su   /* success */
--suc  /* success-content */
--wa   /* warning */
--wac  /* warning-content */
--er   /* error */
--erc  /* error-content */
```

### Using Variables in Inline Styles

```html
<div style="background-color: hsl(var(--p)); color: hsl(var(--pc));">
  Custom styled element
</div>
```

---

## Dynamic Theme Switching

### JavaScript Theme Switcher

**Basic Toggle:**

```javascript
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Load theme on page load
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
```

**Multi-Theme Selector:**

```javascript
const themes = ['light', 'dark', 'cupcake', 'synthwave', 'cyberpunk'];

function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('theme', themeName);
  updateThemeUI(themeName);
}

function updateThemeUI(themeName) {
  // Update UI to show active theme
  document.querySelectorAll('[data-theme-button]').forEach(btn => {
    btn.classList.toggle('btn-active', btn.dataset.theme === themeName);
  });
}

// Initialize theme
const currentTheme = localStorage.getItem('theme') || 'light';
setTheme(currentTheme);
```

### HTML Theme Switcher Component

```html
<div class="dropdown dropdown-end">
  <button tabindex="0" class="btn btn-ghost">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
    </svg>
    Theme
  </button>
  <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
    <li><button onclick="setTheme('light')" data-theme-button data-theme="light">Light</button></li>
    <li><button onclick="setTheme('dark')" data-theme-button data-theme="dark">Dark</button></li>
    <li><button onclick="setTheme('cupcake')" data-theme-button data-theme="cupcake">Cupcake</button></li>
    <li><button onclick="setTheme('synthwave')" data-theme-button data-theme="synthwave">Synthwave</button></li>
  </ul>
</div>
```

### System Preference Detection

```javascript
function getPreferredTheme() {
  // Check localStorage first
  const saved = localStorage.getItem('theme');
  if (saved) return saved;
  
  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// Apply theme
document.documentElement.setAttribute('data-theme', getPreferredTheme());

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('theme')) {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }
});
```

---

## Brand Integration

### Extracting Brand Colors

Convert brand hex colors to HSL for daisyUI:

```javascript
// Example: Brand color #3b82f6 (blue)
// In HSL: hsl(217, 91%, 60%)
// In daisyUI format: "217 91% 60%"

{
  mytheme: {
    "primary": "#3b82f6",  // Can use hex directly
    // or
    "primary": "217 91% 60%",  // HSL format (more flexible)
  },
}
```

### Ensuring Accessibility

Use tools to ensure WCAG contrast compliance:
- WebAIM Contrast Checker
- Colorable
- Accessible Colors

**Minimum Contrast Ratios:**
- Normal text (< 18pt): 4.5:1
- Large text (18pt+ or 14pt+ bold): 3:1
- UI components: 3:1

```javascript
{
  mytheme: {
    "primary": "#3b82f6",        // Check against white
    "primary-content": "#ffffff", // Ensure 4.5:1 contrast
    "base-100": "#ffffff",        // Background
    "base-content": "#1f2937",    // Ensure 4.5:1 contrast
  },
}
```

---

## Advanced Theme Techniques

### Theme with CSS Variables Override

Override specific variables without defining full theme:

```css
[data-theme="custom"] {
  --p: 217 91% 60%;           /* Primary */
  --pf: 217 91% 50%;          /* Primary focus */
  --s: 262 80% 50%;           /* Secondary */
  --a: 189 94% 43%;           /* Accent */
  --n: 219 14% 28%;           /* Neutral */
  --b1: 0 0% 100%;            /* Base 100 */
  --b2: 0 0% 95%;             /* Base 200 */
  --b3: 0 0% 90%;             /* Base 300 */
  --bc: 219 14% 28%;          /* Base content */
  --rounded-box: 1rem;
  --rounded-btn: 0.5rem;
}
```

### Gradients and Custom Styling

```css
[data-theme="gradient"] {
  --p: 217 91% 60%;
}

[data-theme="gradient"] .btn-primary {
  background: linear-gradient(135deg, hsl(var(--p)) 0%, hsl(var(--s)) 100%);
  border: none;
}
```

### Seasonal Themes

```javascript
function getSeasonalTheme() {
  const month = new Date().getMonth();
  if (month >= 11 || month <= 1) return 'winter';
  if (month >= 2 && month <= 4) return 'garden';
  if (month >= 5 && month <= 7) return 'bumblebee';
  if (month >= 8 && month <= 10) return 'autumn';
}

// Apply seasonal theme if no preference saved
if (!localStorage.getItem('theme')) {
  setTheme(getSeasonalTheme());
}
```

---

## Best Practices

### 1. Provide Theme Persistence

Always save user's theme choice:

```javascript
localStorage.setItem('theme', themeName);
```

### 2. Smooth Transitions

Add transition for theme changes:

```css
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

### 3. Test All Themes

- Test custom themes in both light and dark modes
- Verify all component states (hover, focus, active, disabled)
- Check color contrast for accessibility
- Test with actual content, not placeholder text

### 4. Document Theme Colors

Create a style guide documenting your theme:

```markdown
## Brand Theme Colors

- Primary (#3b82f6): Main actions, links
- Secondary (#8b5cf6): Alternative actions
- Accent (#06b6d4): Highlights, CTAs
- Success (#10b981): Success messages, valid states
- Warning (#f59e0b): Warning messages, pending states
- Error (#ef4444): Error messages, invalid states
```

### 5. Consider Color Blindness

- Test with color blindness simulators
- Don't rely on color alone to convey information
- Use patterns, text labels, or icons in addition to colors

---

## Complete Example: Email Checker Theme

```javascript
// tailwind.config.js
module.exports = {
  daisyui: {
    themes: [
      {
        emailchecker: {
          "primary": "#3b82f6",        // Blue for primary actions
          "secondary": "#8b5cf6",      // Purple for secondary actions
          "accent": "#06b6d4",         // Cyan for highlights
          "neutral": "#1f2937",        // Dark gray for neutral elements
          "base-100": "#ffffff",       // White background
          "base-200": "#f9fafb",       // Very light gray
          "base-300": "#f3f4f6",       // Light gray
          "base-content": "#111827",   // Almost black text
          "info": "#3b82f6",           // Blue for info
          "success": "#10b981",        // Green for clean emails
          "warning": "#f59e0b",        // Orange for warnings
          "error": "#ef4444",          // Red for blocked emails
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.5rem",
          "--animation-btn": "0.2s",
        },
        emailchecker-dark: {
          "primary": "#60a5fa",        // Lighter blue
          "secondary": "#a78bfa",      // Lighter purple
          "accent": "#22d3ee",         // Lighter cyan
          "neutral": "#374151",        // Medium gray
          "base-100": "#1f2937",       // Dark background
          "base-200": "#111827",       // Darker background
          "base-300": "#0f172a",       // Darkest background
          "base-content": "#f3f4f6",   // Light text
          "info": "#60a5fa",
          "success": "#34d399",        // Lighter green
          "warning": "#fbbf24",        // Lighter orange
          "error": "#f87171",          // Lighter red
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.5rem",
        },
      },
    ],
  },
}
```

This theme system provides flexibility, maintainability, and excellent user experience across all viewing preferences.
