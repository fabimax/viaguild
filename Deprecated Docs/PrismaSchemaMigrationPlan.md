# Prisma Schema Migration Plan: Current to New Schema

## 1. Overview

This document outlines the strategy for migrating the ViaGuild application from the current Prisma schema (`server/prisma/schema.prisma`) to the new, more comprehensive schema (`Documentation For LLMs/new_schema.prisma`). The primary goal is to achieve this migration without breaking existing, implemented functionality, particularly the features completed up to and including "Phase 1: Core Guild System" as per `MVP implementation plan V4.md`.

**Key Implemented Functionality to Preserve:**
*   User registration and authentication
*   Social account linking
*   User profiles (avatar, privacy)
*   User search
*   Core Guild System:
    *   Guild creation
    *   Joining guilds
    *   Setting a primary guild
    *   Basic role understanding (Owner, Admin, Member)

**Most Critical Change:** The overhaul of the Role system from a simple enum in `GuildMembership` to dedicated `Role`, `Permission`, `RolePermission`, and `UserSystemRole` models.

## 2. Pre-Migration Steps

1.  **Backup Database:** Before any schema changes are applied, ensure a full backup of the development and staging (if applicable) databases.
2.  **Version Control:** Create a dedicated branch in Git for this migration (e.g., `feature/prisma-schema-migration`). Commit all changes incrementally.
3.  **Team Communication:** Ensure all developers are aware of the migration process and potential impacts on their ongoing work.
4.  **Review Existing Code:** Thoroughly review all code sections that interact with `GuildMembership.role`, the `Role` enum, and related guild/user management logic. Identify specific files and functions that will need modification.
    *   `server/src/middleware/role.middleware.js`
    *   `server/src/services/guild.service.js`
    *   `server/src/services/userService.js` (lesser extent)
    *   `server/src/controllers/guild.controller.js`
    *   `server/src/routes/guild.routes.js`
    *   `server/prisma/seed.ts` and `server/prisma/seeds/*`
    *   Relevant frontend components displaying or managing roles.
5.  **Environment Setup:** Ensure a local development environment can be easily reset and re-seeded to test migration scripts and changes iteratively.

## 3. Phased Migration Strategy

This migration will be executed in phases to minimize risk and allow for testing at each stage.

### Phase 0: Introduce New Schema Structure & Non-Breaking Additions

1.  **Goal:** Replace the `server/prisma/schema.prisma` file content with the new schema content.
2.  **Action:**
    *   Carefully copy the content from `Documentation For LLMs/new_schema.prisma` into `server/prisma/schema.prisma`.
    *   **Crucially, comment out or temporarily remove new relations/fields on existing models that *would* be breaking if not handled (e.g., if a new required field is added without a default and no application logic to handle it).** The initial focus is to get Prisma to recognize the *new models* and *benign changes* first.
    *   For example, the `rank: GuildMemberRank @default(E)` on `GuildMembership` can likely stay as it has a default.
    *   The `displayName` fields on `User` and `Guild` are nullable, so they are non-breaking.
    *   Focus on adding the new models: `Role`, `Permission`, `RolePermission`, `UserSystemRole`, `Category`, `GuildCategory`, `UserCategoryPrimaryGuild`, `Notification` (new structure), `BadgeTemplate` (new structure), `BadgeInstance` (new structure), `GuildAssignmentDetails`, `UserBadgeAllocation`, `UserBadgeCase`, `UserBadgeItem`, `GuildBadgeCase`, `GuildBadgeItem`.
3.  **Generate Prisma Client:** Run `npx prisma generate`.
4.  **Create Empty Migration File:** Run `npx prisma migrate dev --create-only --name initial-new-schema-structure`.
    *   Inspect the generated SQL migration file. It should primarily be `CREATE TABLE` statements for the new models and `ALTER TABLE` for adding new, non-required columns or columns with defaults.
    *   **DO NOT APPLY THIS MIGRATION YET if it attempts to drop/alter critical parts of `GuildMembership.role` in a breaking way.** The goal of this step is to get the *structure* in place. We'll handle data migration for roles next.
    *   If the auto-generated migration is too aggressive, you may need to manually edit it to only include the `CREATE TABLE` statements and safe `ALTER TABLE` statements for now.

### Phase 1: Backend - Role System Transformation & Data Migration

1.  **Goal:** Adapt backend logic to use the new `Role` model and migrate existing role data.
2.  **Actions (Iterative):**
    *   **Modify `GuildMembership` Model:**
        *   In `server/prisma/schema.prisma`, change `role Role @default(MEMBER)` to `roleId String` and add the relation `role Role @relation(fields: [roleId], references: [id], onDelete: Restrict)`.
    *   **Create System Roles:**
        *   Write a script (can be part of a migration or a separate seed script) to populate the new `Role` table with the initial system roles that correspond to the old enum values (e.g., "Owner", "Admin", "Member"). Ensure these have `isSystemRole = true` and `guildId = null`. Store their IDs.
        ```typescript
        // Example for seed or migration script
        // const ownerRole = await prisma.role.create({ data: { name: 'OWNER', isSystemRole: true, description: 'Guild Owner' } });
        // const adminRole = await prisma.role.create({ data: { name: 'ADMIN', isSystemRole: true, description: 'Guild Admin' } });
        // const memberRole = await prisma.role.create({ data: { name: 'MEMBER', isSystemRole: true, isDefaultRole: true, description: 'Guild Member' } });
        ```
    *   **Data Migration for `GuildMembership.role`:**
        *   Generate a new migration: `npx prisma migrate dev --create-only --name migrate-guildmembership-roles`.
        *   In the generated SQL migration file, or using a Prisma script:
            *   Add the `roleId` column to `GuildMembership`.
            *   Write SQL `UPDATE` statements or a script to populate `GuildMembership.roleId` based on the old `role` enum values, mapping them to the IDs of the newly created system roles.
            *   After data migration, the old `role` column can be dropped.
    *   **Update Guild Service (`server/src/services/guild.service.js`):**
        *   Modify guild creation: When a guild is created, the creator's `GuildMembership` should now be assigned the `roleId` of the "Owner" system role.
        *   Modify membership creation (join guild): New members should be assigned the `roleId` of the "Member" system role (or a default guild role if that logic is implemented).
        *   Modify functions that read/update roles to use `roleId` and interact with the `Role` model.
    *   **Update Prisma Client:** Run `npx prisma generate` after schema changes.
