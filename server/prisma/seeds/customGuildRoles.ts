import { PrismaClient, Role, Guild, User, Permission } from '@prisma/client';
import { faker } from '@faker-js/faker';

const SPECIAL_GUILD_NAME = 'TheNexusHub'; // For Special Guild

export async function seedCustomGuildRoles(prisma: PrismaClient) {
  console.log('Seeding custom guild roles and their permissions (including for Special Guild)...');

  const guilds = await prisma.guild.findMany();
  const users = await prisma.user.findMany();
  const memberSystemRole = await prisma.role.findFirst({ where: { name: 'MEMBER', isSystemRole: true, guildId: null } });
  const allPermissions = await prisma.permission.findMany(); // Fetch all permissions

  if (guilds.length < 10) {
    console.warn('⚠️ Not enough guilds to create 10 distinct custom roles. Skipping custom guild role seeding.');
    return;
  }
  if (users.length === 0) {
    console.warn('⚠️ No users found. Skipping custom guild role assignment.');
    return;
  }
  if (!memberSystemRole) {
    console.error('❌ System role MEMBER not found. Cannot reliably assign custom roles by updating members.');
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

  let usersAssignedCustomRolesCount = 0; 
  const targetAssignments = 20 + (specialGuild ? 4 : 0); // Slightly more to account for special guild roles

  for (let attempt = 0; attempt < 5 && usersAssignedCustomRolesCount < targetAssignments; attempt++) {
    const shuffledCustomRoles = faker.helpers.shuffle([...customRolesCreated]);
    for (const customRole of shuffledCustomRoles) {
      if (usersAssignedCustomRolesCount >= targetAssignments) break;
      if (!customRole.guildId) continue;
      const potentialMemberships = await prisma.guildMembership.findMany({
        where: { guildId: customRole.guildId, roleId: memberSystemRole.id }, // Find generic members
        select: { userId: true }, take: targetAssignments, 
      });
      const shuffledPotentialMemberships = faker.helpers.shuffle(potentialMemberships);
      for (const membershipInfo of shuffledPotentialMemberships) {
        if (usersAssignedCustomRolesCount >= targetAssignments) break;
        try {
          await prisma.guildMembership.update({
            where: { uniqueUserGuild: { userId: membershipInfo.userId, guildId: customRole.guildId }},
            data: { roleId: customRole.id },
          });
          usersAssignedCustomRolesCount++;
          console.log(`Assigned custom role ${customRole.name} to user ${membershipInfo.userId} in guild ${customRole.guildId}`);
        } catch (e:any) { if(e.code !== 'P2025'){ /* console.warn(...); */ } }
      }
    }
  }
  console.log(`Custom guild roles & permissions seeding finished. ${customRolesCreated.length} roles created, ${usersAssignedCustomRolesCount} user assignments made.`);
} 