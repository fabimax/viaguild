import { PrismaClient, Role, Guild, User, Permission } from '@prisma/client';
import { faker } from '@faker-js/faker';

const SPECIAL_GUILD_NAME = 'TheNexusHub'; // For Special Guild

export async function seedCustomGuildRoles(prisma: PrismaClient) {
  console.log('Seeding custom guild roles and their permissions (including for Special Guild)...');

  const guilds = await prisma.guild.findMany({
    take: 3, // Example: Add custom roles to the first 3 guilds
    include: { memberships: { include: { user: true } } } // Include memberships to find users
  });

  if (guilds.length === 0) {
    console.log('No guilds found to add custom roles to, skipping.');
    return;
  }

  const users = await prisma.user.findMany();
  const memberSystemRole = await prisma.role.findFirst({
    where: { name: 'MEMBER', isSystemRole: true, guildId: null },
    select: { id: true }
  });
  const allPermissions = await prisma.permission.findMany(); // Fetch all permissions

  if (!memberSystemRole) {
    console.error('Could not find MEMBER system role. Skipping custom guild role assignments.');
    return;
  }
  if (allPermissions.length === 0) { console.warn('No permissions found to assign to custom roles.'); return; }

  const customRolesCreated: Role[] = [];
  const generalGuildsForRoles = guilds.filter(g => g.name !== SPECIAL_GUILD_NAME);
  const numberOfGeneralGuildsForRoles = Math.min(generalGuildsForRoles.length, 8); // 8 general, up to 2 for special
  const guildsUsedForGeneralRoles = faker.helpers.shuffle([...generalGuildsForRoles]).slice(0, numberOfGeneralGuildsForRoles);

  // Create general custom roles (up to 8)
  for (let i = 0; i < guildsUsedForGeneralRoles.length; i++) {
    const guild = guildsUsedForGeneralRoles[i];
    const roleName = `Custom ${faker.person.jobTitle()} Gen${i + 1}`;
    try {
      const customRole = await prisma.role.create({
        data: { name: roleName, description: `A custom role for ${guild.name}: ${faker.lorem.sentence()}`, guildId: guild.id, isSystemRole: false, isDefaultRole: false },
      });
      customRolesCreated.push(customRole); console.log(`Created general custom role: ${customRole.name} for guild ${guild.name}`);
      // Assign some random permissions (e.g., 2-3)
      const permissionsToAssign = faker.helpers.arrayElements(allPermissions.filter(p => !p.key.startsWith('SYSTEM_') && !p.key.startsWith('CLUSTER_')), faker.number.int({ min: 1, max: 3 }));
      const assigner = faker.helpers.arrayElement(users);
      for (const perm of permissionsToAssign) {
        try {
          await prisma.rolePermission.create({ data: { roleId: customRole.id, permissionId: perm.id, assignedById: assigner.id }});
        } catch (e:any) {if (e.code !== 'P2002') console.error(`Error assigning perm ${perm.key} to role ${customRole.name}`, e);}
      }
    } catch (e: any) { if (e.code === 'P2002') { console.warn(`Gen Custom role '${roleName}' exists for ${guild.name}.`); } else { console.error(`Error gen custom role ${roleName} for ${guild.name}:`, e);}}
  }

  // Create specific custom roles for TheNexusHub (2 roles) and assign more/specific permissions
  const specialGuild = guilds.find(g => g.name === SPECIAL_GUILD_NAME);
  if (specialGuild) {
    const specialRoleNamesAndPerms = [
      { name: 'Nexus Guardian', perms: ['GUILD_EDIT_DETAILS', 'GUILD_MANAGE_CONTACTS', 'GUILD_KICK_MEMBER', 'GUILD_VIEW_MEMBERSHIP_DETAILS'] },
      { name: 'Event Maestro', perms: ['GUILD_INVITE_MEMBER', 'GUILD_MANAGE_CATEGORIES', 'GUILD_BADGE_ASSIGN_TO_MEMBER'] },
    ];
    const assigner = faker.helpers.arrayElement(users);
    for (const roleDetail of specialRoleNamesAndPerms) {
      try {
        const customRole = await prisma.role.create({
          data: { name: roleDetail.name, description: `A special role for ${specialGuild.name}`, guildId: specialGuild.id, isSystemRole: false, isDefaultRole: false },
        });
        customRolesCreated.push(customRole); console.log(`Created SPECIAL custom role: ${customRole.name} for guild ${specialGuild.name}`);
        const permissionsForSpecialRole = allPermissions.filter(p => roleDetail.perms.includes(p.key));
        for (const perm of permissionsForSpecialRole) {
          try{
            await prisma.rolePermission.create({ data: { roleId: customRole.id, permissionId: perm.id, assignedById: assigner.id }});
          } catch (e:any) {if (e.code !== 'P2002') console.error(`Error assigning perm ${perm.key} to special role ${customRole.name}`, e);}
        }
      } catch (e: any) { if (e.code === 'P2002') { console.warn(`Special Custom role '${roleDetail.name}' exists for ${specialGuild.name}.`);} else { console.error(`Error special custom role ${roleDetail.name} for ${specialGuild.name}:`, e);}}
    }
  } else {
      console.warn(`Special Guild ${SPECIAL_GUILD_NAME} not found for custom roles.`);
  }

  let rolesCreatedCount = 0;
  let rolesAssignedCount = 0;

  for (const guild of guilds) {
    const guildCustomRoles = [];
    // Create a couple of custom roles for this guild
    const rolesToCreateForThisGuild = faker.helpers.arrayElements(customRolesCreated, faker.number.int({ min: 1, max: 2 }));

    for (const roleDef of rolesToCreateForThisGuild) {
      try {
        const customRole = await prisma.role.upsert({
          where: { name_guildId: { name: roleDef.name, guildId: guild.id } }, // Assumes @@unique([name, guildId]) on Role
          update: { description: roleDef.description },
          create: {
            name: roleDef.name,
            description: roleDef.description,
            guildId: guild.id,
            isSystemRole: false,
            isDefaultRole: false,
          },
        });
        guildCustomRoles.push(customRole);
        rolesCreatedCount++;
        console.log(`   Upserted custom role "${customRole.name}" for guild "${guild.name}".`);
      } catch (e) {
        console.error(`Error upserting custom role ${roleDef.name} for guild ${guild.name}:`, e);
      }
    }

    // Assign these custom roles to a few existing members of the guild
    // Find members who currently only have the MEMBER system role (or any member for simplicity)
    if (guildCustomRoles.length > 0 && guild.memberships.length > 0) {
      const membersToPotentiallyPromote = guild.memberships;
      const shuffledMembers = faker.helpers.shuffle(membersToPotentiallyPromote);

      for (const customRole of guildCustomRoles) {
        // Assign this custom role to 1 or 2 members
        const membersToAssignThisRole = shuffledMembers.slice(0, faker.number.int({ min: 1, max: Math.min(2, shuffledMembers.length) }));
        
        for (const membership of membersToAssignThisRole) {
          try {
            // Create an entry in UserGuildRole
            await prisma.userGuildRole.create({
              data: {
                guildMembershipId: membership.id,
                roleId: customRole.id,
              },
            });
            rolesAssignedCount++;
            console.log(`     Assigned custom role "${customRole.name}" to member ${membership.user.username} in guild "${guild.name}".`);
            
            // Optional: If assigning a custom role should remove the generic MEMBER role
            // This part depends on your desired logic. For now, we add roles.
            // const memberRoleAssignment = await prisma.userGuildRole.findFirst({
            //   where: { guildMembershipId: membership.id, roleId: memberSystemRole.id }
            // });
            // if (memberRoleAssignment) {
            //   await prisma.userGuildRole.delete({
            //     where: { id: memberRoleAssignment.id }
            //   });
            //   console.log(`       Removed MEMBER role from ${membership.user.username} after assigning custom role.`);
            // }

          } catch (e: any) {
            if (e.code === 'P2002') { // Unique constraint violation - user already has this role in this guild membership
              // This is fine, means the role was already assigned (idempotency)
              console.log(`     User ${membership.user.username} already has role "${customRole.name}" in guild "${guild.name}".`);
            } else {
              console.error(`Error assigning custom role "${customRole.name}" to user ${membership.user.username} in guild ${guild.name}:`, e);
            }
          }
        }
      }
    }
  }

  console.log(`✅ Custom guild roles seeding finished. ${rolesCreatedCount} roles created/updated, ${rolesAssignedCount} roles assigned.`);
} 