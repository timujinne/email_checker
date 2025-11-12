/**
 * Test Fixtures Template
 * Factory functions and mock data for Email Checker tests
 *
 * USAGE: Copy to test/fixtures/ directory
 * PATTERN: Factory functions with sensible defaults and overrides
 */

// ============================================================================
// COUNTERS (for deterministic IDs)
// ============================================================================

let listIdCounter = 1;
let emailIdCounter = 1;

export function resetCounters() {
  listIdCounter = 1;
  emailIdCounter = 1;
}

// ============================================================================
// LIST FACTORIES
// ============================================================================

/**
 * Create a mock email list
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock list object
 */
export function createMockList(overrides = {}) {
  const id = `list-${listIdCounter++}`;
  const timestamp = '2025-10-29T10:00:00Z';

  return {
    id,
    filename: `test_list_${id}.txt`,
    display_name: `Test List ${id}`,
    file_type: 'txt',
    country: 'IT',
    category: 'Automotive',
    priority: 1,
    processed: false,
    date_added: timestamp,
    last_modified: timestamp,
    stats: {
      total: 1000,
      clean: 800,
      blocked: 150,
      invalid: 50,
      duplicates: 0
    },
    metadata: {
      source: 'import',
      notes: '',
      tags: []
    },
    ...overrides
  };
}

/**
 * Create a mock LVP list (with metadata)
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock LVP list object
 */
export function createMockLVPList(overrides = {}) {
  return createMockList({
    file_type: 'lvp',
    filename: `test_list_${listIdCounter}.lvp`,
    has_metadata: true,
    ...overrides
  });
}

/**
 * Create multiple mock lists
 * @param {number} count - Number of lists to create
 * @param {Object} baseOverrides - Base overrides for all lists
 * @returns {Array} Array of mock lists
 */
export function createMockLists(count, baseOverrides = {}) {
  return Array.from({ length: count }, () => createMockList(baseOverrides));
}

// ============================================================================
// EMAIL FACTORIES
// ============================================================================

/**
 * Create a mock email address
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock email object
 */
export function createMockEmail(overrides = {}) {
  const id = `email-${emailIdCounter++}`;
  const localPart = `test${emailIdCounter}`;
  const domain = 'example.com';

  return {
    id,
    address: `${localPart}@${domain}`,
    local_part: localPart,
    domain: domain,
    valid: true,
    blocked: false,
    duplicate: false,
    metadata: {
      company: 'Test Company',
      position: 'Manager',
      department: 'Sales',
      country: 'IT',
      source: 'web'
    },
    ...overrides
  };
}

/**
 * Create a blocked email
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock blocked email object
 */
export function createBlockedEmail(overrides = {}) {
  return createMockEmail({
    blocked: true,
    block_reason: 'Domain in blocklist',
    ...overrides
  });
}

/**
 * Create an invalid email
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock invalid email object
 */
export function createInvalidEmail(overrides = {}) {
  return createMockEmail({
    address: 'invalid@',
    valid: false,
    validation_error: 'Invalid domain',
    ...overrides
  });
}

/**
 * Create multiple mock emails
 * @param {number} count - Number of emails to create
 * @returns {Array} Array of mock emails
 */
export function createMockEmails(count) {
  return Array.from({ length: count }, () => createMockEmail());
}

// ============================================================================
// SMART FILTER FACTORIES
// ============================================================================

/**
 * Create a mock smart filter configuration
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock filter config
 */
export function createMockFilterConfig(overrides = {}) {
  return {
    filter_name: 'Italy Hydraulics',
    target_country: 'IT',
    target_industry: 'hydraulics',
    languages: ['it', 'en'],
    scoring: {
      weights: {
        email_quality: 0.10,
        company_relevance: 0.45,
        geographic_priority: 0.30,
        engagement: 0.15
      },
      thresholds: {
        high_priority: 100,
        medium_priority: 50,
        low_priority: 10
      }
    },
    ...overrides
  };
}

/**
 * Create mock filter results
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock filter results
 */
export function createMockFilterResults(overrides = {}) {
  return {
    success: true,
    filter_name: 'Italy Hydraulics',
    processed: 1000,
    high_priority: 150,
    medium_priority: 300,
    low_priority: 400,
    excluded: 150,
    files: {
      high: 'Italy_Hydraulics_HIGH_PRIORITY_20251029.txt',
      medium: 'Italy_Hydraulics_MEDIUM_PRIORITY_20251029.txt',
      low: 'Italy_Hydraulics_LOW_PRIORITY_20251029.txt',
      excluded: 'Italy_Hydraulics_EXCLUDED_20251029.txt'
    },
    ...overrides
  };
}

// ============================================================================
// API RESPONSE FACTORIES
// ============================================================================

/**
 * Create a successful API response
 * @param {*} data - Response data
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Mock API response
 */
export function createSuccessResponse(data, metadata = {}) {
  return {
    success: true,
    data,
    metadata: {
      timestamp: '2025-10-29T10:00:00Z',
      version: '1.0.0',
      ...metadata
    }
  };
}

