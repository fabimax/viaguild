# ViaGuild Data Implementation Plan

This document outlines the next steps for implementing the ViaGuild application's data layer, focusing on database seeding and image handling for avatars and badges.

## Summary Checklist

- [ ] Install Sharp.js and related packages in the server directory
- [ ] Create upload directory structure
- [ ] Implement image processing utilities
- [ ] Create new seed files:
  - [ ] Guild contacts
  - [ ] Badge templates and instances with placeholder images
  - [ ] Badge cases
  - [ ] Guild relationships
- [ ] Update the main seed file to include new seeders
- [ ] Run the seed process
- [ ] Create API endpoints for the Guild Overview page
- [ ] Create new GuildOverviewPage.jsx (or modify it if the user has already created it) - but keep the temp version, GuildOverviewPage.temp.jsx, as reference
- [ ] Implement the Avatar component with fallback
- [ ] Add image upload functionality 


## 1. Image Storage Implementation

We'll use Sharp.js for image processing with local storage during development.

### Setup Steps

1. **Install dependencies in the server directory:**
   ```bash
   cd server
   npm install sharp uuid multer
   ```

2. **Create directory structure for uploads:**
   ```bash
   mkdir -p server/public/uploads/{users,guilds,badges}
   ```

3. **Implement image processing utility:**
   Create `server/src/utils/imageProcessor.ts`:
   ```typescript
   import sharp from 'sharp';
   import fs from 'fs';
   import path from 'path';
   import { v4 as uuidv4 } from 'uuid';

   // Base directory for uploads
   const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

   // Image sizes
   const SIZES = {
     sm: 64,
     md: 128,
     lg: 256
   };

   /**
    * Process and save an uploaded image
    * @param buffer The image buffer
    * @param entityType Type of entity (users, guilds, badges)
    * @param entityId ID of the entity
    * @returns Object with paths to different sized images
    */
   export async function processImage(buffer: Buffer, entityType: 'users' | 'guilds' | 'badges', entityId: string) {
     const dir = path.join(UPLOAD_DIR, entityType, entityId);
     
     // Ensure directory exists
     await fs.promises.mkdir(dir, { recursive: true });
     
     // Generate unique filename
     const filename = uuidv4();
     
     // Create versions in different sizes
     const result: Record<string, string> = {};
     
     // Create small version (64x64)
     await sharp(buffer)
       .resize(SIZES.sm, SIZES.sm)
       .webp({ quality: 80 })
       .toFile(path.join(dir, `${filename}-sm.webp`));
     result.small = `/uploads/${entityType}/${entityId}/${filename}-sm.webp`;
     
     // Create medium version (128x128)
     await sharp(buffer)
       .resize(SIZES.md, SIZES.md)
       .webp({ quality: 80 })
       .toFile(path.join(dir, `${filename}-md.webp`));
     result.medium = `/uploads/${entityType}/${entityId}/${filename}-md.webp`;
     
     // Create large version (256x256)
     await sharp(buffer)
       .resize(SIZES.lg, SIZES.lg)
       .webp({ quality: 80 })
       .toFile(path.join(dir, `${filename}-lg.webp`));
     result.large = `/uploads/${entityType}/${entityId}/${filename}-lg.webp`;
     
     return result;
   }
   ```

4. **Implement upload middleware with Multer:**
   Create `server/src/middleware/uploadMiddleware.ts`:
   ```typescript
   import multer from 'multer';

   // Configure storage to memory
   const storage = multer.memoryStorage();

   // Create multer instance
   export const upload = multer({
     storage,
     limits: {
       fileSize: 1 * 1024 * 1024, // 1MB limit
     },
     fileFilter: (req, file, cb) => {
       // Accept only images
       if (file.mimetype.startsWith('image/')) {
         cb(null, true);
       } else {
         cb(new Error('Only image files are allowed'));
       }
     }
   });
   ```

5. **Update avatar/badge upload routes to use the middleware and image processor**

## 2. Database Seeding Extension

We'll extend the existing seed structure to include all entities needed for the Guild Overview page.

### Generate Badge Placeholder Images

To generate placeholder badge images during seeding, we'll include a function in the badge seeder to create visual representations:

