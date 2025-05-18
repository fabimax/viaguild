# Badge System Design Discussion Summary

This document summarizes the key discussion points, design evolution, and proposed solutions for the ViaGuild badge system.

## I. Initial Goal & Core Models

*   **Objective**: Seed badges and refine the badge system's design.
*   **Core Models**: `BadgeTemplate`, `BadgeInstance`, `UserBadgeAllocation`.
*   **Optional**: `UserBadgeCase`, `GuildBadgeCase`, `ClusterBadgeCase` for showcasing.

## II. `BadgeTemplate` - Ownership & Definition

### A. Initial Ownership Model:
*   Fields: `creatorUserId` and `ownedByGuildId`.
*   Ambiguity: `creatorUserId` implied personal ownership if `ownedByGuildId` was null, leading to potentially confusing queries for "created" vs. "personally owned" templates.

### B. Refined Ownership Model (for Clarity):
*   **`actualCreatorUserId: String?`**: Tracks the user who physically designed/inputted the template. Nullable.
*   **`ownedByUserId: String?`**: Explicitly indicates a user directly owns this template.
*   **`ownedByGuildId: String?`**: Explicitly indicates a guild directly owns this template.
*   **Constraint**: `ownedByUserId` and `ownedByGuildId` are mutually exclusive (enforced by application logic). System templates have both as null.
*   **Benefit**: Clearer queries for various ownership/creation scenarios.

### C. `BadgeTemplate` Lifecycle & Management:
*   **Soft Deletion/Archiving**:
    *   Implemented via an `isActive: Boolean @default(true)` field on `BadgeTemplate`.
    *   "Deleting" a template sets `isActive = false`.
    *   Awarding new badges only uses `isActive: true` templates.
    *   Existing `BadgeInstance`s still render correctly using the (now inactive) template, as they are protected by `onDelete: Restrict`.
*   **Deleting Owners (Users/Guilds) of Templates**:
    *   **Goal**: Owner deletion should always succeed. In-use templates become ownerless; unused templates get deleted.
    *   **Solution**: Application-level logic during user/guild deletion (within a transaction):
        1.  Find all templates owned by the entity.
        2.  Check each template for active `BadgeInstance`s.
        3.  Set `ownedByUserId`/`ownedByGuildId` to `null` for in-use templates.
        4.  Delete unused templates (safe due to `onDelete: Restrict` on `BadgeInstance`).
        5.  Delete the user/guild.
    *   Schema default for owner relations on `BadgeTemplate` can be `onDelete: SetNull`.

## III. `BadgeInstance` - Awarded Badges

*   **Coupling**: `BadgeInstance` is strongly coupled to `BadgeTemplate` via `templateId`.
*   **Integrity**: `BadgeInstance.template` relation uses `onDelete: Restrict` to prevent deletion of a `BadgeTemplate` if it has awarded instances.
*   **Snapshotting vs. Coupling**:
    *   **Coupled (current preferred)**: Instances reflect the current state of their template. Efficient for global updates to a badge type.
    *   **Snapshotting (decoupled)**: Instances copy all definitional data from the template at award time. Ensures historical immutability of awarded badge appearance but increases data redundancy. Considered less suitable unless absolute immutability is a hard requirement.

## IV. Dynamic & Modifiable Badges

This was a major discussion point, evolving through several ideas:

### A. `isModifiableByIssuer: Boolean` (on `BadgeTemplate`):
*   If `true`, allows the issuer to update the core appearance fields of the `BadgeTemplate` (e.g., its name, base image URL, default colors stored in your system). All `BadgeInstance`s awarded from this template reflect these global changes.

### B. "External Live Data" Approach (for highly dynamic, personalized, external data):
*   **Concept**: `BadgeTemplate` stores a `dynamicSourceUrl` (external API) and `dynamicDisplayConfig` (how to parse API response). `BadgeInstance` rendering triggers a live API call.
*   **Pros**: Real-time, personalized data per instance from any external system (e.g., live game scores, GitHub stats). Issuer doesn't need to push frequent updates to your platform.
*   **Cons**: Complexity (dev, maintenance, issuer understanding), reliability dependency, performance overhead, security concerns (API keys, external content).
*   **Best For**: Data mastered by external systems, hyper-specific to recipients, and truly real-time.

### C. "Hybrid" Approach (Issuer-Controlled Dynamism via platform - Preferred for most internal/curated dynamic needs):
*   **`BadgeTemplate.dynamicDisplayConfig: Json?`**:
    *   A JSON blob defining rendering rules: base appearance (shape, default colors, default main foreground text/icon) AND instructions on how/if to use data from `BadgeInstance.instanceData`.
    *   Specifies "slots" or "placeholders" and the keys to look for in `instanceData` to fill them or override defaults.
*   **`BadgeInstance.instanceData: Json?`**:
    *   An optional JSON blob on each awarded badge containing key-value pairs.
    *   Populated by the issuer (via API) at award time or through subsequent updates.
    *   Provides the actual values for the dynamic parts/overrides defined in the template's `dynamicDisplayConfig`.
