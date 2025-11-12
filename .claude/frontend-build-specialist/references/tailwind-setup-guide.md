# Tailwind CSS Setup Guide

Comprehensive guide for setting up Tailwind CSS CLI in vanilla JavaScript projects.

## Installation

### Using npm

```bash
npm install -D tailwindcss postcss autoprefixer
```

For daisyUI component library:
```bash
npm install -D daisyui
```

### Standalone CLI

Alternatively, download standalone CLI (no Node.js required):
```bash
# macOS
curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-x64
chmod +x tailwindcss-macos-x64
mv tailwindcss-macos-x64 tailwindcss

# Linux
curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-linux-x64
chmod +x tailwindcss-linux-x64
mv tailwindcss-linux-x64 tailwindcss

# Windows
# Download tailwindcss-windows-x64.exe from releases page
```

## Configuration

### Initialize Config

```bash
npx tailwindcss init
```

Creates `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Content Paths

Configure paths to all files containing Tailwind classes:

```javascript
export default {
  content: [
    "./src/**/*.{html,js}",
    "./public/**/*.html",
    "./dist/**/*.html",
    "./node_modules/daisyui/dist/**/*.js"  // If using daisyUI
  ],
  // ...
}
```

**Important**: Glob patterns scan all matching files. Exclude paths with `!`:

```javascript
content: [
  "./src/**/*.{html,js}",
  "!./src/excluded/**"
]
```

### Theme Customization

Extend default theme without overriding:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        'brand-blue': '#1e3a8a',
        'brand-red': '#991b1b',
        'custom-gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          // ... more shades
          900: '#111827'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['Fira Code', 'monospace']
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  }
}
```

Override default theme (rare):

```javascript
export default {
  theme: {
    colors: {
      // Only these colors available
      primary: '#1e3a8a',
      secondary: '#991b1b'
    }
  }
}
```

### Plugins

Add daisyUI or other plugins:

```javascript
export default {
  plugins: [
    require('daisyui'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
  daisyui: {
    themes: [
      "light",
      "dark",
      {
        custom: {
          "primary": "#1e3a8a",
          "secondary": "#991b1b",
          "accent": "#37cdbe",
          "neutral": "#3d4451",
          "base-100": "#ffffff"
        }
      }
    ]
  }
}
```

## CSS Setup

### Input CSS File

Create `src/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
@layer components {
  .btn-primary {
    @apply bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded;
  }
}

@layer utilities {
  .content-auto {
    content-visibility: auto;
  }
}
```

### Layers Explained

- **@tailwind base**: Normalize CSS + base styles
- **@tailwind components**: Component classes (low specificity)
- **@tailwind utilities**: Utility classes (high specificity)

Custom styles go in `@layer` directives to control specificity and enable purging.

## Build Commands

### Development (Watch Mode)

```bash
npx tailwindcss -i ./src/styles.css -o ./dist/styles.css --watch
```

Watches for changes, rebuilds CSS instantly with JIT mode.

### Production (Minified)

```bash
npx tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify
```

Minifies output, removes unused classes (PurgeCSS built-in).

### npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "css:dev": "tailwindcss -i ./src/styles.css -o ./dist/styles.css --watch",
    "css:build": "tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify",
    "dev": "npm run css:dev",
    "build": "npm run css:build"
  }
}
```

## JIT Mode

Just-In-Time mode (default in Tailwind 3+) generates utilities on-demand.

### Benefits

- **Fast builds**: Only generates used classes
- **Small dev files**: No massive 3MB CSS in development
- **Arbitrary values**: Use `w-[137px]` or `bg-[#1da1f2]`
- **Unlimited variants**: Stack variants like `dark:hover:focus:bg-blue-500`

### Arbitrary Values

```html
<div class="w-[137px]">Custom width</div>
<div class="bg-[#1da1f2]">Custom color</div>
<div class="before:content-['Hello']">Pseudo-element content</div>
```

### Arbitrary Variants

```html
<div class="[&>p]:text-red-500">
  <!-- All <p> children are red -->
</div>
```

## PostCSS Integration

For integration with build tools, create `postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

With cssnano for production:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
  }
}
```

## Production Optimization

### Automatic PurgeCSS

Tailwind CLI automatically removes unused classes in production (minify mode).

### Safelist Dynamic Classes

If generating classes dynamically, safelist them:

```javascript
export default {
  safelist: [
    'bg-red-500',
    'bg-green-500',
    'bg-blue-500',
    {
      pattern: /bg-(red|green|blue)-(100|200|300|400|500|600|700|800|900)/,
    }
  ]
}
```

### Content Configuration Best Practices

```javascript
export default {
  content: [
    "./src/**/*.{html,js}",
    "./public/**/*.html"
  ],
  safelist: [
    // Dynamically generated classes
    {
      pattern: /^(bg|text|border)-(red|green|blue|yellow)-(100|500|900)$/
    }
  ],
  blocklist: [
    // Classes to never generate
    'container',
    'col-span-7'
  ]
}
```

## Common Issues

### Classes Not Generated

1. **Check content paths**: Verify glob patterns match your files
2. **Restart watch mode**: Stop and restart `--watch`
3. **Dynamic classes**: Use safelist for runtime-generated classes
4. **Caching**: Delete `.tailwindcss` cache and rebuild

### Large File Size

1. **Enable minify**: Use `--minify` flag in production
2. **Check content paths**: Don't scan unnecessary files
3. **Remove unused plugins**: Disable plugins you don't use
4. **Verify JIT mode**: Should be enabled by default (Tailwind 3+)

### Wrong Colors/Theme

1. **Check theme config**: Verify `extend` vs full theme replacement
2. **Plugin conflicts**: Check if plugins override your theme
3. **CSS layer order**: Ensure `@tailwind` directives in correct order
4. **Specificity**: Use `@layer utilities` for custom classes

## Browser Support

Configure target browsers via `browserslist` in `package.json`:

```json
{
  "browserslist": [
    "> 0.5%",
    "last 2 versions",
    "not dead"
  ]
}
```

Or `.browserslistrc` file:

```
> 0.5%
last 2 versions
not dead
```

Autoprefixer uses this to add vendor prefixes automatically.
