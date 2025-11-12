# Lists Manager Testing Checklist

## Overview
This checklist covers comprehensive testing for the Lists Manager component including Column Manager, Bulk Edit, keyboard shortcuts, accessibility, and responsive design features.

---

## ✅ Column Manager

### Basic Functionality
- [ ] Dropdown opens and closes on click
- [ ] Checkboxes toggle column visibility in real-time
- [ ] All columns show/hide correctly
- [ ] Locked columns (Select, Filename, Actions) cannot be hidden
- [ ] Column order changes via drag & drop
- [ ] Reset button restores default column configuration
- [ ] Settings persist after page reload
- [ ] Settings persist across browser sessions (localStorage)

### Edge Cases
- [ ] Works with minimum columns visible (locked columns only)
- [ ] Works with all columns visible
- [ ] Handles rapid toggling (click spam test)
- [ ] Handles rapid drag & drop operations

### Mobile/Touch
- [ ] Dropdown works on touch devices
- [ ] Touch-friendly checkbox sizing
- [ ] Drag & drop works with touch gestures (if supported)

---

## ✅ Bulk Edit

### Modal Behavior
- [ ] Button disabled when no lists selected
- [ ] Badge shows correct count (0, 1, 5, 10+)
- [ ] Modal opens when button clicked with selection
- [ ] Modal displays selected count correctly
- [ ] Modal shows Russian plural forms correctly (список/списка/списков)
- [ ] Modal closes on Cancel button
- [ ] Modal closes on backdrop click
- [ ] Modal closes on Escape key

### Form Functionality
- [ ] All checkboxes start unchecked
- [ ] All input fields start disabled
- [ ] Checking checkbox enables corresponding field
- [ ] Unchecking checkbox disables corresponding field
- [ ] Preview updates in real-time when fields change
- [ ] Apply button disabled until at least one field is checked
- [ ] Apply button enabled when field checked and has value

### Field Validation
- [ ] Country dropdown populated from existing lists
- [ ] Category dropdown populated from existing lists
- [ ] Priority accepts numbers 50-999
- [ ] Priority rejects invalid values
- [ ] Description accepts multi-line text
- [ ] Processed status has correct options (Обработан/Не обработан)

### API Integration
- [ ] Loading overlay shows during API call
- [ ] Loading text updates with operation details
- [ ] Button loading states activate (spinner + disabled)
- [ ] Success toast shows with correct count
- [ ] Error toast shows on API failure
- [ ] Table refreshes after successful update
- [ ] Updated rows flash with success color
- [ ] Modal closes after success (1s delay)
- [ ] Focus returns to bulk edit button after close

### Data Integrity
- [ ] Changes persist to backend
- [ ] Changes visible in table after refresh
- [ ] Multiple fields update simultaneously
- [ ] Empty values don't overwrite existing data
- [ ] Special characters in description save correctly

---

## ✅ Keyboard Shortcuts

### Global Shortcuts
- [ ] `Ctrl+A` / `Cmd+A` - Selects all visible lists
- [ ] `Ctrl+D` / `Cmd+D` - Deselects all lists
- [ ] `Ctrl+E` / `Cmd+E` - Opens bulk edit (only if lists selected)
- [ ] `Ctrl+R` / `Cmd+R` - Refreshes lists (prevents browser refresh)
- [ ] `Escape` - Closes modal if open
- [ ] `Escape` - Clears selection if no modal open
- [ ] `?` - Shows keyboard shortcuts help modal

### Modal Shortcuts
- [ ] `Enter` - Applies changes when in modal and Apply button enabled
- [ ] `Escape` - Closes modal
- [ ] `Tab` - Navigates between form fields
- [ ] `Shift+Tab` - Navigates backwards between fields
- [ ] `Space` - Toggles checkboxes when focused

### Context-Aware Behavior
- [ ] Shortcuts ignored when typing in search input
- [ ] Shortcuts ignored when typing in filter dropdowns
- [ ] Shortcuts ignored when typing in modal fields
- [ ] `Enter` in modal fields doesn't submit form prematurely
- [ ] `Ctrl+E` shows warning toast if no lists selected

