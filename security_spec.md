# Security Specification — SPMB Online SMA Ma'arif 05 Padang Ratu

## 1. Data Invariants
1. **Default-Deny Catch-All**: Any path not explicitly matched is strictly denied (`allow read, write: if false;`).
2. **PII Isolation (Split Collection Strategy)**:
   - `/applications/{regNumber}` holds sensitive applicant PII (NIK, full address, phone numbers, parent info, uploaded documents). Read (`get` and `list`) is strictly restricted to verified admins (`isAdmin()`). Unauthenticated or non-admin users can NEVER read or list `/applications`.
   - `/status_lookups/{lookupKey}` holds minimal status verification cards keyed deterministically by `regNumber + "_" + nisn`. Public users may ONLY `get` a single lookup card if they know both `regNumber` and `nisn`. Public `list` on `/status_lookups` is strictly forbidden.
3. **Atomic Registration Creation**:
   - Creating `/applications/{regNumber}` requires that `/status_lookups/{lookupKey}` is created in the same atomic batch (`existsAfter`) and starts in initial status `"Menunggu Verifikasi"` with `createdAt == request.time`.
4. **Verified Admin Enforcement**:
   - `isAdmin()` requires `request.auth != null && request.auth.token.email_verified == true` AND either the bootstrapped owner email (`aprizamairizon12@gmail.com`) or an existing `/admins/$(request.auth.uid)` document.
5. **Immutable Audit Logs**:
   - `/activity_logs/{logId}` can only be created by `isAdmin()` with `actorUid == request.auth.uid` and `createdAt == request.time`. Updates and deletes are permanently forbidden (`if false`).

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection on Application Create**:
   `{ ...validApplication, "isAdminApproved": true }` -> Rejected by `data.keys().hasOnly(...)`.
2. **Pre-Approved Status Shortcutting on Application Create**:
   `{ ...validApplication, "status": "Diterima" }` -> Rejected because initial creation enforces `incoming().status == "Menunggu Verifikasi"`.
3. **Orphaned Application Write without StatusLookup**:
   Creating `/applications/SPMB2027-0001` without atomically writing `/status_lookups/SPMB2027-0001_0012345678` -> Rejected by `existsAfter(...)`.
4. **Forged Timestamp on Create**:
   `{ ...validApplication, "createdAt": "2020-01-01T00:00:00Z" }` -> Rejected by `incoming().createdAt == request.time`.
5. **ID Poisoning / Oversized Document ID**:
   Writing to `/applications/SPMB_2027_INVALID$ID!` -> Rejected by `isValidId(regNumber)`.
6. **Public Scraping of Applications (PII Leak)**:
   Unauthenticated or standard signed-in user calling `get` or `list` on `/applications` -> Rejected by `isAdmin()`.
7. **Public Scraping of Status Lookups**:
   Unauthenticated user calling `list` on `/status_lookups` -> Rejected because `allow list` is restricted to `isAdmin()`.
8. **Email Spoofing Attack on Admin Check**:
   User with `email == "aprizamairizon12@gmail.com"` but `email_verified == false` attempting admin write -> Rejected by `request.auth.token.email_verified == true`.
9. **Self-Privilege Escalation on `/admins`**:
   Non-admin user attempting to create `/admins/{theirUid}` with `role: "Super Admin"` -> Rejected by `isAdmin()`.
10. **Value Poisoning on Application Update**:
    Admin or user attempting to update `status` to `"LULUS_JALUR_BELAKANG"` -> Rejected by `isValidApplication(incoming())` enum check.
11. **Mutating Immutable `createdAt` or `regNumber` on Update**:
    Updating `/applications/{regNumber}` with a modified `createdAt` -> Rejected by `incoming().createdAt == existing().createdAt`.
12. **Tampering with Audit Trail**:
    Admin attempting to `update` or `delete` `/activity_logs/{logId}` -> Rejected by `allow update, delete: if false;`.