```typescript
// Add to badges.ts seeder
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Inside seedBadges function
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/badges');

// Define SVG icons for badge placeholders
const icons = [
  // Heart icon
  '<path d="M128,190 c-8,0 -75,-40 -75,-90 c0,-25 20,-40 45,-40 c15,0 23,8 30,20 c7,-12 15,-20 30,-20 c25,0 45,15 45,40 c0,50 -67,90 -75,90 z" fill="white"/>',
  
  // Star icon
  '<path d="M128,70 L150,115 L200,115 L160,145 L170,195 L128,170 L86,195 L96,145 L56,115 L106,115 Z" fill="white"/>',
  
  // Shield icon
  '<path d="M128,190 c0,0 -60,-30 -60,-80 v-40 h120 v40 c0,50 -60,80 -60,80 z" fill="white"/>',
  
  // Coffee icon
  '<path d="M85,90 v60 c0,20 20,35 45,35 s45,-15 45,-35 v-60 z" fill="white"/><path d="M75,90 h110 v15 h-110 z" fill="white"/><path d="M180,115 h15 c10,0 15,10 15,20 c0,10 -5,20 -15,20 h-15 z" fill="white"/>',
];

// Available distinct colors
const distinctColors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', 
  '#10B981', '#06B6D4', '#3B82F6', '#6366F1', 
  '#8B5CF6', '#D946EF', '#EC4899', '#F43F5E'
];

// Ensure directory exists
await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });

// Create placeholder badge images
for (const badge of badgeData) {
  const filename = `placeholder-${badge.name.toLowerCase().replace(/\s+/g, '-')}.webp`;
  const filePath = path.join(UPLOAD_DIR, filename);
  
  // Sometimes match border color, sometimes use distinct color (50/50 chance)
  const useBorderColor = Math.random() > 0.5;
  let fillColor;
  
  if (useBorderColor) {
    fillColor = badge.borderColor;
  } else {
    // Pick a random color different from border
    const availableColors = distinctColors.filter(c => c !== badge.borderColor);
    fillColor = availableColors[Math.floor(Math.random() * availableColors.length)];
  }
  
  // Pick a random icon
  const randomIcon = icons[Math.floor(Math.random() * icons.length)];
  
  // Create SVG
  const svg = `
    <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="256" height="256" fill="${fillColor}"/>
      ${randomIcon}
    </svg>
  `;
  
  // Convert SVG to WebP image
  await sharp(Buffer.from(svg))
    .resize(256, 256)
    .webp({ quality: 90 })
    .toFile(filePath);
  
  console.log(`Created placeholder badge: ${filename}`);
}
```

### Create New Seed Files

1. **Guild Contacts Seeder**
   Create `server/prisma/seeds/contacts.ts`:
   ```typescript
   import { PrismaClient, ContactType } from '@prisma/client';

   export async function seedContacts(prisma: PrismaClient) {
     console.log('📇 Seeding guild contacts...');
     
     // Get all guilds to add contacts to
     const guilds = await prisma.guild.findMany();
     
     // Create contacts for the Design Masters guild (assuming it exists)
     const designMasters = guilds.find(g => g.name === 'Design Masters');
     if (designMasters) {
       await prisma.guildContact.createMany({
         data: [
           {
             guildId: designMasters.id,
             type: ContactType.DISCORD,
             label: 'Discord Server',
             value: 'discord.gg/designmasters',
             displayOrder: 0,
           },
           {
             guildId: designMasters.id,
             type: ContactType.TWITTER,
             label: 'Twitter',
             value: '@DesignMasters',
             displayOrder: 1,
           },
           {
             guildId: designMasters.id,
             type: ContactType.WEBSITE,
             label: 'Website',
             value: 'designmasters.community',
             displayOrder: 2,
           },
         ],
         skipDuplicates: true,
       });
     }
     
     // Add some contacts to other guilds
     for (const guild of guilds.filter(g => g.name !== 'Design Masters')) {
       await prisma.guildContact.create({
         data: {
           guildId: guild.id,
           type: ContactType.DISCORD,
           label: 'Discord Server',
           value: `discord.gg/${guild.name.toLowerCase().replace(/\s+/g, '')}`,
           displayOrder: 0,
         },
       });
     }
     
     console.log('✅ Guild contacts seeded');
   }
   ```

