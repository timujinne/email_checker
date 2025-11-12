# 🌐 Email Checker Web UI

Modern web interface for Email Checker application built with Vanilla JavaScript + Web Components.

**Version:** 1.0.2 (Phase 1: Foundation)
**Status:** ✅ Development in Progress
**Updated:** 10 November 2025

---

## 🚀 Quick Start

### 1. Open in Browser

The web application is served by the Python backend. Open your browser and navigate to:

```
http://localhost:8082
```

### 2. Browser Requirements

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 3. Features Available Now

✅ **Phase 1 Complete:**
- Dashboard with KPI metrics
- Navigation (8 pages)
- Dark/Light mode switching
- Theme persistence
- Client-side routing
- WebSocket connection
- Global state management
- Toast notifications
- Custom CSS with color palette

---

## 📂 Project Structure

```
web/
├── index.html                      # Dashboard page
├── lists.html                      # Lists Manager page
├── smart-filter.html               # Smart Filter Studio page
├── blocklists.html                 # Blocklist Manager page
├── processing.html                 # Processing Queue page
├── analytics.html                  # Analytics & Reports page
├── archive.html                    # Archive & Cloud page
├── settings.html                   # Settings page
│
├── assets/
│   ├── css/
│   │   └── custom.css             # Custom styles & theme colors
│   ├── js/
│   │   ├── utils/
│   │   │   ├── state.js           # Global state management
│   │   │   ├── theme.js           # Dark/Light mode switcher
│   │   │   └── router.js          # Client-side routing
│   │   ├── services/
│   │   │   ├── api.js             # HTTP API wrapper
│   │   │   └── websocket.js       # WebSocket client
│   │   ├── components/
│   │   │   ├── navbar.js          # Top navigation bar
│   │   │   ├── sidebar.js         # Left sidebar menu
│   │   │   └── toast.js           # Toast notifications
│   │   └── main.js                # Application entry point
│   └── icons/                     # SVG icons (future)
│
└── README.md                       # This file
```

---

## 🎨 Color Palette

**Primary (Dark Blue):** `#1e40af` - Primary actions, buttons
**Secondary (Dark Red):** `#991b1b` - Danger, warnings
**Success:** `#065f46` - Positive actions
**Warning:** `#92400e` - Warnings

**Dark Theme:**
- Background: `#0f172a` (Slate-950)
- Surface: `#1e293b` (Slate-900)
- Text: `#f1f5f9` (Slate-100)

---

## 🛠️ Development

### Debugging

Open browser console and use the `debug` object:

```javascript
// Check application state
debug.state()

// Check current theme
debug.theme()

// Check current route
debug.route()

// Check WebSocket status
debug.ws()

// Inspect state tree
debug.store()
```

### Key Global Variables

```javascript
APP_CONFIG     // Application configuration (version, features, settings)
store          // Global state manager
router         // Router instance
ws             // WebSocket service
api            // API service
themeManager   // Theme service
toast          // Toast notification service
```

### Application Configuration

**Centralized version management** via `assets/js/config.js`:

```javascript
// Access application version anywhere
console.log(window.APP_CONFIG.VERSION);  // "1.0.2"

// Feature flags
if (APP_CONFIG.FEATURES.SMART_FILTER) {
    // Enable smart filter
}

// UI settings
const theme = APP_CONFIG.UI.THEME_DEFAULT;  // "dark"
```

**Single source of truth**: Version is defined once in `config.js` and used in:
- Navbar (top-left corner)
- Dashboard (version card)
- Settings page (about section)
- Console logs

### User Preferences Management

**Centralized preferences system** via `assets/js/utils/preferences.js`:

