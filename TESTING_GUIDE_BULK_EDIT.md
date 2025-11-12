# Testing Guide: Bulk Edit & Column Manager Integration

## Quick Test Checklist

Use this checklist to verify the integration is working correctly.

---

## Test 1: Column Manager Basic Functionality

### Expected Behavior
- ✅ Column Manager dropdown appears in top-right of toolbar
- ✅ Clicking dropdown shows list of columns with checkboxes
- ✅ Unchecking a column hides it from table
- ✅ Checking a column shows it in table
- ✅ Locked columns (Select, Filename, Actions) cannot be unchecked

### Steps
```
1. Open browser to http://localhost:8080/#lists
2. Look for ⚙️ "Столбцы" button in toolbar
3. Click button → Dropdown opens
4. Uncheck "Приоритет" → Priority column disappears from table
5. Check "Приоритет" → Priority column reappears
6. Try to uncheck "Выбор" → Should be disabled (locked)
```

**Pass Criteria:** All steps complete without errors

---

## Test 2: Column Manager Drag & Drop

### Expected Behavior
- ✅ Non-locked columns can be dragged to reorder
- ✅ Dragging changes column order in table immediately
- ✅ Locked columns cannot be dragged

### Steps
```
1. Open Column Manager dropdown
2. Find drag handle (≡ icon) next to "Страна"
3. Click and hold drag handle
4. Drag "Страна" above "Категория"
5. Release mouse → Column order changes in table
6. Try to drag "Выбор" → Should not be draggable (locked)
```

**Pass Criteria:** Column reordering works, locked columns don't move

---

## Test 3: Column Manager Persistence

### Expected Behavior
- ✅ Column visibility settings persist after page refresh
- ✅ Column order persists after page refresh
- ✅ Reset button restores default settings

### Steps
```
1. Hide "Приоритет" column
2. Reorder "Страна" to first position
3. Refresh page (F5)
4. Verify "Приоритет" still hidden
5. Verify "Страна" still in first position
6. Click "Сбросить настройки" button
7. Verify defaults restored
```

**Pass Criteria:** Settings persist correctly, reset works

---

## Test 4: Bulk Edit Button State

### Expected Behavior
- ✅ Button disabled when no lists selected
- ✅ Button enabled when at least one list selected
- ✅ Badge shows correct count of selected lists

### Steps
```
1. Open Lists Manager page
2. Verify "Редактировать выбранные" button is disabled
3. Click checkbox for first list
4. Button enables, badge shows "1"
5. Click checkbox for second list
6. Badge updates to "2"
7. Uncheck both checkboxes
8. Button disables again
```

**Pass Criteria:** Button state and badge update correctly

---

## Test 5: Bulk Edit Modal Opening

### Expected Behavior
- ✅ Modal opens when button clicked with selection
- ✅ Modal shows correct count of selected lists
- ✅ All form fields disabled initially
- ✅ Country and Category dropdowns populated

### Steps
```
1. Select 3 lists with checkboxes
2. Click "Редактировать выбранные" button
3. Modal opens
4. Title shows "(3 списка)"
5. Verify all inputs are disabled (grayed out)
6. Open "Страна" dropdown → Shows existing countries
7. Open "Категория" dropdown → Shows existing categories
```

**Pass Criteria:** Modal opens correctly with disabled fields

---

## Test 6: Bulk Edit Field Enablement

### Expected Behavior
- ✅ Checking field checkbox enables that field's input
- ✅ Unchecking field checkbox disables that field's input
- ✅ Preview updates when fields change

### Steps
```
1. Open bulk edit modal (select lists first)
2. Check "Страна" checkbox → Dropdown enables
3. Uncheck "Страна" checkbox → Dropdown disables
4. Check "Приоритет" checkbox → Number input enables
5. Enter "150" in priority field
6. Preview shows "Приоритет: 150"
```

**Pass Criteria:** Checkboxes enable/disable fields, preview updates

---

## Test 7: Bulk Edit Real-time Preview

### Expected Behavior
- ✅ Preview shows "Выберите поля для изменения" when nothing selected
- ✅ Preview updates immediately when fields change
- ✅ Preview shows formatted values (e.g., "Обработан" instead of "true")

### Steps
```
1. Open bulk edit modal
2. Preview shows "Выберите поля для изменения"
3. Check "Страна" checkbox, select "Germany"
4. Preview shows "Страна: Germany"
5. Check "Категория" checkbox, select "Business"
6. Preview shows "Страна: Germany, Категория: Business"
7. Check "Статус обработки", select "Обработан"
8. Preview shows "Статус обработки: Обработан" (not "true")
```

