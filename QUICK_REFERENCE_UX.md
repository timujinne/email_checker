# Quick Reference - Lists Manager UX

**Last Updated:** 2025-10-30

Quick reference guide for developers working with the enhanced Lists Manager.

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Notes |
|-----|--------|-------|
| `Ctrl/Cmd+A` | Select all lists | Toast notification shown |
| `Ctrl/Cmd+D` | Deselect all | Only if lists selected |
| `Ctrl/Cmd+E` | Open bulk edit | Only if lists selected |
| `Ctrl/Cmd+R` | Refresh lists | Prevents browser refresh |
| `Escape` | Close modal / Clear selection | Context-aware |
| `Enter` | Apply changes | Only in bulk edit modal |
| `?` | Show shortcuts help | Opens help modal |

**Important:** Shortcuts disabled when typing in inputs/textareas.

---

## 🔧 API Methods

### Loading States

```javascript
// Show global loading overlay
listsManager.showLoadingIndicator('Main text', 'Optional subtext');

// Hide loading overlay
listsManager.hideLoadingIndicator();

// Toggle button loading state
listsManager.setButtonLoading('button-id', true);  // Show loading
listsManager.setButtonLoading('button-id', false); // Hide loading
```

### User Feedback

```javascript
// Show toast notification
listsManager.showToast('Message text', 'success'); // success|info|warning|error

// Screen reader announcement
listsManager.announceToScreenReader('Announcement text');
```

### Selection

```javascript
// Select all visible lists
listsManager.selectAllLists();

// Deselect all lists
listsManager.deselectAllLists();

// Get selected filenames
const selected = listsManager.getSelectedFilenames(); // Returns array
```

### Modal

```javascript
// Open bulk edit modal (checks if lists selected)
listsManager.openBulkEditModal();

// Close bulk edit modal (returns focus)
listsManager.closeBulkEditModal();

// Check if modal is open
const isOpen = listsManager.isBulkEditModalOpen(); // Returns boolean
```

### Other

```javascript
// Show shortcuts help
listsManager.showShortcutsHelp();

// Refresh lists from server
await listsManager.refreshLists();
```

---

## 🎨 CSS Classes

### Animations

```css
.animate-fade-in      /* Fade in animation (0.3s) */
.animate-slide-in     /* Slide in from top (0.3s) */
```

### Utility

```css
.sr-only              /* Screen reader only (visually hidden) */
```

### Animation Keyframes

```css
@keyframes fadeIn           /* Opacity 0 → 1 */
@keyframes slideIn          /* Slide from top */
@keyframes slideUp          /* Slide up from bottom */
@keyframes successFlash     /* Green background flash */
```

---

## 🏷️ HTML IDs

### Main Elements

```html
#loading-overlay          <!-- Global loading overlay -->
#loading-text             <!-- Main loading text -->
#loading-subtext          <!-- Secondary loading text -->

#bulk-edit-btn            <!-- Bulk edit button -->
#selected-count-badge     <!-- Selected count badge -->
#help-btn                 <!-- Help/shortcuts button -->

#bulk-edit-modal          <!-- Bulk edit modal -->
#bulk-edit-form           <!-- Modal form -->
#bulk-edit-apply          <!-- Apply button -->
#bulk-edit-cancel         <!-- Cancel button -->
#bulk-edit-preview        <!-- Preview text -->

#shortcuts-modal          <!-- Shortcuts help modal (dynamic) -->
```

### Form Fields

```html
#update-country-check     <!-- Country checkbox -->
#update-country           <!-- Country select -->

#update-category-check    <!-- Category checkbox -->
#update-category          <!-- Category select -->

#update-priority-check    <!-- Priority checkbox -->
#update-priority          <!-- Priority input -->

#update-processed-check   <!-- Processed status checkbox -->
#update-processed         <!-- Processed status select -->

#update-description-check <!-- Description checkbox -->
#update-description       <!-- Description textarea -->
```

---

## ♿ ARIA Attributes

### Buttons

```html
<button
    aria-label="Description of action"
    aria-describedby="related-element-id">
    Button Text
</button>
```

### Live Regions

```html
<span role="status" aria-live="polite">
    Dynamic content
</span>
```

