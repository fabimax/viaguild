# Prisma Schema Migration - Code Review Summary

This document summarizes the code review findings for the migration from the old Prisma schema to `new_schema.prisma`, focusing on impacts related to the role system and other relevant changes. This review corresponds to step 4 ("Review Existing Code") of the `PrismaSchemaMigrationPlan.md`.

## 1. `server/src/middleware/role.middleware.js`

*   **Core Logic (`hasGuildRole` function):**
    *   The line `if (!allowedRoles.includes(membership.role))` (around L35) directly uses the current enum-based `role` field on `GuildMembership`.
    *   **Impact:** This requires a significant rewrite. It will need to:
        1.  Access `membership.roleId` (from the modified `GuildMembership` model).
        2.  Query the new `Role` model using this `roleId` to get the role record.
        3.  Compare `role.name` (e.g., "OWNER", "ADMIN") with the `allowedRoles`.
    *   `req.guildMembership = membership;` (around L40) might need augmentation if downstream consumers expect the full role object.

*   **Specific Role Checks (`isGuildOwner`, `isGuildAdmin`, `isGuildMember`):**
    *   These definitions (L51, L56, L61) rely on `hasGuildRole` and won't change directly, but their behavior will change once `hasGuildRole` is updated. They are critical to test.

**Summary:** Primary change is within `hasGuildRole` to adapt to querying the `Role` model via `roleId`.

## 2. `server/src/services/guild.service.js`

This service requires extensive changes across most functions.

*   **`createGuild(guildData, userId)`:**
    *   `role: 'OWNER'` (around L33) needs to change to assign `roleId: ownerSystemRoleId`.

*   **`updateGuild(guildId, guildData, userId)`:**
    *   Permission check `if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN'))` (around L115) needs to use the new role system (fetch `Role` via `roleId`, check `role.name`).

*   **`deleteGuild(guildId, userId)`:**
    *   Permission check `if (!membership || membership.role !== 'OWNER')` (around L148) needs to use the new role system.

*   **`getGuildsByUserId(userId)`:**
    *   `role: membership.role,` (around L182). To return role name, the Prisma query for `GuildMembership` needs to `include: { role: { select: { name: true } } }` and the mapping becomes `role: membership.role.name`.

*   **`joinGuild(guildId, userId)`:**
    *   `role: 'MEMBER'` (around L269) needs to change to assign `roleId: memberSystemRoleId`.

*   **`leaveGuild(guildId, userId)`:**
    *   Check `if (membership.role === 'OWNER')` (around L303) needs to use the new role system.

*   **`updateMemberRole(guildId, targetUserId, role, actorUserId)`:**
    *   Actor permission check `if (!actorMembership || actorMembership.role !== 'OWNER')` (around L338) needs to use the new role system.
    *   Input `role` parameter (string name) validation (around L349) and usage. The API might change to expect `roleId`. If name is still passed, it needs to be mapped to `roleId`.
    *   Logic for changing current OWNER to ADMIN (around L354-L362): `where` clauses and `data` updates need to use `roleId` for "OWNER" and "ADMIN".
    *   Updating target member's role `data: { role }` (around L372) should become `data: { roleId: targetRoleId }`.

*   **`getGuildMembers(guildId, { page = 1, limit = 10 })`:**
    *   `role: m.role,` (around L465). Similar to `getGuildsByUserId`, needs to include `role: { select: { name: true } }` in query and map to `role: m.role.name`.

*   **`getMyGuildPermissions(guildId, userId)`:**
    *   `const role = membership.role;` (around L505) and `const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';` (around L506) need to fetch `Role` via `roleId` from membership and use `roleObject.name`.
    *   Return object (around L515) should return `role: roleObject.name`.

**Summary:**
1.  When **assigning** a role: use `roleId` of a system `Role`.
2.  When **checking** a role: fetch `GuildMembership`, get `roleId`, fetch `Role`, use `role.name`.
3.  When **returning** role info: include `role` relation in queries and return `role.name`.

## 3. `server/src/services/userService.js`

*   This is a **client-side service** using `axios` and `localStorage`.
*   **No Direct Prisma Interactions:** Does not directly use `GuildMembership.role` or the `Role` enum.
*   **Indirect Impact:** Data it fetches from backend APIs might change structure if the backend starts embedding role names differently (e.g., `membership.role.name`).
*   **Focus of Changes:** Potential changes in frontend components consuming this service if backend API responses change their role data structure.

