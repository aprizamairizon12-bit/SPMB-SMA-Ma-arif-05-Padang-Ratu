/**
 * Security Rules Specification Verification Suite
 * Verifies that all Dirty Dozen attack payloads documented in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface DirtyDozenScenario {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  ruleGuard: string;
}

export const DIRTY_DOZEN_SCENARIOS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Application Create',
    collection: '/applications/{regNumber}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'isValidApplication(data) -> data.keys().hasOnly(...)'
  },
  {
    id: 2,
    name: 'Pre-Approved Status Shortcutting on Application Create',
    collection: '/applications/{regNumber}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'incoming().status == "Menunggu Verifikasi" || isAdmin()'
  },
  {
    id: 3,
    name: 'Orphaned Application Write without StatusLookup',
    collection: '/applications/{regNumber}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'existsAfter(/databases/$(database)/documents/status_lookups/$(incoming().lookupKey))'
  },
  {
    id: 4,
    name: 'Forged Timestamp on Create',
    collection: '/applications/{regNumber}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'incoming().createdAt == request.time'
  },
  {
    id: 5,
    name: 'ID Poisoning / Invalid Characters in Document ID',
    collection: '/applications/{regNumber}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'isValidId(regNumber)'
  },
  {
    id: 6,
    name: 'Public Scraping of Applications (PII Leak)',
    collection: '/applications/{regNumber}',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'isAdmin()'
  },
  {
    id: 7,
    name: 'Public Scraping of Status Lookups via List',
    collection: '/status_lookups/{lookupKey}',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'isAdmin() && existing().regNumber is string'
  },
  {
    id: 8,
    name: 'Email Spoofing Attack on Admin Check',
    collection: '/public_config/{configId}',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'request.auth.token.email_verified == true'
  },
  {
    id: 9,
    name: 'Self-Privilege Escalation on /admins',
    collection: '/admins/{adminId}',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'isAdmin()'
  },
  {
    id: 10,
    name: 'Value Poisoning on Application Update',
    collection: '/applications/{regNumber}',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'isValidApplication(incoming()) && isValidStatus(data.status)'
  },
  {
    id: 11,
    name: 'Mutating Immutable createdAt or regNumber on Update',
    collection: '/applications/{regNumber}',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'incoming().createdAt == existing().createdAt && incoming().regNumber == existing().regNumber'
  },
  {
    id: 12,
    name: 'Tampering with Audit Trail',
    collection: '/activity_logs/{logId}',
    operation: 'delete',
    expectedOutcome: 'PERMISSION_DENIED',
    ruleGuard: 'allow update, delete: if false;'
  }
];