### Modals

```html
<dialog
    role="dialog"
    aria-labelledby="modal-title"
    aria-describedby="modal-description">
    ...
</dialog>
```

### Screen Reader Only

```html
<p class="sr-only">
    Hidden text for screen readers
</p>
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Features |
|------------|-------|----------|
| Mobile | ≤768px | Stacked toolbar, 95% modal, touch targets |
| Tablet | 769-1024px | Wrapped toolbar, 90% modal |
| Desktop | ≥1025px | Full layout, hover effects |

---

## 🧪 Testing

### Run Automated Tests

```javascript
// In browser console on lists.html:
// 1. Open DevTools (F12)
// 2. Go to Console tab
// 3. Copy contents of test_lists_manager_ux.js
// 4. Paste and press Enter
```

### Manual Testing

See `TESTING_CHECKLIST_LISTS_MANAGER.md` for comprehensive checklist.

**Quick Smoke Test:**
1. ✅ Press `?` - Help modal appears
2. ✅ Press `Ctrl+A` - All lists selected
3. ✅ Press `Ctrl+E` - Bulk edit opens
4. ✅ Press `Escape` - Modal closes
5. ✅ Press `Ctrl+D` - Selection cleared
6. ✅ Click Help button - Help modal appears
7. ✅ Resize window - Layout adapts

---

## 🐛 Common Issues

### Keyboard shortcuts not working

**Check:**
- Are you typing in an input/textarea? (Shortcuts disabled)
- Is `listsManager` initialized? (Check console: `typeof listsManager`)
- Are event listeners attached? (Check console: `getEventListeners(document)`)

**Fix:**
```javascript
// Manually trigger initialization if needed
listsManager.init();
```

### Loading overlay won't hide

**Check:**
- Does `#loading-overlay` element exist?
- Is `hideLoadingIndicator()` called in `finally` block?

**Fix:**
```javascript
// Manually hide overlay
document.getElementById('loading-overlay').classList.add('hidden');
```

### Focus not returning after modal close

**Check:**
- Is `setTimeout` in `closeBulkEditModal()` executing?
- Does bulk edit button exist with ID `bulk-edit-btn`?

**Fix:**
```javascript
// Manually return focus
document.getElementById('bulk-edit-btn')?.focus();
```

### Screen reader not announcing

**Check:**
- Is element with `role="status"` being created?
- Is text content being set?
- Is element removed after 1s?

**Fix:**
```javascript
// Test announcement manually
listsManager.announceToScreenReader('Test announcement');
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `UX_ENHANCEMENTS_SUMMARY.md` | Complete feature documentation |
| `TESTING_CHECKLIST_LISTS_MANAGER.md` | Manual testing guide (150+ tests) |
| `test_lists_manager_ux.js` | Automated test script (55+ tests) |
| `QUICK_REFERENCE_UX.md` | This document |

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `web/assets/js/components/lists-manager.js` | Main component logic |
| `web/lists.html` | HTML structure |
| `web/assets/css/custom.css` | Styles and animations |
| `web/assets/js/components/column-manager.js` | Column visibility management |

---

## 💡 Tips

1. **Keyboard shortcuts:** Hold `Ctrl/Cmd` and press keys (don't type)
2. **Testing:** Use automated script first, then manual checklist
3. **Accessibility:** Test with screen reader (VoiceOver/NVDA)
4. **Performance:** Check animations in DevTools Performance tab
5. **Mobile:** Test in Chrome DevTools Device Mode
6. **Debugging:** Check browser console for errors

---

## 🚀 Quick Start

```javascript
// 1. Initialize (done automatically on page load)
listsManager.init();

// 2. Load lists
await listsManager.loadLists();

// 3. Render table
listsManager.renderTable();

// 4. Use keyboard shortcuts
// Press Ctrl+A to select all
// Press Ctrl+E to bulk edit
// Press ? for help
```

---

**Need more details?** See `UX_ENHANCEMENTS_SUMMARY.md`

**Found a bug?** Check `TESTING_CHECKLIST_LISTS_MANAGER.md`

**Adding features?** Follow patterns in `lists-manager.js`