**Summary:** No immediate backend changes in this file. Potential frontend impact.

## 4. `server/src/controllers/guild.controller.js`

*   Primarily acts as a layer between HTTP requests and `guild.service.js`.
*   **`updateMemberRole(req, res)`:**
    *   `const { role } = req.body;` (around L185).
    *   If `guild.service.js` expects `roleId` instead of a role name for its `updateMemberRole` method, the API contract for this endpoint will change. The controller will extract the new identifier (e.g., `roleId`) from `req.body`.
*   **Data Structure in Responses:**
    *   Methods returning guild/member data will reflect changes from `guild.service.js` (e.g., if role info becomes `role: { name: 'OWNER' }`). Frontend clients need to adapt.

**Summary:** Main area to watch is `updateMemberRole`'s request payload (likely changing from role name to `roleId`). Controller will mostly reflect service layer changes in responses.

## 5. `server/src/routes/guild.routes.js`

*   **No Direct Role Logic:** Maps paths to controller functions.
*   **Middleware Usage:** `authenticate` is used. The `role.middleware.js` (e.g., `isGuildAdmin`) is **not directly applied here**. Permission checks are currently handled within the service/controller layers.
*   **Route for `updateMemberRole` (`PUT /:guildId/members/:userId/role`):**
    *   Route definition itself doesn't change, but the expected payload likely will (role name to `roleId`), which is an API contract change.

**Summary:** No direct changes to this file for the migration. Permission enforcement is currently internal to services/controllers.

## 6. `server/prisma/seed.ts` (Main Seed File)

*   **Seeding Order:** Currently `seedUsers`, `seedGuilds`, `seedMemberships`.
*   **Impact:** Needs to introduce `seedRoles` (a new function/file) *before* `seedMemberships`.
    *   New order: `seedUsers`, `seedGuilds`, `seedRoles`, `seedMemberships`.

**Summary:** Update seeding order to include `seedRoles`.

## 7. `server/prisma/seeds/users.ts`

*   Focuses on `User` and `SocialAccount` creation.
*   **No Direct Role Logic or Assumptions.**

**Summary:** No changes required.

## 8. `server/prisma/seeds/guilds.ts`

*   Creates `Guild` records, assigning `createdById`.
*   **No Direct Role Assignment for Creator:** Does not create `GuildMembership` for the creator. This is presumably handled by `memberships.ts` or was expected from the service layer.
*   Uses raw SQL for insertion.

**Summary:** No direct changes for role system. `memberships.ts` must correctly create OWNER membership for the creator using the new system.

## 9. `server/prisma/seeds/memberships.ts`

This file requires significant changes.

*   **Role Assignment:**
    *   Defines members with a `role` string (e.g., `'OWNER'`) and uses `... ${role}::Role ...` in raw SQL.
    *   **Impact:**
        1.  A new `seedRoles.ts` (or equivalent) must first create system `Role` records (name, `isSystemRole: true`, `guildId: null`).
        2.  The `INSERT INTO "GuildMembership"` query must be modified to insert into the new `roleId` column using the ID of the corresponding system role, and the `::Role` cast removed.
*   **Raw SQL Queries:** Used for fetching guilds, resetting `isPrimary`, and inserting memberships.
    *   **Impact (Recommended Refactor):** Convert these to Prisma Client SDK calls (e.g., `prisma.guildMembership.create()`, `prisma.guildMembership.updateMany()`) for type safety and easier handling of `roleId`.
*   **Order of Operations:** Assumes users and guilds are seeded. `Roles` must be seeded before this script.

**Summary:**
1.  Adapt to use `roleId` (referencing system roles created in `seedRoles`).
2.  Recommended: Refactor raw SQL to Prisma Client calls.
3.  Ensure `seedRoles` runs before this.

## 10. Frontend Considerations (General Note)

*   **Displaying Roles:** Components displaying user roles need to adapt if API response structures for role information change (e.g., `membership.role.name` vs. `membership.role`).
*   **Managing Roles:** Components that allow role changes (e.g., by a guild owner) must be updated to send `roleId` (or the new expected identifier) instead of a role name string in API requests (e.g., to the `updateMemberRole` endpoint).

This concludes the summary of the code review for the schema migration. 