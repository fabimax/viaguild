import { PrismaClient, UploadedAsset } from '@prisma/client';
import { faker } from '@faker-js/faker'; // For uploaderId if needed, and potentially other metadata if we expand

// For consistent, different images from Picsum, we use the /id/{id}/width/height format.
// Let's define some IDs and sizes we might use.

interface SeedAssetData {
  idForPicsum: number; // The ID for picsum.photos/id/{id}
  width: number;
  height: number;
  assetType: string; // e.g., "BADGE_BACKGROUND_IMAGE", "CUSTOM_BADGE_ICON", "USER_AVATAR_PLACEHOLDER"
  description?: string;
  // storageIdentifier will be the picsum URL itself for this seed
  // uploaderId can be null for system/seed assets or linked to a system user
}

const assetsToSeed: SeedAssetData[] = [
  // Backgrounds (larger, square)
  { idForPicsum: 10, width: 300, height: 300, assetType: 'BADGE_BACKGROUND_IMAGE', description: 'Abstract light streaks background' },
  { idForPicsum: 20, width: 300, height: 300, assetType: 'BADGE_BACKGROUND_IMAGE', description: 'Mountain landscape background' },
  { idForPicsum: 30, width: 300, height: 300, assetType: 'BADGE_BACKGROUND_IMAGE', description: 'Forest path background' },
  { idForPicsum: 40, width: 250, height: 250, assetType: 'BADGE_BACKGROUND_IMAGE', description: 'Cityscape background' },
  { idForPicsum: 50, width: 250, height: 250, assetType: 'BADGE_BACKGROUND_IMAGE', description: 'Ocean waves background' },

  // Icons (smaller, square - simulating custom uploaded icons, not system SVGs) - REMOVED as per discussion
  // { idForPicsum: 101, width: 64, height: 64, assetType: 'CUSTOM_BADGE_ICON', description: 'Placeholder flame icon' },
  // { idForPicsum: 102, width: 64, height: 64, assetType: 'CUSTOM_BADGE_ICON', description: 'Placeholder gear icon' },
  // { idForPicsum: 103, width: 50, height: 50, assetType: 'CUSTOM_BADGE_ICON', description: 'Placeholder book icon' },
  // { idForPicsum: 104, width: 50, height: 50, assetType: 'CUSTOM_BADGE_ICON', description: 'Placeholder lightning icon' },
  // { idForPicsum: 105, width: 50, height: 50, assetType: 'CUSTOM_BADGE_ICON', description: 'Placeholder diamond icon' },
  
  // Could add more, e.g. for User Avatars if we want specific seeded ones
  // { idForPicsum: 142, width: 128, height: 128, assetType: 'USER_AVATAR_PLACEHOLDER', description: 'TestUserPrime placeholder avatar' },
];

// This map will hold the seeded assets, keyed by a descriptive name or their intended use,
// so other seeders can easily access their hostedUrl or id.
export const seededUploadedAssets: Map<string, UploadedAsset> = new Map();

export async function seedUploadedAssets(prisma: PrismaClient) {
  console.log('🌱 Seeding uploaded assets (using Picsum placeholders)...');
  
  // Optional: Fetch a system user if you want to assign an uploaderId
  // const systemUser = await prisma.user.findFirst({ where: { username: 'system_admin' } }); // Adjust if you have such a user

  let createdCount = 0;
  let updatedCount = 0;

  for (const assetData of assetsToSeed) {
    const hostedUrl = `https://picsum.photos/id/${assetData.idForPicsum}/${assetData.width}/${assetData.height}`;
    const storageIdentifier = hostedUrl; // For Picsum, the URL itself is the identifier

    try {
      const upsertedAsset = await prisma.uploadedAsset.upsert({
        where: { hostedUrl: hostedUrl }, // Assuming hostedUrl will be unique for these placeholders
        update: {
          storageIdentifier: storageIdentifier, // Ensure it's updated if somehow URL was same but we want new seed data
          mimeType: 'image/jpeg', // Picsum usually serves JPEGs
          sizeBytes: assetData.width * assetData.height * 50, // Very rough approximation of size
          assetType: assetData.assetType,
          description: assetData.description,
          // uploaderId: systemUser?.id ?? undefined, // Or keep null
        },
        create: {
          hostedUrl: hostedUrl,
          storageIdentifier: storageIdentifier,
          mimeType: 'image/jpeg',
          sizeBytes: assetData.width * assetData.height * 50, // Rough approximation
          assetType: assetData.assetType,
          description: assetData.description,
          // uploaderId: systemUser?.id ?? undefined,
        },
      });
      // Store for other seeders. Key by description or a more structured name if needed.
      // For simplicity, using a combination that might be useful for template creation.
      const assetKey = `${assetData.assetType}_${assetData.idForPicsum}`;
      seededUploadedAssets.set(assetKey, upsertedAsset);
      
      // Slightly better counting for upsert
      // This is a common pattern: check if something changed to determine if it was an update vs just finding it.
      // However, Prisma's upsert doesn't directly return if it created or updated.
      // A findFirst then create/update pattern gives more control over this logging.
      // For now, we assume upsert either creates or ensures data matches.
      // A more robust way to count actual creates vs updates:
      const existing = await prisma.uploadedAsset.findUnique({where: {hostedUrl: hostedUrl}, select: {id:true, description:true}}); // Check a field we update
      if (existing && existing.description === assetData.description) { // Simple check if data was likely already there
        // updatedCount++; // This logic is flawed for simple upsert if we update every time.
        // For now, just log processed.
      } else {
        // createdCount++;
      }

    } catch (error) {
      console.error(`Error upserting asset ${hostedUrl}:`, error);
    }
  }
  // Since upsert doesn't tell us if it created or updated, we'll count processed records.
  console.log(`✅ Uploaded assets seeding finished. ${assetsToSeed.length} assets processed (upserted).`);
  console.log('   Access seeded assets via `seededUploadedAssets` Map, e.g., seededUploadedAssets.get("BADGE_BACKGROUND_IMAGE_10")?.hostedUrl');
}

// Example of how to get a specific asset URL later (conceptual)
// export function getSeededAssetUrl(key: string): string | undefined {
//   return seededUploadedAssets.get(key)?.hostedUrl;
// } 