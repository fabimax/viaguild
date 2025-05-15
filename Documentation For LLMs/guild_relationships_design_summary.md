# Guild-to-Guild Relationship System Design Summary

This document outlines the key design decisions for implementing a guild-to-guild relationship system.

## 1. Core Goal
- Implement a system for consensual guild-to-guild relationships.
- Initial relationship types: `PARENT`, `PARTNER`, `RIVAL`. (Note: `CHILD` type removed for simplification).
- Relationships can be symmetrical (e.g., `PARTNER`) or directional (e.g., `PARENT`).
- The design considers future potential for unilateral relationships (e.g., "declare war").

## 2. `GuildRelationship` Model (for Established Relationships)
This model stores relationships that are active and agreed upon.

**Fields:**
- `id: String @id @default(uuid())`
- `sourceGuildId: String`
- `targetGuildId: String`
- `type: RelationshipType` (enum updated, see section 4)
- `proposerUserId: String?` (User who initiated the proposal or unilateral action; nullable)
- `accepterUserId: String?` (User who accepted a proposal; nullable for unilateral actions)
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`

**Relations:**
- `sourceGuild: Guild @relation("SourceRelationships", fields: [sourceGuildId], references: [id], onDelete: Cascade)`
- `targetGuild: Guild @relation("TargetRelationships", fields: [targetGuildId], references: [id], onDelete: Cascade)`
- `proposerUser: User? @relation("RelationshipProposer", fields: [proposerUserId], references: [id], onDelete: SetNull)` (New relation)
- `accepterUser: User? @relation("RelationshipAccepter", fields: [accepterUserId], references: [id], onDelete: SetNull)` (New relation)
- (The `User` model's previous `createdRelationships: GuildRelationship[] @relation("RelationshipCreator")` will be implicitly removed/modified as the `creator` field in `GuildRelationship` is removed.)

**Key Changes:**
- The existing `createdById` field will be **removed** and replaced by `proposerUserId` and `accepterUserId`.

**Unique Constraint:**
- `@@unique([sourceGuildId, targetGuildId])`: Only one relationship record can exist for a specific source guild and target guild combination.

**Naming Convention for `sourceGuildId` and `targetGuildId`:**
- **Asymmetrical Types** (e.g., `PARENT`): `sourceGuildId` represents the hierarchically dominant entity (Parent). `targetGuildId` represents the subordinate entity (which would have been Child).
- **Symmetrical Types** (e.g., `PARTNER`, `RIVAL`): Application logic will enforce a canonical ordering (e.g., the guild with the lexicographically smaller ID is `sourceGuildId`) to ensure a single representation.

## 3. `GuildRelationshipProposal` Model (New Model)
This model manages the workflow for proposing and resolving consensual relationships.

**Fields (Tentative):**
- `id: String @id @default(uuid())`
- `proposingGuildId: String` (Guild making the proposal)
- `targetGuildId: String` (Guild receiving the proposal)
- `proposedType: RelationshipType` (Enum updated, see section 4)
- `status: RelationshipProposalStatus` (New enum, see below)
- `messageFromProposer: String? @db.Text`
- `messageFromResponder: String? @db.Text`
- `proposedByUserId: String` (User from `proposingGuild` who initiated)
- `resolvedByUserId: String?` (User from `targetGuild` who accepted/rejected)
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`
- `expiresAt: DateTime?`

**Relations (Tentative):**
- `proposingGuild: Guild @relation(fields: [proposingGuildId], references: [id], onDelete: Cascade)`
- `targetGuild: Guild @relation(fields: [targetGuildId], references: [id], onDelete: Cascade)`
- `proposedByUser: User @relation(fields: [proposedByUserId], references: [id], onDelete: Cascade)`
- `resolvedByUser: User? @relation(fields: [resolvedByUserId], references: [id], onDelete: SetNull)`

**Behavior:**
- Multiple *distinct* pending proposals between the same pair of guilds are allowed (e.g., one for `PARTNER`, one for `RIVAL`).
- Identical pending proposals (same proposing guild, target guild, proposed type, and pending status) are prevented by a unique constraint.
- Application logic will handle resolution: when one proposal is accepted, other pending proposals between the same two guilds are marked `SUPERSEDED` or deleted.
- `onDelete: Cascade` on foreign keys to `Guild` ensures that if a guild is disbanded, its pending proposals (sent or received) are automatically deleted.

**Indexes:**
- `@@index([proposingGuildId])`
- `@@index([targetGuildId])`
- `@@index([status])`
- `@@index([proposedByUserId])`
- `@@index([resolvedByUserId])`
- `@@unique([proposingGuildId, targetGuildId, proposedType, status])` (Prevents identical pending proposals)

## 4. Enums

**`RelationshipType` (Updated):**
- `PARENT` (Defines a hierarchical relationship where `sourceGuildId` is parent, `targetGuildId` is child)
- `PARTNER`
- `RIVAL`
- (Future types like `WAR` can be added)

**`RelationshipProposalStatus` (New Enum):**
- `PENDING`
- `ACCEPTED`
- `REJECTED`
- `REVOKED` (By the proposer)
- `EXPIRED`
- `SUPERSEDED` (When another proposal between the same guilds is accepted)

**`NotificationType` (Existing Enum - To Be Extended):**
- Add:
    - `GUILD_RELATIONSHIP_PROPOSAL_RECEIVED`
    - `GUILD_RELATIONSHIP_PROPOSAL_ACCEPTED`
    - `GUILD_RELATIONSHIP_PROPOSAL_REJECTED`
    - `GUILD_RELATIONSHIP_PROPOSAL_REVOKED`
    - `GUILD_RELATIONSHIP_PROPOSAL_EXPIRED`

## 5. Permissions
- The existing `GUILD_MANAGE_RELATIONSHIPS` permission is sufficient.
- It covers:
    - Proposing new relationships.
    - Accepting/rejecting incoming relationship proposals.
    - Terminating existing established relationships.
    - Revoking a pending proposal sent by the user's guild.
- This permission is already assigned to `CREATOR` and `ADMIN` system roles by default.

## 6. Unilateral Relationships (Future Consideration)
- These actions (e.g., "declare war") would *not* use the `GuildRelationshipProposal` model.
- They would directly create `GuildRelationship` records.
- For such records:
    - `proposerUserId` would be the user from the initiating guild.
    - `accepterUserId` would be `null`.

## 7. Auditing
- **`GuildRelationship`**: `proposerUserId` and `accepterUserId` track key users in forming the established relationship.
- **`GuildRelationshipProposal`**: `proposedByUserId` and `resolvedByUserId` track key users in the proposal process. 