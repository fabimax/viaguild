import { PrismaClient, GuildRole, Guild, User, Permission } from '@prisma/client';
import { faker } from '@faker-js/faker';

const SPECIAL_GUILD_NAME = 'TheNexusHub'; // For Special Guild

export async function seedCustomGuildRoles(prisma: PrismaClient) {
  console.log('Seeding custom guild roles and their permissions (including for Special Guild)...');

  const allGuildsInitial = await prisma.guild.findMany({
    include: { memberships: { include: { user: true } } } 
  });

  const specialGuild = allGuildsInitial.find(g => g.name === SPECIAL_GUILD_NAME);
  const otherGuilds = allGuildsInitial.filter(g => g.name !== SPECIAL_GUILD_NAME);

  if (allGuildsInitial.length === 0) {
    console.log('No guilds found to add custom roles to, skipping.');
    return;
  }

  const users = await prisma.user.findMany();
  const memberSystemRole = await prisma.guildRole.findFirst({
    where: { name: 'MEMBER', isSystemRole: true, guildId: null },
    select: { id: true }
  });
  const allPermissions = await prisma.permission.findMany();

  if (!memberSystemRole) {
    console.error('Could not find MEMBER system guild role. Skipping custom guild role assignments.');
    return;
  }
  if (allPermissions.length === 0) { console.warn('No permissions found to assign to custom roles.'); return; }

  const customRolesCreated: GuildRole[] = [];
  
  // Process a limited number of 'other' guilds for general custom roles
  const numberOfGeneralGuildsToProcess = Math.min(otherGuilds.length, 3); // Example: up to 3 'other' guilds
  const guildsForGeneralRoles = faker.helpers.shuffle(otherGuilds).slice(0, numberOfGeneralGuildsToProcess);

  for (const guild of guildsForGeneralRoles) {
    const roleName = `Custom ${faker.person.jobTitle()} GenFor_${guild.name.substring(0,3)}`;
    const roleNameCi = roleName.toLowerCase();
    try {
      const customRole = await prisma.guildRole.create({
        data: { 
            name: roleName, 
            name_ci: roleNameCi,
            description: `A custom role for ${guild.name}: ${faker.lorem.sentence()}`, 
            guildId: guild.id, 
            isSystemRole: false, 
            isDefaultRole: false 
        },
      });
      customRolesCreated.push(customRole); 
      console.log(`Created general custom guild role: "${customRole.name}" for guild ${guild.name}`);
      const permissionsToAssign = faker.helpers.arrayElements(allPermissions.filter(p => !p.key.startsWith('SYSTEM_') && !p.key.startsWith('CLUSTER_')), faker.number.int({ min: 1, max: 3 }));
      const assigner = faker.helpers.arrayElement(users);
      for (const perm of permissionsToAssign) {
        try {
          await prisma.guildRolePermission.create({ data: { guildRoleId: customRole.id, permissionId: perm.id, assignedById: assigner.id }});
        } catch (e:any) {if (e.code !== 'P2002') console.error(`Error assigning perm ${perm.key} to role ${customRole.name}`, e);}
      }
    } catch (e: any) { 
        if (e.code === 'P2002' && e.meta?.target?.includes('unique_custom_guild_role_name_ci')) { 
            console.warn(`Custom guild role '${roleName}' likely already exists for ${guild.name}.`); 
        } else { 
            console.error(`Error creating general custom guild role "${roleName}" for ${guild.name}:`, e);
        }
    }
  }

  // Create specific custom roles for TheNexusHub
  if (specialGuild) {
    const specialRoleNamesAndPerms = [
      { name: 'Nexus Guardian', perms: ['GUILD_EDIT_DETAILS', 'GUILD_MANAGE_CONTACTS', 'GUILD_KICK_MEMBER', 'GUILD_VIEW_MEMBERSHIP_DETAILS'] },
      { name: 'Event Maestro', perms: ['GUILD_INVITE_MEMBER', 'GUILD_MANAGE_CATEGORIES', 'GUILD_BADGE_ASSIGN_TO_MEMBER'] },
    ];
    const assigner = faker.helpers.arrayElement(users);
    for (const roleDetail of specialRoleNamesAndPerms) {
      const roleNameCi = roleDetail.name.toLowerCase();
      try {
        const customRole = await prisma.guildRole.create({
          data: { 
            name: roleDetail.name, 
            name_ci: roleNameCi,
            description: `A special role for ${specialGuild.name}`, 
            guildId: specialGuild.id, 
            isSystemRole: false, 
            isDefaultRole: false 
        },
        });
        customRolesCreated.push(customRole); 
        console.log(`Created SPECIAL custom guild role: "${customRole.name}" for guild ${specialGuild.name}`);
        const permissionsForSpecialRole = allPermissions.filter(p => roleDetail.perms.includes(p.key));
        for (const perm of permissionsForSpecialRole) {
          try{
            await prisma.guildRolePermission.create({ data: { guildRoleId: customRole.id, permissionId: perm.id, assignedById: assigner.id }});
          } catch (e:any) {if (e.code !== 'P2002') console.error(`Error assigning perm ${perm.key} to special role ${customRole.name}`, e);}
        }
      } catch (e: any) { 
          if (e.code === 'P2002' && e.meta?.target?.includes('unique_custom_guild_role_name_ci')) { 
            console.warn(`Special Custom guild role '${roleDetail.name}' likely already exists for ${specialGuild.name}.`);
          } else {
            console.error(`Error creating SPECIAL custom guild role "${roleDetail.name}" for ${specialGuild.name}:`, e);
          }
      }
    }
  } else {
      console.warn(`Special Guild ${SPECIAL_GUILD_NAME} not found. Cannot seed its specific custom roles.`);
  }

  // Assign custom roles to members
  // This part will iterate through ALL guilds again (special + others) to assign any created custom roles to their members.
  let rolesAssignedCount = 0;
  for (const guild of allGuildsInitial) { // Iterate all guilds that were initially fetched
    const guildSpecificCustomRoles = customRolesCreated.filter(cr => cr.guildId === guild.id);

    if (guildSpecificCustomRoles.length > 0 && guild.memberships.length > 0) {
      const membersToPotentiallyPromote = guild.memberships;
      const shuffledMembers = faker.helpers.shuffle(membersToPotentiallyPromote);

      for (const customRole of guildSpecificCustomRoles) {
        const membersToAssignThisRole = shuffledMembers.slice(0, faker.number.int({ min: 1, max: Math.min(2, shuffledMembers.length) }));
        
        for (const membership of membersToAssignThisRole) {
          try {
            await prisma.userGuildRole.create({
              data: {
                guildMembershipId: membership.id,
                guildRoleId: customRole.id,
              },
            });
            rolesAssignedCount++;
            console.log(`     Assigned custom guild role "${customRole.name}" to member ${membership.user.username} in guild "${guild.name}".`);
          } catch (e: any) {
            if (e.code === 'P2002') {
              console.log(`     User ${membership.user.username} already has role "${customRole.name}" in guild "${guild.name}".`);
            } else {
              console.error(`Error assigning custom role "${customRole.name}" to user ${membership.user.username} in guild ${guild.name}:`, e);
            }
          }
        }
      }
    }
  }

  const actualCreatedCustomRolesCount = customRolesCreated.length; 
  console.log(`✅ Custom guild roles seeding finished. ${actualCreatedCustomRolesCount} distinct custom guild roles created/processed, ${rolesAssignedCount} role assignments to users made.`);
} 