2. **Badge Templates and Instances Seeder**
   Create `server/prisma/seeds/badges.ts`:
   ```typescript
   import { PrismaClient, BadgeShape, BadgeTier } from '@prisma/client';
   import sharp from 'sharp';
   import fs from 'fs';
   import path from 'path';

   export async function seedBadges(prisma: PrismaClient) {
     console.log('🏅 Seeding badge templates and instances...');
     
     // Get reference data
     const users = await prisma.user.findMany();
     const guilds = await prisma.guild.findMany();
     const designMasters = guilds.find(g => g.name === 'Design Masters');
     
     if (!designMasters || users.length < 3) {
       console.log('⚠️ Missing required data for badge seeding');
       return;
     }
     
     // Define badge templates
     const badgeData = [
       { 
         name: 'Design Excellence', 
         borderColor: '#f59e0b', 
         shapeType: BadgeShape.CIRCLE, 
         tier: BadgeTier.GOLD 
       },
       { 
         name: 'Mentor\'s Star', 
         borderColor: '#94a3b8', 
         shapeType: BadgeShape.STAR, 
         tier: BadgeTier.SILVER 
       },
       { 
         name: 'Community Contributor', 
         borderColor: '#b45309', 
         shapeType: BadgeShape.HEART, 
         tier: BadgeTier.BRONZE 
       },
       { 
         name: 'Innovative Concept', 
         borderColor: '#14b8a6', 
         shapeType: BadgeShape.HEXAGON 
       },
       { 
         name: 'Challenge Winner', 
         borderColor: '#8b5cf6', 
         shapeType: BadgeShape.CIRCLE 
       },
     ];
     
     // Generate badge placeholder images first
     // [Placeholder generation code from above goes here]
     const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/badges');
     // ... [Include the placeholder generation code shown above] ...
     
     // Create badge templates after generating images
     for (const badge of badgeData) {
       await prisma.badgeTemplate.create({
         data: {
           name: badge.name,
           borderColor: badge.borderColor,
           shapeType: badge.shapeType,
           tier: badge.tier,
           description: `The ${badge.name} badge recognizes outstanding contributions in this area.`,
           creatorId: users[0].id, // First user as creator
           guildId: designMasters.id,
           imageUrl: `/uploads/badges/placeholder-${badge.name.toLowerCase().replace(/\s+/g, '-')}.webp`,
         }
       });
     }
     
     // Get created templates
     const badgeTemplates = await prisma.badgeTemplate.findMany();
     
     // Create badge instances (awards)
     // For each template, create multiple instances given to different users
     for (const template of badgeTemplates) {
       // Create 5-15 instances of each badge
       const instanceCount = Math.floor(Math.random() * 10) + 5;
       
       for (let i = 0; i < instanceCount; i++) {
         // Randomly select recipient and giver (different users)
         const receiverIndex = Math.floor(Math.random() * users.length);
         let giverIndex;
         do {
           giverIndex = Math.floor(Math.random() * users.length);
         } while (giverIndex === receiverIndex);
         
         await prisma.badgeInstance.create({
           data: {
             templateId: template.id,
             receiverId: users[receiverIndex].id,
             giverId: users[giverIndex].id,
             message: `Great work on your contributions to ${designMasters.name}!`,
           }
         });
       }
     }
     
     console.log('✅ Badge templates and instances seeded');
   }
   ```

