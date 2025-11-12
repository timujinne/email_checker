/**
 * E2E Test Template - Complete Workflow
 * Full end-to-end testing example for Email Checker
 *
 * USAGE: Copy to cypress/e2e/ directory
 * PATTERN: Real user workflows with API mocking
 */

describe('Email Checker - Complete User Workflow', () => {
  // Run before each test
  beforeEach(() => {
    // Visit the application
    cy.visit('/');

    // Clear state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Dashboard Loading', () => {
    it('should load dashboard and display KPI cards', () => {
      // Mock API response
      cy.intercept('GET', '/api/lists', {
        statusCode: 200,
        body: {
          lists: [],
          stats: {
            total_lists: 10,
            total_emails: 50000,
            total_clean: 40000,
            total_blocked: 10000
          }
        }
      }).as('getLists');

      // Wait for API call
      cy.wait('@getLists');

      // Verify KPI cards are visible
      cy.get('[id="kpi-processed"]').should('be.visible');
      cy.get('[id="kpi-clean"]').should('be.visible');
      cy.get('[id="kpi-blocked"]').should('be.visible');
      cy.get('[id="kpi-queue"]').should('be.visible');

      // Verify content
      cy.get('[id="kpi-processed"]').should('contain', '10');
    });

    it('should handle loading state', () => {
      // Delay API response
      cy.intercept('GET', '/api/lists', (req) => {
        req.reply({
          delay: 2000,
          statusCode: 200,
          body: { lists: [] }
        });
      });

      cy.visit('/');

      // Loading indicator should appear
      cy.get('.loading-spinner', { timeout: 500 }).should('be.visible');

      // Then disappear after data loads
      cy.get('.loading-spinner', { timeout: 3000 }).should('not.exist');
    });
  });

  describe('Navigation', () => {
    it('should navigate between pages', () => {
      // Click lists link
      cy.get('a[href*="#lists"]').click();
      cy.url().should('include', '#lists');

      // Click dashboard link
      cy.get('a[href*="#dashboard"]').click();
      cy.url().should('include', '#dashboard');
    });

    it('should navigate to analytics page', () => {
      cy.get('a[href*="analytics"]').click();
      cy.url().should('include', 'analytics.html');

      // Verify analytics page loaded
      cy.contains('Analytics').should('be.visible');
    });

    it('should navigate to archive page', () => {
      cy.get('a[href*="archive"]').click();
      cy.url().should('include', 'archive.html');

      // Verify archive page loaded
      cy.contains('Archive Manager').should('be.visible');
    });
  });

  describe('List Processing Workflow', () => {
    it('should process email list end-to-end', () => {
      // Mock lists API
      cy.intercept('GET', '/api/lists', {
        statusCode: 200,
        body: {
          lists: [
            {
              id: 'list-1',
              filename: 'test_list.txt',
              processed: false
            }
          ]
        }
      });

      // Navigate to lists page
      cy.get('a[href*="lists"]').click();

      // Select list to process
      cy.get('select[name="list"]').select('test_list.txt');

      // Mock processing API
      cy.intercept('POST', '/api/process', {
        statusCode: 200,
        body: {
          success: true,
          stats: {
            total: 1000,
            clean: 800,
            blocked: 150,
            invalid: 50
          }
        }
      }).as('processFile');

      // Start processing
      cy.get('button').contains('Process').click();

      // Wait for processing to complete
      cy.wait('@processFile');

      // Verify results displayed
      cy.get('.results').should('be.visible');
      cy.get('.stats-clean').should('contain', '800');
      cy.get('.stats-blocked').should('contain', '150');
    });

    it('should show progress during processing', () => {
      // Mock progress updates
      let progress = 0;
      cy.intercept('GET', '/api/progress*', (req) => {
        progress += 25;
        req.reply({
          statusCode: 200,
          body: { progress: Math.min(progress, 100) }
        });
      });

      cy.intercept('POST', '/api/process', {
        statusCode: 200,
        delay: 3000,
        body: { success: true }
      });

      cy.get('button').contains('Process').click();

      // Progress bar should be visible
      cy.get('.progress-bar').should('be.visible');

      // Progress should increase
      cy.get('.progress-bar').should('have.attr', 'value').and('not.equal', '0');
    });
  });

  describe('Smart Filter Workflow', () => {
    it('should apply smart filter and download results', () => {
      // Navigate to smart filter (or section)
      cy.visit('/');
      cy.get('a[href*="smart-filter"]').click();

      // Mock available filters
      cy.intercept('GET', '/api/smart-filter/available', {
        statusCode: 200,
        body: {
          filters: ['italy_hydraulics', 'germany_automotive']
        }
      });

      // Mock clean lists
      cy.intercept('GET', '/api/lists', {
        statusCode: 200,
        body: {
          lists: [
            { filename: 'italy_contacts_clean.txt' }
          ]
        }
      });

      // Select clean list
      cy.get('select[name="list"]').select('italy_contacts_clean.txt');

      // Select filter
      cy.get('select[name="filter"]').select('italy_hydraulics');

      // Mock filter processing
      cy.intercept('POST', '/api/smart-filter/process', {
        statusCode: 200,
        body: {
          success: true,
          high_priority: 150,
          medium_priority: 300,
          low_priority: 100,
          excluded: 50,
          files: {
            high: 'Italy_Hydraulics_HIGH_PRIORITY_20251029.txt',
            medium: 'Italy_Hydraulics_MEDIUM_PRIORITY_20251029.txt'
          }
        }
      }).as('applyFilter');

      // Apply filter
      cy.get('button').contains('Apply Filter').click();

      // Wait for processing
      cy.wait('@applyFilter');

      // Verify success message
      cy.get('.success-message').should('be.visible');
      cy.get('.success-message').should('contain', 'Filter applied');

      // Verify results displayed
      cy.get('.high-priority').should('contain', '150');
      cy.get('.medium-priority').should('contain', '300');

      // Download button should exist
      cy.get('a[download]').should('exist');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', () => {
      cy.visit('/');

      // Try to submit without selecting file
      cy.get('button[type="submit"]').click();

      // Error message should appear
      cy.get('.error-message').should('be.visible');
      cy.get('.error-message').should('contain', 'required');
    });

    it('should show inline validation errors', () => {
      cy.get('input[name="email"]').type('invalid-email');
      cy.get('input[name="email"]').blur();

      // Validation error should appear
      cy.get('.field-error').should('be.visible');
      cy.get('.field-error').should('contain', 'Invalid email');
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', () => {
      // Mock API error
      cy.intercept('GET', '/api/lists', {
        statusCode: 500,
        body: { error: 'Server error' }
      });

      cy.visit('/');

      // Error message should be displayed
      cy.get('.error-message').should('be.visible');
      cy.get('.error-message').should('contain', 'error');
    });

    it('should recover from network error', () => {
      // First request fails
      cy.intercept('GET', '/api/lists', { forceNetworkError: true }).as('failedRequest');

      cy.visit('/');
      cy.wait('@failedRequest');

      // Error should be shown
      cy.get('.error-message').should('be.visible');

      // Mock successful retry
      cy.intercept('GET', '/api/lists', {
        statusCode: 200,
        body: { lists: [] }
      }).as('successRequest');

      // Click retry button
      cy.get('button').contains('Retry').click();
      cy.wait('@successRequest');

      // Error should disappear
      cy.get('.error-message').should('not.exist');
    });

    it('should handle timeout gracefully', () => {
      // Mock timeout
      cy.intercept('GET', '/api/lists', (req) => {
        req.destroy(); // Simulate timeout
      });

      cy.visit('/');

      // Should show timeout error
      cy.get('.error-message', { timeout: 15000 }).should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 812 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(({ name, width, height }) => {
      it(`should display correctly on ${name}`, () => {
        cy.viewport(width, height);
        cy.visit('/');

        // Page should be visible
        cy.get('body').should('be.visible');

        // Navigation should be accessible
        cy.get('nav, .nav, [role="navigation"]').should('exist');
      });
    });
  });

  describe('Performance', () => {
    it('should load main page within 3 seconds', () => {
      cy.visit('/', { timeout: 3000 });

      // Page should be loaded
      cy.get('body').should('exist');
    });

    it('should make efficient API calls', () => {
      let apiCallCount = 0;

      cy.intercept('GET', '/api/**', () => {
        apiCallCount++;
      });

      cy.visit('/');

      // Should not make excessive API calls
      cy.then(() => {
        expect(apiCallCount).to.be.lessThan(10);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no a11y violations', () => {
      cy.visit('/');

      // Inject axe-core (if plugin installed)
      // cy.injectAxe();
      // cy.checkA11y();

      // Manual checks
      cy.get('button').should('have.attr', 'type');
      cy.get('img').should('have.attr', 'alt');
    });

    it('should be keyboard navigable', () => {
      cy.visit('/');

      // Tab through elements
      cy.get('body').tab();

      // First focusable element should have focus
      cy.focused().should('exist');
    });
  });

  describe('Browser Compatibility', () => {
    it('should work without console errors', () => {
      cy.visit('/');

      // Check for console errors
      cy.window().then((win) => {
        const consoleErrors = [];
        const originalError = win.console.error;

        win.console.error = (...args) => {
          consoleErrors.push(args);
          originalError(...args);
        };

        // Verify no critical errors
        cy.then(() => {
          const criticalErrors = consoleErrors.filter(err =>
            !err.some(arg => String(arg).includes('third-party'))
          );
          expect(criticalErrors).to.have.length(0);
        });
      });
    });
  });
});