### Help Modal
- [ ] Opens on `?` key press
- [ ] Opens on Help button click
- [ ] Shows all shortcuts with correct labels
- [ ] Close button works
- [ ] Clicking backdrop closes modal
- [ ] Modal removes from DOM after close

---

## ✅ Accessibility (a11y)

### ARIA Labels
- [ ] Bulk edit button has `aria-label`
- [ ] Bulk edit button has `aria-describedby` for badge
- [ ] Selected count badge has `role="status"` and `aria-live="polite"`
- [ ] Help button has `aria-label`
- [ ] Modal has `role="dialog"`
- [ ] Modal has `aria-labelledby` pointing to title
- [ ] Modal has `aria-describedby` pointing to description
- [ ] All SVG icons have `aria-hidden="true"`

### Focus Management
- [ ] Modal focuses first checkbox on open
- [ ] Focus returns to bulk edit button on modal close
- [ ] Keyboard navigation works through all modal fields
- [ ] Focus visible on all interactive elements
- [ ] No focus traps (can escape with Tab)

### Screen Reader Support
- [ ] Screen reader announces "Выбрано X списков" on select all
- [ ] Screen reader announces "Снято выделение" on deselect
- [ ] Screen reader announces "Успешно обновлено X списков" after bulk edit
- [ ] Loading overlay text readable by screen reader
- [ ] All form labels associated with inputs

### Keyboard-Only Navigation
- [ ] Can select/deselect lists with keyboard
- [ ] Can open bulk edit with keyboard (Ctrl+E)
- [ ] Can navigate all form fields with Tab
- [ ] Can submit form with Enter
- [ ] Can close modal with Escape
- [ ] Can access help with ?

### Color Contrast
- [ ] Text meets WCAG AA contrast ratio (4.5:1)
- [ ] Interactive elements meet contrast requirements
- [ ] Focus indicators clearly visible
- [ ] Works in high contrast mode
- [ ] Works in dark mode
- [ ] Works in light mode

---

## ✅ Responsive Design

### Desktop (1920x1080)
- [ ] Full layout displays correctly
- [ ] All columns visible without scroll
- [ ] Toolbar items fit on one line
- [ ] Modal centered and readable
- [ ] No layout shifts

### Laptop (1366x768)
- [ ] Layout condenses appropriately
- [ ] Horizontal scroll appears if needed
- [ ] Toolbar items may wrap
- [ ] Modal fits in viewport
- [ ] All features accessible

### Tablet (768x1024)
- [ ] Toolbar stacks vertically
- [ ] Buttons readable and touchable (min 44px)
- [ ] Modal fills 90% of viewport width
- [ ] Table scrolls horizontally
- [ ] Column manager accessible

### Mobile (375x667)
- [ ] Toolbar fully stacked
- [ ] Buttons full-width or wrap
- [ ] Modal fills 95% of viewport width
- [ ] Table scrolls horizontally smoothly
- [ ] Touch gestures work (tap, scroll, pinch)
- [ ] Help button visible
- [ ] Column manager dropdown left-aligned

### Touch Interactions
- [ ] Checkboxes have adequate touch target size (44x44px min)
- [ ] Buttons respond to touch without delay
- [ ] Touch scrolling smooth on table
- [ ] No accidental selections
- [ ] Long press doesn't trigger unintended actions

---

## ✅ Performance

### Loading Times
- [ ] Column toggle < 100ms
- [ ] Modal open < 200ms
- [ ] Table refresh < 500ms for 100 rows
- [ ] Table refresh < 2s for 1000 rows
- [ ] Search filter < 100ms
- [ ] Keyboard shortcut response < 50ms

### Animations
- [ ] All animations smooth (60fps)
- [ ] Button hover effects smooth
- [ ] Modal open/close animations smooth
- [ ] Row hover effects smooth
- [ ] Loading overlay fade smooth
- [ ] Success flash animation smooth

### Memory
- [ ] No memory leaks after 10 bulk edits
- [ ] No memory leaks after 50 column toggles
- [ ] No memory leaks after 100 searches
- [ ] No detached DOM nodes after operations
- [ ] Event listeners properly cleaned up