**Pass Criteria:** Preview updates in real-time with formatted values

---

## Test 8: Bulk Edit Apply Button State

### Expected Behavior
- ✅ "Применить изменения" button disabled when no fields checked
- ✅ Button enables when at least one field checked
- ✅ Button stays enabled even if field value empty

### Steps
```
1. Open bulk edit modal
2. "Применить изменения" button is disabled
3. Check "Страна" checkbox (don't select value)
4. Button enables
5. Uncheck "Страна" checkbox
6. Button disables again
```

**Pass Criteria:** Button state matches field checkbox state

---

## Test 9: Bulk Edit API Call (Success)

### Expected Behavior
- ✅ Progress bar appears during API call
- ✅ Success toast shows after completion
- ✅ Table refreshes with updated data
- ✅ Modal closes automatically

### Steps
```
1. Select 2 lists
2. Open bulk edit modal
3. Check "Страна", select "Italy"
4. Check "Категория", select "Hydraulics"
5. Click "Применить изменения"
6. Progress bar appears
7. Wait for completion
8. Toast shows "✅ Обновлено 2 списка"
9. Table refreshes (updated values visible)
10. Modal closes after 1 second
```

**Pass Criteria:** Full workflow completes successfully

**Note:** Requires backend endpoint `/api/lists/bulk-update` to be implemented

---

## Test 10: Bulk Edit API Call (Error)

### Expected Behavior
- ✅ Error toast shows with message
- ✅ Progress bar hides
- ✅ Modal stays open
- ✅ User can retry or cancel

### Steps
```
1. Select 2 lists
2. Open bulk edit modal
3. Check "Приоритет", enter invalid value (e.g., "9999")
4. Click "Применить изменения"
5. API returns error
6. Toast shows "❌ Ошибка: [error message]"
7. Progress bar hides
8. Modal stays open
9. User can fix value and retry
```

**Pass Criteria:** Errors handled gracefully

**Note:** Requires backend validation

---

## Test 11: Bulk Edit Modal Closing

### Expected Behavior
- ✅ "Отмена" button closes modal
- ✅ Clicking backdrop closes modal
- ✅ Form resets when modal reopened

### Steps
```
1. Open bulk edit modal
2. Check "Страна", select "Germany"
3. Click "Отмена" → Modal closes
4. Reopen modal → Form is reset (nothing checked)
5. Check "Категория", select "Business"
6. Click outside modal (backdrop) → Modal closes
7. Reopen modal → Form is reset again
```

**Pass Criteria:** All close methods work, form resets

---

## Test 12: Select All Functionality

### Expected Behavior
- ✅ Clicking "Select All" checkbox selects all visible lists
- ✅ Unchecking "Select All" deselects all lists
- ✅ Bulk edit button updates with correct count

### Steps
```
1. Open Lists Manager page
2. Click "Select All" checkbox in table header
3. All list checkboxes become checked
4. Badge shows total count (e.g., "10")
5. Bulk edit button enables
6. Click "Select All" again to uncheck
7. All list checkboxes become unchecked
8. Badge shows "0"
9. Bulk edit button disables
```

**Pass Criteria:** Select All works correctly

---

## Test 13: Filtered Lists Selection

### Expected Behavior
- ✅ Selection works with filtered lists
- ✅ Select All only selects visible (filtered) lists
- ✅ Bulk edit affects only selected lists

### Steps
```
1. Enter "Germany" in search box
2. Table filters to show only German lists
3. Click "Select All" → Only visible lists selected
4. Badge shows count of filtered lists
5. Open bulk edit → Selected count matches filtered count
6. Apply changes → Only filtered lists updated
```

**Pass Criteria:** Selection respects filters

---

## Test 14: Large Dataset Performance

### Expected Behavior
- ✅ Column toggling is instant (<100ms)
- ✅ Bulk edit modal opens quickly (<200ms)
- ✅ Preview updates without lag (<50ms)

### Steps
```
1. Load page with 100+ lists
2. Toggle columns → Should be instant
3. Select 50 lists
4. Open bulk edit modal → Opens quickly
5. Change fields → Preview updates instantly
```

**Pass Criteria:** No noticeable lag

---

## Test 15: Browser Compatibility

### Expected Behavior
- ✅ Works in Chrome 90+
- ✅ Works in Firefox 88+
- ✅ Works in Safari 14+
- ✅ Works in Edge 90+

