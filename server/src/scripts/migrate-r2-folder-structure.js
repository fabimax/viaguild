const { PrismaClient } = require('@prisma/client');
const r2Service = require('../services/r2.service.js');

/**
 * Migration script to move R2 files from old folder structure to new entity-first structure
 * 
 * Old structure:
 * - avatars/{userId}/large/file.webp          → users/{userId}/avatars/large/file.webp
 * - guilds/{guildId}/large/file.webp          → guilds/{guildId}/avatars/large/file.webp
 * - temp/avatars/{userId}/large/file.webp     → temp/users/{userId}/avatars/large/file.webp
 * - temp/guilds/{guildId}/large/file.webp     → temp/guilds/{guildId}/avatars/large/file.webp
 */

const prisma = new PrismaClient();

class R2FolderMigration {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
    this.stats = {
      userAvatars: { found: 0, migrated: 0, errors: 0 },
      guildAvatars: { found: 0, migrated: 0, errors: 0 },
      tempUserAvatars: { found: 0, migrated: 0, errors: 0 },
      tempGuildAvatars: { found: 0, migrated: 0, errors: 0 },
      uploadedAssets: { updated: 0, errors: 0 },
      userRecords: { updated: 0, errors: 0 },
      guildRecords: { updated: 0, errors: 0 }
    };
  }

  log(message, isVerbose = false) {
    if (isVerbose && !this.verbose) return;
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  /**
   * List all objects with a given prefix
   */
  async listObjectsWithPrefix(prefix) {
    const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    const bucketName = process.env.R2_BUCKET_NAME;
    const objects = [];
    let continuationToken = null;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await client.send(command);
      
      if (response.Contents) {
        objects.push(...response.Contents);
      }
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  /**
   * Copy object from old path to new path
   */
  async copyObject(oldKey, newKey) {
    if (this.dryRun) {
      this.log(`[DRY RUN] Would copy: ${oldKey} → ${newKey}`, true);
      return true;
    }

    const { S3Client, CopyObjectCommand } = require('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    const bucketName = process.env.R2_BUCKET_NAME;

    try {
      const copySource = encodeURIComponent(`${bucketName}/${oldKey}`);
      
      await client.send(new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: copySource,
        Key: newKey,
      }));

      this.log(`Copied: ${oldKey} → ${newKey}`, true);
      return true;
    } catch (error) {
      this.log(`Error copying ${oldKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Migrate user avatars from avatars/{userId}/ to users/{userId}/avatars/
   */
  async migrateUserAvatars() {
    this.log('🔄 Migrating user avatars...');
    
    const objects = await this.listObjectsWithPrefix('avatars/');
    const sizes = ['large', 'medium', 'small'];
    
    for (const object of objects) {
      this.stats.userAvatars.found++;
      
      // Parse path: avatars/{userId}/{size}/{filename}
      const pathParts = object.Key.split('/');
      if (pathParts.length !== 4 || pathParts[0] !== 'avatars') continue;
      
      const [, userId, size, filename] = pathParts;
      if (!sizes.includes(size)) continue;
      
      // Generate new path using r2Service method
      const newPath = `${r2Service.getEntityAssetPath('users', userId, 'avatars', false)}/${size}/${filename}`;
      
      const success = await this.copyObject(object.Key, newPath);
      if (success) {
        this.stats.userAvatars.migrated++;
      } else {
        this.stats.userAvatars.errors++;
      }
    }
    
    this.log(`✅ User avatars: ${this.stats.userAvatars.migrated}/${this.stats.userAvatars.found} migrated`);
  }

  /**
   * Migrate guild avatars from guilds/{guildId}/ to guilds/{guildId}/avatars/
   */
  async migrateGuildAvatars() {
    this.log('🔄 Migrating guild avatars...');
    
    const objects = await this.listObjectsWithPrefix('guilds/');
    const sizes = ['large', 'medium', 'small'];
    
    for (const object of objects) {
      this.stats.guildAvatars.found++;
      
      // Parse path: guilds/{guildId}/{size}/{filename}
      const pathParts = object.Key.split('/');
      if (pathParts.length !== 4 || pathParts[0] !== 'guilds') continue;
      
      const [, guildId, size, filename] = pathParts;
      if (!sizes.includes(size)) continue;
      
      // Generate new path using r2Service method
      const newPath = `${r2Service.getEntityAssetPath('guilds', guildId, 'avatars', false)}/${size}/${filename}`;
      
      const success = await this.copyObject(object.Key, newPath);
      if (success) {
        this.stats.guildAvatars.migrated++;
      } else {
        this.stats.guildAvatars.errors++;
      }
    }
    
    this.log(`✅ Guild avatars: ${this.stats.guildAvatars.migrated}/${this.stats.guildAvatars.found} migrated`);
  }

  /**
   * Migrate temp user avatars from temp/avatars/{userId}/ to temp/users/{userId}/avatars/
   */
  async migrateTempUserAvatars() {
    this.log('🔄 Migrating temp user avatars...');
    
    const objects = await this.listObjectsWithPrefix('temp/avatars/');
    const sizes = ['large', 'medium', 'small'];
    
    for (const object of objects) {
      this.stats.tempUserAvatars.found++;
      
      // Parse path: temp/avatars/{userId}/{size}/{filename}
      const pathParts = object.Key.split('/');
      if (pathParts.length !== 5 || pathParts[0] !== 'temp' || pathParts[1] !== 'avatars') continue;
      
      const [, , userId, size, filename] = pathParts;
      if (!sizes.includes(size)) continue;
      
      // Generate new path using r2Service method
      const newPath = `${r2Service.getEntityAssetPath('users', userId, 'avatars', true)}/${size}/${filename}`;
      
      const success = await this.copyObject(object.Key, newPath);
      if (success) {
        this.stats.tempUserAvatars.migrated++;
      } else {
        this.stats.tempUserAvatars.errors++;
      }
    }
    
    this.log(`✅ Temp user avatars: ${this.stats.tempUserAvatars.migrated}/${this.stats.tempUserAvatars.found} migrated`);
  }

  /**
   * Migrate temp guild avatars from temp/guilds/{guildId}/ to temp/guilds/{guildId}/avatars/
   */
  async migrateTempGuildAvatars() {
    this.log('🔄 Migrating temp guild avatars...');
    
    const objects = await this.listObjectsWithPrefix('temp/guilds/');
    const sizes = ['large', 'medium', 'small'];
    
    for (const object of objects) {
      this.stats.tempGuildAvatars.found++;
      
      // Parse path: temp/guilds/{guildId}/{size}/{filename}
      const pathParts = object.Key.split('/');
      if (pathParts.length !== 5 || pathParts[0] !== 'temp' || pathParts[1] !== 'guilds') continue;
      
      const [, , guildId, size, filename] = pathParts;
      if (!sizes.includes(size)) continue;
      
      // Generate new path using r2Service method
      const newPath = `${r2Service.getEntityAssetPath('guilds', guildId, 'avatars', true)}/${size}/${filename}`;
      
      const success = await this.copyObject(object.Key, newPath);
      if (success) {
        this.stats.tempGuildAvatars.migrated++;
      } else {
        this.stats.tempGuildAvatars.errors++;
      }
    }
    
    this.log(`✅ Temp guild avatars: ${this.stats.tempGuildAvatars.migrated}/${this.stats.tempGuildAvatars.found} migrated`);
  }

  /**
   * Update database UploadedAsset records with new storage paths
   */
  async updateUploadedAssetRecords() {
    this.log('🔄 Updating UploadedAsset records...');
    
    const assets = await prisma.uploadedAsset.findMany({
      where: {
        OR: [
          { storageIdentifier: { startsWith: 'avatars/' } },
          { storageIdentifier: { startsWith: 'guilds/' } },
        ]
      }
    });

    for (const asset of assets) {
      let newStorageIdentifier = null;
      
      // Handle user avatars: avatars/{userId}/large/file.webp → users/{userId}/avatars/large/file.webp
      if (asset.storageIdentifier.startsWith('avatars/')) {
        const pathParts = asset.storageIdentifier.split('/');
        if (pathParts.length === 4) {
          const [, userId, size, filename] = pathParts;
          newStorageIdentifier = `${r2Service.getEntityAssetPath('users', userId, 'avatars', false)}/${size}/${filename}`;
        }
      }
      
      // Handle guild avatars: guilds/{guildId}/large/file.webp → guilds/{guildId}/avatars/large/file.webp
      else if (asset.storageIdentifier.startsWith('guilds/')) {
        const pathParts = asset.storageIdentifier.split('/');
        if (pathParts.length === 4) {
          const [, guildId, size, filename] = pathParts;
          newStorageIdentifier = `${r2Service.getEntityAssetPath('guilds', guildId, 'avatars', false)}/${size}/${filename}`;
        }
      }
      
      if (newStorageIdentifier && newStorageIdentifier !== asset.storageIdentifier) {
        if (this.dryRun) {
          this.log(`[DRY RUN] Would update UploadedAsset ${asset.id}: ${asset.storageIdentifier} → ${newStorageIdentifier}`, true);
          this.stats.uploadedAssets.updated++;
        } else {
          try {
            await prisma.uploadedAsset.update({
              where: { id: asset.id },
              data: { 
                storageIdentifier: newStorageIdentifier,
                hostedUrl: `${process.env.R2_PUBLIC_URL_BASE}/${newStorageIdentifier}`
              }
            });
            this.log(`Updated UploadedAsset ${asset.id}`, true);
            this.stats.uploadedAssets.updated++;
          } catch (error) {
            this.log(`Error updating UploadedAsset ${asset.id}: ${error.message}`);
            this.stats.uploadedAssets.errors++;
          }
        }
      }
    }
    
    this.log(`✅ UploadedAsset records: ${this.stats.uploadedAssets.updated} updated`);
  }

  /**
   * Update user avatar URLs in database
   */
  async updateUserAvatarUrls() {
    this.log('🔄 Updating user avatar URLs...');
    
    const users = await prisma.user.findMany({
      where: {
        avatar: {
          contains: process.env.R2_PUBLIC_URL_BASE
        }
      },
      select: { id: true, avatar: true }
    });

    for (const user of users) {
      if (!user.avatar) continue;
      
      // Extract old path from URL
      const oldPath = user.avatar.replace(`${process.env.R2_PUBLIC_URL_BASE}/`, '');
      
      // Check if it's old structure: avatars/{userId}/large/file.webp
      if (oldPath.startsWith('avatars/')) {
        const pathParts = oldPath.split('/');
        if (pathParts.length === 4 && pathParts[1] === user.id) {
          const [, userId, size, filename] = pathParts;
          const newPath = `${r2Service.getEntityAssetPath('users', userId, 'avatars', false)}/${size}/${filename}`;
          const newUrl = `${process.env.R2_PUBLIC_URL_BASE}/${newPath}`;
          
          if (this.dryRun) {
            this.log(`[DRY RUN] Would update User ${user.id} avatar: ${user.avatar} → ${newUrl}`, true);
            this.stats.userRecords.updated++;
          } else {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { avatar: newUrl }
              });
              this.log(`Updated User ${user.id} avatar URL`, true);
              this.stats.userRecords.updated++;
            } catch (error) {
              this.log(`Error updating User ${user.id}: ${error.message}`);
              this.stats.userRecords.errors++;
            }
          }
        }
      }
    }
    
    this.log(`✅ User avatar URLs: ${this.stats.userRecords.updated} updated`);
  }

  /**
   * Update guild avatar URLs in database
   */
  async updateGuildAvatarUrls() {
    this.log('🔄 Updating guild avatar URLs...');
    
    const guilds = await prisma.guild.findMany({
      where: {
        avatar: {
          contains: process.env.R2_PUBLIC_URL_BASE
        }
      },
      select: { id: true, avatar: true }
    });

    for (const guild of guilds) {
      if (!guild.avatar) continue;
      
      // Extract old path from URL
      const oldPath = guild.avatar.replace(`${process.env.R2_PUBLIC_URL_BASE}/`, '');
      
      // Check if it's old structure: guilds/{guildId}/large/file.webp
      if (oldPath.startsWith('guilds/')) {
        const pathParts = oldPath.split('/');
        if (pathParts.length === 4 && pathParts[1] === guild.id) {
          const [, guildId, size, filename] = pathParts;
          const newPath = `${r2Service.getEntityAssetPath('guilds', guildId, 'avatars', false)}/${size}/${filename}`;
          const newUrl = `${process.env.R2_PUBLIC_URL_BASE}/${newPath}`;
          
          if (this.dryRun) {
            this.log(`[DRY RUN] Would update Guild ${guild.id} avatar: ${guild.avatar} → ${newUrl}`, true);
            this.stats.guildRecords.updated++;
          } else {
            try {
              await prisma.guild.update({
                where: { id: guild.id },
                data: { avatar: newUrl }
              });
              this.log(`Updated Guild ${guild.id} avatar URL`, true);
              this.stats.guildRecords.updated++;
            } catch (error) {
              this.log(`Error updating Guild ${guild.id}: ${error.message}`);
              this.stats.guildRecords.errors++;
            }
          }
        }
      }
    }
    
    this.log(`✅ Guild avatar URLs: ${this.stats.guildRecords.updated} updated`);
  }

  /**
   * Print final migration statistics
   */
  printStats() {
    this.log('\n📊 Migration Statistics:');
    this.log(`User avatars: ${this.stats.userAvatars.migrated}/${this.stats.userAvatars.found} (${this.stats.userAvatars.errors} errors)`);
    this.log(`Guild avatars: ${this.stats.guildAvatars.migrated}/${this.stats.guildAvatars.found} (${this.stats.guildAvatars.errors} errors)`);
    this.log(`Temp user avatars: ${this.stats.tempUserAvatars.migrated}/${this.stats.tempUserAvatars.found} (${this.stats.tempUserAvatars.errors} errors)`);
    this.log(`Temp guild avatars: ${this.stats.tempGuildAvatars.migrated}/${this.stats.tempGuildAvatars.found} (${this.stats.tempGuildAvatars.errors} errors)`);
    this.log(`UploadedAsset records: ${this.stats.uploadedAssets.updated} updated (${this.stats.uploadedAssets.errors} errors)`);
    this.log(`User avatar URLs: ${this.stats.userRecords.updated} updated (${this.stats.userRecords.errors} errors)`);
    this.log(`Guild avatar URLs: ${this.stats.guildRecords.updated} updated (${this.stats.guildRecords.errors} errors)`);
    
    const totalFiles = this.stats.userAvatars.migrated + this.stats.guildAvatars.migrated + 
                       this.stats.tempUserAvatars.migrated + this.stats.tempGuildAvatars.migrated;
    const totalRecords = this.stats.uploadedAssets.updated + this.stats.userRecords.updated + this.stats.guildRecords.updated;
    
    this.log(`\n🎉 Migration complete! ${totalFiles} files copied, ${totalRecords} database records updated`);
  }

  /**
   * Run the complete migration
   */
  async run() {
    this.log(`🚀 Starting R2 folder structure migration${this.dryRun ? ' (DRY RUN)' : ''}...`);
    this.log(`Verbose logging: ${this.verbose ? 'enabled' : 'disabled'}`);
    
    try {
      // Copy files to new structure
      await this.migrateUserAvatars();
      await this.migrateGuildAvatars();
      await this.migrateTempUserAvatars();
      await this.migrateTempGuildAvatars();
      
      // Update database records
      await this.updateUploadedAssetRecords();
      await this.updateUserAvatarUrls();
      await this.updateGuildAvatarUrls();
      
      this.printStats();
      
    } catch (error) {
      this.log(`❌ Migration failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new R2FolderMigration();
  migration.run().catch(console.error);
}

module.exports = R2FolderMigration;