3.  **Testing:**
    *   Apply migrations: `npx prisma migrate dev`.
    *   Test guild creation, joining guilds, ensuring roles are correctly assigned using `roleId`.
    *   Manually inspect the database to verify `GuildMembership.roleId` is populated correctly.

### Phase 2: Backend - Update Role-Based Access Control (RBAC)

1.  **Goal:** Rewrite the `role.middleware.js` to work with the new role system.
2.  **Actions:**
    *   Modify `server/src/middleware/role.middleware.js`:
        *   The logic for checking a user's role in a guild will now involve:
            *   Fetching the `GuildMembership` for the user and guild.
            *   Accessing `guildMembership.roleId`.
            *   Fetching the `Role` record using `roleId`.
            *   Checking `role.name` (e.g., "OWNER", "ADMIN").
3.  **Testing:**
    *   Thoroughly test all API endpoints protected by this middleware to ensure permissions are correctly enforced based on the new role structure.

### Phase 3: Backend - Update Seed Scripts

1.  **Goal:** Align `prisma/seed.ts` and `prisma/seeds/*` with the new schema.
2.  **Actions:**
    *   Update `users.ts`, `guilds.ts`, `memberships.ts` (or equivalent) to:
        *   Seed `Role` data first (system roles).
        *   Ensure `GuildMembership` seeding uses `roleId` referencing the seeded roles.
    *   Add seed data for any new models if necessary for basic app functionality or testing (e.g., default `BadgeTemplates` if Phase 4 used them implicitly).
3.  **Testing:**
    *   Run seed scripts and verify the database is populated correctly. Test application functionality with seeded data.

### Phase 4: Frontend - Adapt UI for Role System

1.  **Goal:** Update frontend components that display or manage roles.
2.  **Actions:**
    *   Identify components showing member roles (e.g., guild member lists).
    *   Update API calls to fetch role information if the structure of the data has changed (e.g., role name might be nested within a `role` object: `membership.role.name`).
    *   If there are UI elements for changing roles (part of later phases but might have placeholders), ensure they are compatible with submitting `roleId`.
3.  **Testing:**
    *   Verify role information is displayed correctly.
    *   Test any UI interactions related to roles.

### Phase 5: Integrate Other Minor Schema Changes

1.  **Goal:** Incorporate other non-breaking changes from the new schema that were deferred.
2.  **Actions:**
    *   Uncomment/add any remaining fields/relations in `server/prisma/schema.prisma` from the new schema (e.g., `User.displayName`, `Guild.displayName`, `Guild.contacts`, `Guild.categories`, etc.).
    *   Generate a new migration: `npx prisma migrate dev --name incorporate-minor-additions`. Review and apply.
    *   Update services, controllers, and potentially frontend to utilize these new fields where appropriate (e.g., add `displayName` to user profile forms). This can be done incrementally.
3.  **Testing:**
    *   Test features related to the newly added fields.

### Phase 6: Final Cleanup, Comprehensive Testing, and Documentation

1.  **Goal:** Ensure the migration is complete, stable, and well-documented.
2.  **Actions:**
    *   Remove any old, unused code related to the previous role enum.
    *   Perform end-to-end testing of all implemented features (User auth, profiles, social linking, guild creation, joining, primary guild, role display, user search).
    *   Test with various user roles and scenarios.
    *   Update any internal documentation regarding the database schema or role management.
    *   Merge the `feature/prisma-schema-migration` branch into the main development branch.
3.  **Deploy:**
    *   Deploy to a staging environment first. Run all migrations. Thoroughly test.
    *   Schedule and announce production deployment. Ensure database backup before production migration.

## 4. Rollback Strategy (If Critical Issues Arise)

1.  **Isolate Issue:** Stop the migration process if critical bugs are found that break existing functionality.
2.  **Revert Code:** Checkout the commit before the migration started.
3.  **Restore Database:** Restore the database from the backup taken before the migration.
4.  **Analyze Failure:** Investigate the cause of the failure and adjust the migration plan before re-attempting.
    *   If a specific migration script caused issues, Prisma's `migrate resolve` or manual database adjustments might be needed on the failed environment before attempting to re-apply corrected migrations.

## 5. Key Considerations

*   **Iterative Application of Migrations:** Apply Prisma migrations (`prisma migrate dev`) frequently after small, logical sets of schema changes and corresponding code updates. This makes it easier to pinpoint issues.
*   **Data Integrity:** Pay close attention to data migration scripts, especially for `GuildMembership.roleId`, to ensure no data is lost or incorrectly mapped.
*   **Testing:** Automated tests (unit, integration, E2E) are crucial. Supplement with manual testing, especially for UI changes and permission-related workflows.

This plan provides a structured approach to the schema migration. Flexibility will be needed, and issues may arise, but breaking the process into smaller, testable phases will help manage complexity. 