### Steps
```
1. Open page in each browser
2. Test Column Manager dropdown
3. Test Bulk Edit modal
4. Test all interactive elements
5. Verify styling is consistent
```

**Pass Criteria:** Works in all target browsers

---

## Test 16: Mobile Responsiveness

### Expected Behavior
- ✅ Column Manager dropdown accessible on mobile
- ✅ Bulk Edit modal fits mobile screen
- ✅ Form fields usable on touch devices

### Steps
```
1. Open page on mobile device or use DevTools mobile emulation
2. Column Manager dropdown opens and is usable
3. Bulk Edit button accessible
4. Modal fits screen width
5. Form fields can be tapped and filled
6. Dropdowns work on touch
```

**Pass Criteria:** Fully functional on mobile

---

## Test 17: Accessibility

### Expected Behavior
- ✅ Keyboard navigation works (Tab, Enter, Escape)
- ✅ Screen reader announces changes
- ✅ Focus indicators visible

### Steps
```
1. Navigate page with keyboard only
2. Tab to Column Manager → Press Enter to open
3. Use arrow keys to navigate options
4. Tab to Bulk Edit button → Press Enter to open modal
5. Tab through form fields
6. Press Escape to close modal
```

**Pass Criteria:** Fully keyboard accessible

---

## Test 18: LocalStorage Quota

### Expected Behavior
- ✅ Column preferences stored correctly
- ✅ No errors if localStorage full
- ✅ Graceful degradation if localStorage disabled

### Steps
```
1. Open browser DevTools → Application → LocalStorage
2. Find key: `email-checker-column-preferences`
3. Verify JSON structure is valid
4. Toggle columns multiple times
5. Verify size stays <2KB
6. Disable LocalStorage → App still works (no persistence)
```

**Pass Criteria:** LocalStorage used efficiently, graceful fallback

---

## Test 19: Edge Cases

### Expected Behavior
- ✅ Works with 0 lists in table
- ✅ Works with 1 list selected
- ✅ Works with all lists selected
- ✅ Handles special characters in filenames

### Steps
```
1. Clear all filters → Show "No lists" message
2. Select 1 list → Badge shows "1 список"
3. Open bulk edit → Shows "(1 список)"
4. Select list with special chars (e.g., "file-2024!.txt")
5. Apply bulk edit → No errors
6. Select all 100+ lists → Works without issues
```

**Pass Criteria:** No errors in edge cases

---

## Test 20: Russian Pluralization

### Expected Behavior
- ✅ "1 список" (singular)
- ✅ "2-4 списка" (few)
- ✅ "5+ списков" (many)

### Steps
```
1. Select 1 list → Badge shows "1 список"
2. Modal shows "(1 список)"
3. Select 2 lists → Badge shows "2 списка"
4. Modal shows "(2 списка)"
5. Select 5 lists → Badge shows "5 списков"
6. Modal shows "(5 списков)"
```

**Pass Criteria:** Correct plural forms used

---

## Console Log Verification

During testing, check browser console for these logs:

### Expected Console Output
```
📋 Initializing Lists Manager...
✅ Loaded lists: 10
📊 ColumnManager initialized with 12 columns
✅ Column Manager initialized with 9 visible columns
✅ Lists Manager initialized

// When toggling column:
👁️ Column "priority" visibility: false
💾 Column preferences saved

// When opening bulk edit:
(no errors)

// When applying bulk edit:
(API call logs)
✅ Loaded lists: 10
```

**Pass Criteria:** No errors in console, only success logs

---

## Known Issues to Check

### Issue 1: Modal Backdrop Click Not Working
**Symptom:** Clicking outside modal doesn't close it
**Cause:** `<dialog>` element not supported
**Fix:** Update browser or add polyfill

### Issue 2: Column Drag Not Working
**Symptom:** Can't drag columns to reorder
**Cause:** Locked column or touch device
**Fix:** Use drag handle, not checkbox area

### Issue 3: LocalStorage Not Persisting
**Symptom:** Column settings reset on reload
**Cause:** Browser privacy mode or disabled storage
**Fix:** Enable cookies/storage in browser

---

## Performance Benchmarks

### Target Metrics
- Column toggle: <100ms
- Modal open: <200ms
- Preview update: <50ms
- API call: <500ms (depends on backend)
- Table refresh: <100ms for 100 rows

