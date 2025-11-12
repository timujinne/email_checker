# Email Checker - Brand Assets

## Logo Files

### Main Logo
- **logo.webp** (347 KB) - Primary logo in WebP format
  - Design: Mail envelope icon + checkmark
  - Colors: White on dark gray background
  - Text: "Email Checker"
  - Usage: Navbar, sidebar, favicon

## Usage Guidelines

### Web Interface
- **Navbar**: 40x40px (w-10 h-10)
- **Sidebar**: 48x48px (w-12 h-12)
- **Favicon**: Browser default sizing

### Integration Points
1. **Navbar** (navbar-init.js:26)
   ```html
   <img src="assets/images/logo.webp" alt="Email Checker Logo" class="w-10 h-10 object-contain">
   ```

2. **Sidebar** (sidebar-init.js:19)
   ```html
   <img src="assets/images/logo.webp" alt="Email Checker Logo" class="w-12 h-12 object-contain">
   ```

3. **Favicon** (all HTML files)
   ```html
   <link rel="icon" type="image/webp" href="assets/images/logo.webp">
   <link rel="apple-touch-icon" href="assets/images/logo.webp">
   ```

## Browser Support

### WebP Format
- ✅ Chrome 23+
- ✅ Firefox 65+
- ✅ Edge 18+
- ✅ Safari 14+
- ✅ Opera 12.1+

### Fallback
Modern browsers support WebP natively. For older browsers, consider:
- PNG version (logo.png) - universal compatibility
- ICO version (favicon.ico) - IE legacy support

## Design Specifications

### Visual Elements
- **Envelope Icon**: Represents email functionality
- **Checkmark**: Symbolizes validation and verification
- **Typography**: Bold sans-serif "Email Checker"
- **Background**: Dark gray (#52525b, Slate-600)
- **Foreground**: White (#ffffff)

### Color Palette
- Primary: Dark Blue (#1e40af, Blue-900)
- Secondary: Dark Red (#991b1b, Red-900)
- Background: Dark Gray (#52525b, Slate-600)
- Text: White (#ffffff)

## File History
- **2025-11-10**: Initial logo created (ico.webp)
- **2025-11-10**: Integrated into web interface