/**
 * Create an error API response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Object} Mock error response
 */
export function createErrorResponse(message, code = 'SERVER_ERROR', details = {}) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: '2025-10-29T10:00:00Z'
    }
  };
}

/**
 * Create a lists API response
 * @param {Array} lists - Array of lists (or count)
 * @returns {Object} Mock lists response
 */
export function createListsResponse(lists = []) {
  const listsArray = typeof lists === 'number'
    ? createMockLists(lists)
    : lists;

  return createSuccessResponse({
    lists: listsArray,
    total: listsArray.length
  });
}

/**
 * Create a processing API response
 * @param {Object} stats - Processing stats
 * @returns {Object} Mock processing response
 */
export function createProcessingResponse(stats = {}) {
  return createSuccessResponse({
    success: true,
    stats: {
      total: 1000,
      clean: 800,
      blocked: 150,
      invalid: 50,
      ...stats
    }
  });
}

// ============================================================================
// USER FACTORIES
// ============================================================================

/**
 * Create a mock user
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: true
    },
    created_at: '2025-10-29T10:00:00Z',
    ...overrides
  };
}

/**
 * Create a mock admin user
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock admin user object
 */
export function createMockAdmin(overrides = {}) {
  return createMockUser({
    role: 'admin',
    email: 'admin@example.com',
    name: 'Admin User',
    ...overrides
  });
}

// ============================================================================
// METADATA FACTORIES
// ============================================================================

/**
 * Create mock email metadata
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock metadata object
 */
export function createMockMetadata(overrides = {}) {
  return {
    company: 'Test Company S.p.A.',
    position: 'Sales Manager',
    department: 'Sales',
    country: 'IT',
    region: 'Lombardy',
    city: 'Milan',
    industry: 'Hydraulics',
    company_size: '50-200',
    phone: '+39 02 1234567',
    website: 'https://testcompany.it',
    source: 'contact_form',
    ...overrides
  };
}

// ============================================================================
// STATISTICS FACTORIES
// ============================================================================

/**
 * Create mock processing statistics
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock statistics object
 */
export function createMockStats(overrides = {}) {
  return {
    total_lists: 10,
    total_emails: 50000,
    total_clean: 40000,
    total_blocked: 8000,
    total_invalid: 2000,
    processing_queue: 2,
    last_updated: '2025-10-29T10:00:00Z',
    ...overrides
  };
}

// ============================================================================
// BLOCKLIST FACTORIES
// ============================================================================

/**
 * Create a mock blocklist entry
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock blocklist entry
 */
export function createMockBlocklistEntry(overrides = {}) {
  return {
    email: 'blocked@spam.com',
    reason: 'Hard bounce',
    date_added: '2025-10-29T10:00:00Z',
    source: 'csv_import',
    ...overrides
  };
}

/**
 * Create multiple blocklist entries
 * @param {number} count - Number of entries
 * @returns {Array} Array of blocklist entries
 */
export function createMockBlocklist(count) {
  return Array.from({ length: count }, (_, i) =>
    createMockBlocklistEntry({
      email: `blocked${i + 1}@spam.com`
    })
  );
}

// ============================================================================
// COMPLEX SCENARIOS
// ============================================================================

/**
 * Create a complete processing scenario
 * @returns {Object} Complete scenario with lists, emails, and results
 */
export function createProcessingScenario() {
  const list = createMockList();
  const cleanEmails = createMockEmails(800);
  const blockedEmails = Array.from({ length: 150 }, () => createBlockedEmail());
  const invalidEmails = Array.from({ length: 50 }, () => createInvalidEmail());

  return {
    list,
    emails: [...cleanEmails, ...blockedEmails, ...invalidEmails],
    results: {
      clean: cleanEmails,
      blocked: blockedEmails,
      invalid: invalidEmails,
      stats: {
        total: 1000,
        clean: 800,
        blocked: 150,
        invalid: 50
      }
    }
  };
}

/**
 * Create a smart filter scenario
 * @returns {Object} Complete smart filter scenario
 */
export function createSmartFilterScenario() {
  const list = createMockList({ processed: true });
  const filter = createMockFilterConfig();
  const results = createMockFilterResults();

  return {
    list,
    filter,
    results,
    highPriorityEmails: createMockEmails(150),
    mediumPriorityEmails: createMockEmails(300),
    lowPriorityEmails: createMockEmails(400)
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Counters
  resetCounters,

  // Lists
  createMockList,
  createMockLVPList,
  createMockLists,

  // Emails
  createMockEmail,
  createBlockedEmail,
  createInvalidEmail,
  createMockEmails,

  // Filters
  createMockFilterConfig,
  createMockFilterResults,

  // API Responses
  createSuccessResponse,
  createErrorResponse,
  createListsResponse,
  createProcessingResponse,

  // Users
  createMockUser,
  createMockAdmin,

  // Metadata
  createMockMetadata,

  // Statistics
  createMockStats,

  // Blocklist
  createMockBlocklistEntry,
  createMockBlocklist,

  // Scenarios
  createProcessingScenario,
  createSmartFilterScenario
};
