# ViaGuild Role System Documentation

## Overview
The ViaGuild role system provides a flexible and extensible way to manage permissions and access control within guilds. It consists of several key components:

1. **Role Model**
   - Core model for defining roles
   - Can be system-wide or guild-specific
   - Supports custom roles per guild
   - Includes default role designation

2. **Permission System**
   - Granular permission control
   - Permissions can be grouped for UI organization
   - Permissions are assigned to roles through RolePermission

3. **User System Roles**
   - System-wide role assignments
   - Used for platform-level permissions
   - Separate from guild-specific roles

## Key Components

### Role
```prisma
model Role {
  id            String    @id @default(cuid())
  name          String    // e.g., "Owner", "Admin", "Member"
  description   String?
  guildId       String?   // null for system roles
  isSystemRole  Boolean   @default(false)
  isDefaultRole Boolean   @default(false)
  // ... relations
}
```

### Permission
```prisma
model Permission {
  id              String   @id @default(cuid())
  key             String   @unique
  description     String?
  permissionGroup String?  // For UI grouping
  // ... relations
}
```

### RolePermission
```prisma
model RolePermission {
  id           String     @id @default(cuid())
  roleId       String
  permissionId String
  // ... relations
}
```

## Usage Guidelines

1. **Creating System Roles**
   - System roles should have `isSystemRole = true`
   - `guildId` should be null for system roles
   - Common system roles: "SuperAdmin", "Moderator"

2. **Creating Guild Roles**
   - Set `guildId` to the specific guild
   - Can be custom roles like "Treasurer", "Event Organizer"
   - One role per guild can be marked as `isDefaultRole`

3. **Assigning Permissions**
   - Use the `RolePermission` model to link permissions to roles
   - Permissions are grouped for better organization
   - Common permission groups: "Guild Management", "Badge Administration"

4. **Role Assignment**
   - Guild memberships use `roleId` to reference their role
   - System roles are assigned through `UserSystemRole`
   - A user can have multiple system roles

## Best Practices

1. **Role Creation**
   - Use descriptive names
   - Provide clear descriptions
   - Set appropriate default roles

2. **Permission Management**
   - Group related permissions
   - Use clear, consistent naming
   - Document permission purposes

3. **System vs Guild Roles**
   - Keep system roles minimal
   - Use guild roles for specific needs
   - Consider permission inheritance

## Migration Notes

The role system was migrated from a simple enum to this more comprehensive system. Key changes include:

1. Replaced `GuildMembership.role` enum with `roleId` relation
2. Added support for custom guild roles
3. Implemented granular permissions
4. Added system-wide role support

## Future Considerations

1. **Role Hierarchy**
   - Potential for role inheritance
   - Role-based permission inheritance

2. **Temporary Roles**
   - Time-limited role assignments
   - Role expiration system

3. **Role Templates**
   - Predefined role sets
   - Quick role setup for new guilds 