```javascript
// Access preferences manager
const prefs = window.preferencesManager;  // or window.prefs (alias)

// Get preference by path (dot notation)
const sortBy = prefs.get('tables.lists.sortBy');  // "date_added"
const theme = prefs.get('ui.theme');  // "dark"

// Set preference
prefs.set('tables.lists.sortBy', 'name');
prefs.set('ui.compactMode', true);

// Update multiple preferences at once
prefs.update({
    'tables.lists.sortBy': 'name',
    'tables.lists.sortOrder': 'desc',
    'ui.sidebarCollapsed': true
});

// Search history management
prefs.addToSearchHistory('blocklist', 'domain.com');
const history = prefs.getSearchHistory('blocklist');  // ['domain.com', ...]

// Reset all preferences
prefs.reset();

// Reset specific section
prefs.resetSection('tables');

// Export/import preferences
const json = prefs.export();  // Get JSON string
prefs.import(json);  // Restore from JSON
```

**Preference categories:**
- **ui** - Theme, sidebar state, compact mode, animations
- **tables** - Sort order, page size, column configuration (per component)
- **filters** - Filter states, search queries (per page)
- **searchHistory** - Recent searches (last 10 per component)
- **activeStates** - Active tabs, panels, selected options
- **scrollPositions** - Scroll positions (optional, may be heavy)
- **performance** - Auto-refresh, buffer sizes, intervals

**Features:**
- ✅ Auto-save on every change
- ✅ Multi-tab synchronization
- ✅ Version migration support
- ✅ Quota management (auto-cleanup when full)
- ✅ Export/import for backup

**Currently saving:**
- ✅ Theme preference (dark/light)
- ✅ Table sort order (per table)
- ✅ Column configuration (visibility, order)
- ✅ Page size preferences
- ✅ Smart filter templates
- ✅ Analytics reports
- ❌ Filter states (pending)
- ❌ Sidebar collapsed state (pending)
- ❌ Active tabs (pending)

---

## 📡 WebSocket Events

The application receives real-time events from the server:

```javascript
// Task events
'task.started'    // { id, name, total }
'task.progress'   // { id, processed, message }
'task.completed'  // { id, status, results }

// System events
'notification'    // { type, message }
'system.status'   // { db_size, cache_size, queue_length }
```

Subscribe to events:

```javascript
ws.on('task.started', (data) => {
    console.log('Task started:', data);
});
```

---

## 🎯 Next Phase (Phase 2)

- [ ] Dashboard implementation (KPI charts, activity feed)
- [ ] Lists Manager (table, filters, bulk operations)
- [ ] Settings page functionality
- [ ] Error pages (404, 500)

---

## 📋 Dependencies

**Zero external JavaScript libraries!**

Uses only:
- Tailwind CSS (CDN)
- daisyUI (CDN)
- Browser native APIs

---

## 🔗 API Integration

Backend API base URL: `http://localhost:8082`

Example API call:

```javascript
// Using API service
api.get('/api/lists')
    .then(response => {
        console.log('Lists:', response.data);
    })
    .catch(error => {
        console.error('Error:', error.message);
        toast.error('Failed to load lists');
    });
```

---

## 🎨 Styling Notes

- Uses Tailwind CSS utility classes
- Custom CSS in `assets/css/custom.css`
- Dark mode support with `data-theme` attribute
- Component-specific styles in Web Components

### Adding New Styles

Edit `assets/css/custom.css` to:
1. Add new CSS classes
2. Extend color palette
3. Add animations
4. Define new utility classes

---

## 🐛 Troubleshooting

### WebSocket Not Connecting
- Check backend is running: `python3 web_server.py`
- Check browser console for errors
- Verify WebSocket URL in `assets/js/services/websocket.js`

### Theme Not Saving
- Check browser localStorage is enabled
- Clear cache and reload

### API Calls Failing
- Check backend is running
- Check API base URL in `assets/js/services/api.js`
- Check CORS headers from backend

---

## 📝 Development Tips

1. **Use browser DevTools console** for quick debugging
2. **Watch Network tab** to inspect API requests
3. **Use theme toggle** to test dark mode
4. **Check console logs** for initialization sequence
5. **Use `debug` object** for state inspection

---

## 🚀 Deployment

For production:

1. Minify CSS/JavaScript
2. Enable compression
3. Set appropriate cache headers
4. Test in multiple browsers
5. Run accessibility checks

---

## 📄 License

Part of Email Checker project

---

**Last Updated:** 25 October 2025