### How to Measure
```javascript
// In browser console:
console.time('column-toggle');
listsManager.columnManager.toggleColumnVisibility('priority', false);
console.timeEnd('column-toggle');
// Expected: ~2-5ms

console.time('modal-open');
listsManager.openBulkEditModal();
console.timeEnd('modal-open');
// Expected: ~5-10ms
```

---

## Automated Testing Script

Copy this into browser console for quick verification:

```javascript
// Quick Test Script
(async function testBulkEditIntegration() {
    console.log('🧪 Starting integration tests...');

    // Test 1: Column Manager exists
    if (listsManager.columnManager) {
        console.log('✅ Test 1: Column Manager initialized');
    } else {
        console.error('❌ Test 1: Column Manager NOT initialized');
    }

    // Test 2: Visible columns correct
    const visibleCount = listsManager.visibleColumns.length;
    if (visibleCount === 9) {
        console.log('✅ Test 2: Correct number of visible columns:', visibleCount);
    } else {
        console.error('❌ Test 2: Incorrect visible columns:', visibleCount);
    }

    // Test 3: Bulk edit button exists
    const bulkEditBtn = document.getElementById('bulk-edit-btn');
    if (bulkEditBtn && bulkEditBtn.disabled) {
        console.log('✅ Test 3: Bulk edit button exists and disabled');
    } else {
        console.error('❌ Test 3: Bulk edit button missing or wrong state');
    }

    // Test 4: Modal exists
    const modal = document.getElementById('bulk-edit-modal');
    if (modal) {
        console.log('✅ Test 4: Bulk edit modal exists');
    } else {
        console.error('❌ Test 4: Bulk edit modal missing');
    }

    // Test 5: Column Manager dropdown
    const dropdown = document.querySelector('#column-manager-container .dropdown');
    if (dropdown) {
        console.log('✅ Test 5: Column Manager dropdown exists');
    } else {
        console.error('❌ Test 5: Column Manager dropdown missing');
    }

    console.log('🏁 Integration tests complete');
})();
```

**Expected Output:**
```
🧪 Starting integration tests...
✅ Test 1: Column Manager initialized
✅ Test 2: Correct number of visible columns: 9
✅ Test 3: Bulk edit button exists and disabled
✅ Test 4: Bulk edit modal exists
✅ Test 5: Column Manager dropdown exists
🏁 Integration tests complete
```

---

## Final Checklist

Before considering integration complete, verify all these items:

- [ ] Column Manager dropdown visible and functional
- [ ] All 12 columns configurable (9 visible by default)
- [ ] Column reordering works via drag & drop
- [ ] Column settings persist in localStorage
- [ ] Reset button restores defaults
- [ ] Bulk edit button state correct (disabled/enabled)
- [ ] Selected count badge updates correctly
- [ ] Modal opens with correct selected count
- [ ] All 5 form fields editable
- [ ] Checkboxes enable/disable corresponding inputs
- [ ] Preview updates in real-time
- [ ] Apply button state correct
- [ ] API call sends correct payload
- [ ] Progress bar shows during processing
- [ ] Success toast appears after update
- [ ] Table refreshes automatically
- [ ] Modal closes after success
- [ ] Error handling works correctly
- [ ] All close methods work (button, backdrop)
- [ ] Form resets when reopened
- [ ] No console errors
- [ ] Works in all target browsers
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] Russian pluralization correct

**Total Tests:** 20 test scenarios
**Estimated Testing Time:** 30-45 minutes

---

## Reporting Issues

If you find issues during testing, report them with this format:

```markdown
**Test:** Test 9 - Bulk Edit API Call (Success)
**Step:** Step 5 - Click "Применить изменения"
**Expected:** Progress bar appears
**Actual:** Nothing happens, no progress bar
**Console Error:** TypeError: Cannot read property 'classList' of null
**Browser:** Chrome 120.0
**Screenshot:** [attach if relevant]
**Reproducible:** Yes / No
**Workaround:** [if found]
```

---

## Success Criteria

Integration considered **PASS** if:
- ✅ All 20 tests pass
- ✅ No console errors
- ✅ Performance meets benchmarks
- ✅ Works in all target browsers
- ✅ Mobile responsive
- ✅ Accessible via keyboard

Integration considered **FAIL** if:
- ❌ Any critical test fails (Tests 1-9)
- ❌ Console errors present
- ❌ Performance below benchmarks
- ❌ Broken in any target browser

---

**Last Updated:** December 2025
**Integration Version:** 1.0
**Status:** ✅ Ready for Testing
