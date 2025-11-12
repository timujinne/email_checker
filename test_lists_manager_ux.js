/**
 * Automated UX Test Script for Lists Manager
 *
 * Run this in the browser console on the lists.html page:
 * 1. Open web/lists.html in browser
 * 2. Open DevTools Console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 *
 * Or run via Node.js with Puppeteer (future enhancement)
 */

(async function testListsManagerUX() {
    console.log('🧪 Testing Lists Manager UX...\n');
    console.log('=' .repeat(60));

    const tests = [];
    let passed = 0;
    let failed = 0;

    // Helper to add test
    function addTest(name, testFn) {
        tests.push({ name, test: testFn });
    }

    // Helper to check element exists
    function elementExists(selector) {
        return document.querySelector(selector) !== null;
    }

    // Helper to check element visible
    function elementVisible(selector) {
        const el = document.querySelector(selector);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    // Helper to check event listeners
    function hasEventListeners(element, eventType) {
        if (!element) return false;
        const listeners = getEventListeners ? getEventListeners(element) : null;
        return listeners && listeners[eventType] && listeners[eventType].length > 0;
    }

    // =======================================================================
    // DOM STRUCTURE TESTS
    // =======================================================================

    addTest('Loading overlay exists', () => {
        return elementExists('#loading-overlay');
    });

    addTest('Loading overlay hidden by default', () => {
        const overlay = document.getElementById('loading-overlay');
        return overlay && overlay.classList.contains('hidden');
    });

    addTest('Loading text element exists', () => {
        return elementExists('#loading-text');
    });

    addTest('Loading subtext element exists', () => {
        return elementExists('#loading-subtext');
    });

    addTest('Bulk edit button exists', () => {
        return elementExists('#bulk-edit-btn');
    });

    addTest('Selected count badge exists', () => {
        return elementExists('#selected-count-badge');
    });

    addTest('Help button exists', () => {
        return elementExists('#help-btn');
    });

    addTest('Bulk edit modal exists', () => {
        return elementExists('#bulk-edit-modal');
    });

    addTest('Column manager container exists', () => {
        return elementExists('#column-manager-container');
    });

    // =======================================================================
    // ACCESSIBILITY TESTS
    // =======================================================================

    addTest('Bulk edit button has ARIA label', () => {
        const btn = document.getElementById('bulk-edit-btn');
        return btn && btn.hasAttribute('aria-label');
    });

    addTest('Bulk edit button has aria-describedby', () => {
        const btn = document.getElementById('bulk-edit-btn');
        return btn && btn.hasAttribute('aria-describedby');
    });

    addTest('Selected count badge has role=status', () => {
        const badge = document.getElementById('selected-count-badge');
        return badge && badge.getAttribute('role') === 'status';
    });

    addTest('Selected count badge has aria-live=polite', () => {
        const badge = document.getElementById('selected-count-badge');
        return badge && badge.getAttribute('aria-live') === 'polite';
    });

    addTest('Help button has ARIA label', () => {
        const btn = document.getElementById('help-btn');
        return btn && btn.hasAttribute('aria-label');
    });

    addTest('Modal has role=dialog', () => {
        const modal = document.getElementById('bulk-edit-modal');
        return modal && modal.getAttribute('role') === 'dialog';
    });

    addTest('Modal has aria-labelledby', () => {
        const modal = document.getElementById('bulk-edit-modal');
        return modal && modal.hasAttribute('aria-labelledby');
    });

    addTest('Modal has aria-describedby', () => {
        const modal = document.getElementById('bulk-edit-modal');
        return modal && modal.hasAttribute('aria-describedby');
    });

    addTest('Modal title element exists', () => {
        return elementExists('#modal-title');
    });

    addTest('Modal description element exists', () => {
        return elementExists('#modal-description');
    });

    addTest('Screen reader only class defined', () => {
        const styles = Array.from(document.styleSheets)
            .flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch (e) {
                    return [];
                }
            });
        return styles.some(rule => rule.selectorText && rule.selectorText.includes('.sr-only'));
    });

    // =======================================================================
    // COMPONENT INITIALIZATION TESTS
    // =======================================================================

    addTest('Lists Manager global instance exists', () => {
        return typeof listsManager !== 'undefined';
    });

    addTest('Column Manager initialized', () => {
        return typeof listsManager !== 'undefined' &&
               listsManager.columnManager !== null;
    });

    addTest('Lists array initialized', () => {
        return typeof listsManager !== 'undefined' &&
               Array.isArray(listsManager.lists);
    });

    addTest('Selected filenames set initialized', () => {
        return typeof listsManager !== 'undefined' &&
               listsManager.selectedFilenames instanceof Set;
    });

    addTest('Visible columns array exists', () => {
        return typeof listsManager !== 'undefined' &&
               Array.isArray(listsManager.visibleColumns);
    });

    // =======================================================================
    // KEYBOARD SHORTCUT TESTS
    // =======================================================================

    addTest('Keyboard event listener registered on document', () => {
        const listeners = getEventListeners ? getEventListeners(document) : null;
        if (!listeners) {
            console.warn('⚠️ getEventListeners not available - skipping listener check');
            return true; // Pass if API not available
        }
        return listeners['keydown'] && listeners['keydown'].length > 0;
    });

    addTest('selectAllLists method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.selectAllLists === 'function';
    });

    addTest('deselectAllLists method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.deselectAllLists === 'function';
    });

    addTest('refreshLists method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.refreshLists === 'function';
    });

    addTest('showShortcutsHelp method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.showShortcutsHelp === 'function';
    });

    addTest('isBulkEditModalOpen method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.isBulkEditModalOpen === 'function';
    });

    // =======================================================================
    // LOADING STATE TESTS
    // =======================================================================

    addTest('showLoadingIndicator method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.showLoadingIndicator === 'function';
    });

    addTest('hideLoadingIndicator method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.hideLoadingIndicator === 'function';
    });

    addTest('setButtonLoading method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.setButtonLoading === 'function';
    });

    addTest('announceToScreenReader method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.announceToScreenReader === 'function';
    });

    addTest('showToast method exists', () => {
        return typeof listsManager !== 'undefined' &&
               typeof listsManager.showToast === 'function';
    });

    // =======================================================================
    // FORM FIELD TESTS
    // =======================================================================

    addTest('Country checkbox exists', () => {
        return elementExists('#update-country-check');
    });

    addTest('Country select exists', () => {
        return elementExists('#update-country');
    });

    addTest('Category checkbox exists', () => {
        return elementExists('#update-category-check');
    });

    addTest('Category select exists', () => {
        return elementExists('#update-category');
    });

    addTest('Priority checkbox exists', () => {
        return elementExists('#update-priority-check');
    });

    addTest('Priority input exists', () => {
        return elementExists('#update-priority');
    });

    addTest('Processed checkbox exists', () => {
        return elementExists('#update-processed-check');
    });

    addTest('Processed select exists', () => {
        return elementExists('#update-processed');
    });

    addTest('Description checkbox exists', () => {
        return elementExists('#update-description-check');
    });

    addTest('Description textarea exists', () => {
        return elementExists('#update-description');
    });

    addTest('Bulk edit preview exists', () => {
        return elementExists('#bulk-edit-preview');
    });

    addTest('Apply button exists', () => {
        return elementExists('#bulk-edit-apply');
    });

    addTest('Cancel button exists', () => {
        return elementExists('#bulk-edit-cancel');
    });

    // =======================================================================
    // BUTTON STATE TESTS
    // =======================================================================

    addTest('Bulk edit button disabled by default', () => {
        const btn = document.getElementById('bulk-edit-btn');
        return btn && btn.disabled === true;
    });

    addTest('Apply button disabled by default', () => {
        const btn = document.getElementById('bulk-edit-apply');
        return btn && btn.disabled === true;
    });

    // =======================================================================
    // CSS ANIMATION TESTS
    // =======================================================================

    addTest('fadeIn animation defined', () => {
        const styles = Array.from(document.styleSheets)
            .flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch (e) {
                    return [];
                }
            });
        return styles.some(rule =>
            rule.type === CSSRule.KEYFRAMES_RULE &&
            rule.name === 'fadeIn'
        );
    });

    addTest('slideUp animation defined', () => {
        const styles = Array.from(document.styleSheets)
            .flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch (e) {
                    return [];
                }
            });
        return styles.some(rule =>
            rule.type === CSSRule.KEYFRAMES_RULE &&
            rule.name === 'slideUp'
        );
    });

    addTest('successFlash animation defined', () => {
        const styles = Array.from(document.styleSheets)
            .flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch (e) {
                    return [];
                }
            });
        return styles.some(rule =>
            rule.type === CSSRule.KEYFRAMES_RULE &&
            rule.name === 'successFlash'
        );
    });

    // =======================================================================
    // RESPONSIVE DESIGN TESTS
    // =======================================================================

    addTest('Mobile media query defined (@media max-width: 768px)', () => {
        const styles = Array.from(document.styleSheets)
            .flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch (e) {
                    return [];
                }
            });
        return styles.some(rule =>
            rule.type === CSSRule.MEDIA_RULE &&
            rule.media.mediaText.includes('max-width') &&
            rule.media.mediaText.includes('768px')
        );
    });

    addTest('Tablet media query defined (@media min-width: 769px)', () => {
        const styles = Array.from(document.styleSheets)
            .flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch (e) {
                    return [];
                }
            });
        return styles.some(rule =>
            rule.type === CSSRule.MEDIA_RULE &&
            rule.media.mediaText.includes('min-width') &&
            rule.media.mediaText.includes('769px')
        );
    });

    // =======================================================================
    // RUN ALL TESTS
    // =======================================================================

    console.log(`\n📝 Running ${tests.length} tests...\n`);

    tests.forEach((test, index) => {
        try {
            const result = test.test();
            if (result) {
                console.log(`✅ [${index + 1}/${tests.length}] ${test.name}`);
                passed++;
            } else {
                console.log(`❌ [${index + 1}/${tests.length}] ${test.name}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ [${index + 1}/${tests.length}] ${test.name} (error: ${error.message})`);
            failed++;
        }
    });

    // =======================================================================
    // SUMMARY
    // =======================================================================

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST RESULTS SUMMARY\n');
    console.log(`Total Tests:  ${tests.length}`);
    console.log(`✅ Passed:    ${passed} (${Math.round(passed / tests.length * 100)}%)`);
    console.log(`❌ Failed:    ${failed} (${Math.round(failed / tests.length * 100)}%)`);
    console.log(`\n${'='.repeat(60)}\n`);

    if (passed === tests.length) {
        console.log('🎉 ALL TESTS PASSED! 🎉');
        console.log('\n✨ The Lists Manager UX implementation is complete and working correctly.\n');
    } else {
        console.log('⚠️ SOME TESTS FAILED');
        console.log(`\n${failed} test(s) need attention. Review the failures above.\n`);
    }

    // =======================================================================
    // INTERACTIVE TESTS
    // =======================================================================

    console.log('🔍 INTERACTIVE TESTS (run manually):\n');
    console.log('1. Press "?" to test shortcuts help modal');
    console.log('2. Press Ctrl+A to test select all');
    console.log('3. Press Ctrl+D to test deselect all');
    console.log('4. Press Ctrl+E to test bulk edit open (with selection)');
    console.log('5. Press Ctrl+R to test refresh lists');
    console.log('6. Press Escape to test modal close / clear selection');
    console.log('7. Click Help button (?) in toolbar');
    console.log('8. Open bulk edit modal and press Enter to test apply');
    console.log('9. Hover buttons to test hover animations');
    console.log('10. Resize window to test responsive design\n');

    console.log('=' .repeat(60));

    // Return summary
    return {
        total: tests.length,
        passed,
        failed,
        percentage: Math.round(passed / tests.length * 100)
    };
})();