3. **Badge Cases Seeder**
   Create `server/prisma/seeds/badgeCases.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client';

   export async function seedBadgeCases(prisma: PrismaClient) {
     console.log('🏆 Seeding badge cases...');
     
     // Get reference data
     const users = await prisma.user.findMany();
     const guilds = await prisma.guild.findMany();
     const badgeInstances = await prisma.badgeInstance.findMany({
       include: { template: true },
     });
     
     // Create user badge cases
     for (const user of users) {
       // Create badge case for user
       const userCase = await prisma.userBadgeCase.create({
         data: {
           userId: user.id,
           title: `${user.username}'s Achievements`,
           isPublic: true,
         }
       });
       
       // Add badges received by this user to their case
       const userBadges = badgeInstances.filter(b => b.receiverId === user.id);
       
       for (let i = 0; i < userBadges.length; i++) {
         await prisma.userBadgeItem.create({
           data: {
             badgeCaseId: userCase.id,
             badgeInstanceId: userBadges[i].id,
             displayOrder: i,
           }
         });
       }
     }
     
     // Create guild badge cases
     for (const guild of guilds) {
       // Create badge case for guild
       const guildCase = await prisma.guildBadgeCase.create({
         data: {
           guildId: guild.id,
           title: `${guild.name} Showcase`,
           isPublic: true,
         }
       });
       
       // Find badge instances to add to guild case
       // For demonstration, we'll add instances where the receiver is a member of this guild
       const guildMembers = await prisma.guildMembership.findMany({
         where: { guildId: guild.id },
         select: { userId: true },
       });
       const memberIds = guildMembers.map(m => m.userId);
       
       // Find badges received by guild members
       const relevantBadges = badgeInstances.filter(b => memberIds.includes(b.receiverId));
       
       // Add up to 15 badges to the guild case
       const badgesToAdd = relevantBadges.slice(0, 15);
       
       for (let i = 0; i < badgesToAdd.length; i++) {
         await prisma.guildBadgeItem.create({
           data: {
             badgeCaseId: guildCase.id,
             badgeInstanceId: badgesToAdd[i].id,
             displayOrder: i,
           }
         });
       }
       
       // Set a featured badge if available
       if (badgesToAdd.length > 0) {
         // Find the first guild badge item to use as featured
         const firstItem = await prisma.guildBadgeItem.findFirst({
           where: { badgeCaseId: guildCase.id },
         });
         
         if (firstItem) {
           await prisma.guildBadgeCase.update({
             where: { id: guildCase.id },
             data: { featuredBadgeId: firstItem.id },
           });
         }
       }
     }
     
     console.log('✅ Badge cases seeded');
   }
   ```

4. **Guild Relationships Seeder**
   Create `server/prisma/seeds/relationships.ts`:
   ```typescript
   import { PrismaClient, RelationshipType } from '@prisma/client';

   export async function seedRelationships(prisma: PrismaClient) {
     console.log('🔄 Seeding guild relationships...');
     
     // Get reference data
     const guilds = await prisma.guild.findMany();
     const users = await prisma.user.findMany();
     
     if (guilds.length < 5 || users.length === 0) {
       console.log('⚠️ Not enough guilds or users for relationship seeding');
       return;
     }
     
     // Find the Design Masters guild
     const designMasters = guilds.find(g => g.name === 'Design Masters');
     if (!designMasters) {
       console.log('⚠️ Design Masters guild not found');
       return;
     }
     
     // Create relationship pairs to match the UI mockup
     const relationshipData = [
       {
         sourceName: 'Design Masters',
         targetName: 'UI Innovators',
         type: RelationshipType.PARTNER,
         reciprocalType: RelationshipType.PARTNER
       },
       {
         sourceName: 'Design Masters',
         targetName: 'Creative Pros',
         type: RelationshipType.CHILD,
         reciprocalType: RelationshipType.PARENT
       },
       {
         sourceName: 'Design Masters',
         targetName: 'Design Thinking',
         type: RelationshipType.PARENT,
         reciprocalType: RelationshipType.CHILD
       },
       {
         sourceName: 'Design Masters',
         targetName: 'Frontend Artists',
         type: RelationshipType.CLUSTER,
         reciprocalType: RelationshipType.CLUSTER
       },
       {
         sourceName: 'Design Masters',
         targetName: 'UX Research Lab',
         type: RelationshipType.RIVAL,
         reciprocalType: RelationshipType.RIVAL
       },
     ];
     
     // Create a map for easier lookup
     const guildNameMap = new Map(guilds.map(g => [g.name, g]));
     
     // Create relationships
     for (const relation of relationshipData) {
       const sourceGuild = guildNameMap.get(relation.sourceName);
       let targetGuild = guildNameMap.get(relation.targetName);
       
       // If target guild doesn't exist, create it first
       if (!targetGuild) {
         targetGuild = await prisma.guild.create({
           data: {
             name: relation.targetName,
             description: `${relation.targetName} is a guild focused on design and creativity.`,
             createdById: users[0].id, // First user as creator
           }
         });
         // Add to map for potential future lookups
         guildNameMap.set(relation.targetName, targetGuild);
       }
       
       // Create the main relationship
       await prisma.guildRelationship.create({
         data: {
           sourceGuildId: sourceGuild!.id,
           targetGuildId: targetGuild.id,
           type: relation.type,
           createdById: users[0].id, // First user as creator
         }
       });
       
       // Create the reciprocal relationship
       await prisma.guildRelationship.create({
         data: {
           sourceGuildId: targetGuild.id,
           targetGuildId: sourceGuild!.id,
           type: relation.reciprocalType,
           createdById: users[0].id, // First user as creator
         }
       });
     }
     
     console.log('✅ Guild relationships seeded');
   }
   ```

5. **Update Main Seed File**
   Update `server/prisma/seed.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client'
   import { seedUsers } from './seeds/users'
   import { seedGuilds } from './seeds/guilds'
   import { seedMemberships } from './seeds/memberships'
   import { seedContacts } from './seeds/contacts'
   import { seedBadges } from './seeds/badges'
   import { seedBadgeCases } from './seeds/badgeCases'
   import { seedRelationships } from './seeds/relationships'

   const prisma = new PrismaClient()

   async function main() {
     console.log('🌱 Starting seed process...')
     
     // Order matters for relationships
     await seedUsers(prisma)
     await seedGuilds(prisma)
     await seedMemberships(prisma)
     await seedContacts(prisma)
     await seedBadges(prisma)
     await seedBadgeCases(prisma)
     await seedRelationships(prisma)
     
     console.log('✅ Seed completed successfully')
   }

   main()
     .then(async () => {
       await prisma.$disconnect()
     })
     .catch(async (e) => {
       console.error('❌ Seed error:', e)
       await prisma.$disconnect()
       process.exit(1)
     })
   ```

## 3. Connecting the Frontend to Real Data

Once the database is seeded, the next steps involve:

1. **Create API endpoints** for the Guild Overview page:
   - `/api/guilds/:id` - Get all guild details
   - `/api/guilds/:id/members` - Get guild members
   - `/api/guilds/:id/badges` - Get guild badge showcase
   - `/api/guilds/:id/relationships` - Get guild relationships
   - `/api/guilds/:id/contacts` - Get guild contacts

2. **Create a new Guild Overview component**:
   - Keep `GuildOverviewPage.temp.jsx` as a reference mockup with static data
   - Create a new `GuildOverviewPage.jsx` that fetches and displays real data
   - Implement loading states and error handling in the new component

3. **Implement fallbacks for missing avatars**:
   - Create a utility function to generate initials and consistent colors based on user/guild names
   - Use this as a fallback when avatar images aren't available

4. **Add image upload functionality**:
   - Implement forms for uploading guild avatars
   - Implement badge image uploads for badge templates

## 4. Frontend Avatar Component Implementation

Create a reusable avatar component that handles the fallback to initials:

```typescript
// client/src/components/Avatar.tsx
import React from 'react';

type AvatarProps = {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
};

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  name, 
  size = 'md',
  shape = 'circle' 
}) => {
  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Generate a deterministic color based on name
  const getColor = (name: string) => {
    const colors = [
      '#4f46e5', '#8b5cf6', '#ec4899', '#0ea5e9', 
      '#f97316', '#84cc16', '#3b82f6', '#a78bfa',
      '#f43f5e', '#06b6d4', '#14b8a6', '#eab308'
    ];
    
    // Simple hash function to get consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Size mapping
  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  }[size];
  
  // Shape mapping
  const shapeClass = {
    circle: 'rounded-full',
    square: 'rounded-md',
  }[shape];
  
  // If image exists, render it
  if (src) {
    return (
      <div className={`${sizeClass} ${shapeClass} overflow-hidden`}>
        <img 
          src={src} 
          alt={`${name}'s avatar`} 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  
  // Otherwise render initials with background color
  const initials = getInitials(name);
  const bgColor = getColor(name);
  
  return (
    <div
      className={`${sizeClass} ${shapeClass} flex items-center justify-center text-white font-medium`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
};

export default Avatar;
```