### Network
- [ ] Only one API call per bulk edit
- [ ] No duplicate API calls
- [ ] Proper error handling on timeout
- [ ] Proper error handling on 500 error
- [ ] Proper error handling on network offline

---

## ✅ Edge Cases

### Empty States
- [ ] Empty list (no lists to display) - shows helpful message
- [ ] No search results - shows "Нет результатов"
- [ ] All lists filtered out - shows empty state
- [ ] No columns selected - shows at least locked columns

### Selection Edge Cases
- [ ] Select all with 0 lists - does nothing
- [ ] Select all with 1 list - selects 1
- [ ] Select all with 1000 lists - handles gracefully
- [ ] Deselect when none selected - does nothing
- [ ] Bulk edit with 1 list - correct singular form
- [ ] Bulk edit with 1000 lists - handles without lag

### Data Edge Cases
- [ ] List names with special characters (', ", <, >)
- [ ] List names longer than 200 chars (truncated)
- [ ] Country names with unicode (Україна, 中国)
- [ ] Categories with spaces and dashes
- [ ] Priority at boundaries (50, 999)
- [ ] Empty descriptions
- [ ] Very long descriptions (1000+ chars)

### Browser Compatibility
- [ ] Chrome/Chromium 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+
- [ ] Mobile Safari (iOS 14+)
- [ ] Chrome Mobile (Android 10+)

### API Error Handling
- [ ] Network timeout (30s) - shows error toast
- [ ] 400 Bad Request - shows validation errors
- [ ] 500 Internal Server Error - shows generic error
- [ ] Network offline - shows "No connection" error
- [ ] Partial success - shows which updates succeeded
- [ ] Rate limiting - shows "Too many requests" error

---

## ✅ Integration Testing

### With Other Components
- [ ] Works with Column Manager
- [ ] Works with Toast notifications
- [ ] Works with State management (store.js)
- [ ] Works with API service
- [ ] Works with Router (page navigation)
- [ ] Works with Theme switcher (dark/light mode)
- [ ] Works with WebSocket updates (if applicable)

### User Workflows
- [ ] Upload → Process → Bulk Edit → Refresh cycle
- [ ] Search → Filter → Select → Bulk Edit cycle
- [ ] Select All → Deselect Some → Bulk Edit cycle
- [ ] Change columns → Select → Bulk Edit → Reset columns cycle
- [ ] Mobile: tap → scroll → select → edit cycle

---

## ✅ Regression Testing

### After Updates
- [ ] All previous features still work
- [ ] No new console errors
- [ ] No new console warnings
- [ ] No broken layouts
- [ ] No performance degradation
- [ ] No accessibility regressions

---

## 📊 Test Results Summary

**Total Tests:** ~150
**Passed:** ___ / 150
**Failed:** ___ / 150
**Blocked:** ___ / 150
**Coverage:** ___%

**Critical Issues Found:**
1.
2.
3.

**Minor Issues Found:**
1.
2.
3.

**Recommendations:**
1.
2.
3.

---

## 🧪 How to Test

### Manual Testing
1. Open `web/lists.html` in browser
2. Open DevTools Console for errors
3. Follow checklist item by item
4. Mark ✅ for pass, ❌ for fail, ⚠️ for partial

### Automated Testing
```bash
# Run automated test script
node test_lists_manager_ux.js

# Or in browser console
# Copy/paste contents of test_lists_manager_ux.js
```

### Screen Reader Testing
- **Windows:** NVDA or JAWS
- **macOS:** VoiceOver (Cmd+F5)
- **Linux:** Orca

### Mobile Testing
- **iOS:** Safari DevTools via USB
- **Android:** Chrome DevTools via USB
- **Emulators:** Chrome DevTools Device Mode (F12)

---

## 📝 Notes

- Test with **clean browser profile** to avoid extensions interfering
- Test with **network throttling** (Fast 3G) for realistic conditions
- Test with **CPU throttling** (4x slowdown) for low-end devices
- Test with **screen reader active** for full accessibility check
- Test at **different zoom levels** (100%, 125%, 150%, 200%)
- Test with **browser zoom** (Ctrl+/Ctrl-)

---

**Last Updated:** 2025-10-30
**Tested By:** _______________
**Environment:** _______________
**Browser:** _______________
**OS:** _______________