*   **How `dynamicDisplayConfig` specifies defaults vs. `instanceData` paths**:
    *   Uses distinct keys/structures. E.g., `"borderColor": { "default": "#000", "instanceDataPath": "customBorder" }`. The rendering engine checks `instanceDataPath`; if the key is found in `instanceData`, its value is used; otherwise, the `default` is used.
    *   For list-like elements (e.g., multiple text fields), it would specify a `fieldKeyInInstanceData` for each defined slot.
*   **UI for `dynamicDisplayConfig`**: Would involve a guided interface (forms, dropdowns, color pickers, dynamic row generation for text fields) that constructs the JSON behind the scenes. A live preview is essential.
*   **Naming**: `dynamicDisplayConfig` and `instanceData` were considered good, descriptive names.
*   **`dynamicDisplayConfig` varies per template**: Different badge types will have different rendering rules and expect different data from `instanceData`, hence this config is per-template.

### D. Distinction for `InstanceTextFieldDefinition` (in the "Tables Solution" for config):
*   If using relational tables instead of JSON for config, `InstanceTextFieldDefinition` defines placeholders for text that *is part of the visual badge*, but whose content varies per instance (e.g., "\[Player Name] achieved \[Milestone Name]").
*   Later clarified to mean: If the primary badge visual is simple (e.g., one main text/icon), `InstanceTextFieldDefinition` can define **metadata fields** displayed in tooltips or detail pages, *not* directly on the compact badge image. This allows clean badge visuals with rich associated info.

## V. Configuration Storage: JSON Blobs vs. Relational Tables

*   **JSON Blobs (`dynamicDisplayConfig`, `instanceData`)**:
    *   **Pros**: Flexible, easy to evolve config structure without DB schema migrations, good for nested/varying data.
    *   **Cons**: Less self-documenting from DB schema alone, no DB-level validation of JSON structure, harder to query *within* the JSON. Security depends on application-level validation/sanitization (esp. XSS from user-provided JSON values).
    *   **Mitigation**: Detailed comments in `prisma.schema` outlining the JSON structure. Robust server-side validation of JSON content.
*   **Relational Tables (e.g., `BadgeDisplayConfig`, `InstanceTextFieldDefinition`, `InstanceDisplayDataValue`)**:
    *   **Pros**: Self-documenting schema, DB-level data type/referential integrity, easier/more performant querying on specific config fields.
    *   **Cons**: More tables/joins, less flexible for rapid config changes (requires DB migrations), more upfront schema design.
    *   This approach was detailed with specific table structures.

## VI. Image Handling

*   **User Avatars (Current State)**: `User.avatar: String?` stores either Base64 Data URLs (from new uploads via `AvatarUpload.jsx`) or direct image URLs (from seed data). Frontend `<img>` tags handle both.
*   **Badge Images (Proposed)**:
    *   **Strong preference for uploads over external URLs**: For security, availability, performance, and content control.
    *   **Mechanism**:
        1.  Dedicated API endpoint (e.g., `POST /api/assets/images`) for programmatic (and UI-driven) image uploads.
        2.  Backend uses Sharp.js for validation, processing (resize, optimize, format conversion to e.g., WebP).
        3.  Images stored in a chosen backend (local filesystem initially, future-proofed for S3/R2).
        4.  A new `UploadedAsset` Prisma model tracks metadata: `uploaderId`, `mimeType`, `sizeBytes`, `assetType`, `hostedUrl` (public URL for `<img>` tags), and crucially `storageIdentifier` (the key/filename within the specific storage system).
    *   **Integration**: `dynamicDisplayConfig` and `instanceData` would store `hostedUrl` values from `UploadedAsset` records when referring to images.
    *   **Future-Proofing for Cloud Storage (S3/R2)**:
        *   Implement a "Storage Service" abstraction in the backend.
        *   Start with a `LocalStorageService` implementation.
        *   Later, create an `S3StorageService` or `R2StorageService` implementing the same interface.
        *   Switch service implementation via config.
        *   One-time data migration script for existing assets (read from local, upload to cloud, update `UploadedAsset.hostedUrl` and `UploadedAsset.storageIdentifier`).
        *   This allows use of R2/S3 even during `localhost` development.

## VII. Final Schema Changes (Conceptual Outline)

*   **`BadgeTemplate`**: Updated ownership (`actualCreatorUserId`, `ownedByUserId`, `ownedByGuildId`), `isActive`, `isModifiableByIssuer`, `dynamicDisplayConfig: Json?`.
*   **`BadgeInstance`**: Added `instanceData: Json?`. Ensured `template` relation has `onDelete: Restrict`.
*   **`User` & `Guild`**: Updated relation names for badge templates to match new ownership fields.
*   **New `UploadedAsset` model**: To manage all uploaded images, including fields like `hostedUrl` and `storageIdentifier`.
*   **Prisma Schema Comments**: If JSON blobs are used for config, detailed comments outlining their expected structure are crucial for maintainability.

This summary should provide a comprehensive overview to aid your decision-making process.