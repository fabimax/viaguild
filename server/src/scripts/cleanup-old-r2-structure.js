const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

/**
 * Cleanup script to remove old folder structure files after successful migration
 * 
 * DANGER: This script permanently deletes files. Use with caution!
 * 
 * Usage:
 * - node cleanup-old-r2-structure.js --dry-run (to see what would be deleted)
 * - node cleanup-old-r2-structure.js --confirm (to actually delete files)
 */

class R2CleanupScript {
  constructor() {
    this.dryRun = !process.argv.includes('--confirm');
    this.verbose = process.argv.includes('--verbose');
    
    if (!this.dryRun && !process.argv.includes('--confirm')) {
      console.log('❌ This script requires --confirm flag to actually delete files.');
      console.log('Use --dry-run to see what would be deleted.');
      process.exit(1);
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
    
    this.bucketName = process.env.R2_BUCKET_NAME;
    
    this.stats = {
      userAvatars: { found: 0, deleted: 0, errors: 0 },
      guildAvatars: { found: 0, deleted: 0, errors: 0 },
      tempUserAvatars: { found: 0, deleted: 0, errors: 0 },
      tempGuildAvatars: { found: 0, deleted: 0, errors: 0 }
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
    const objects = [];
    let continuationToken = null;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await this.client.send(command);
      
      if (response.Contents) {
        objects.push(...response.Contents);
      }
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  /**
   * Delete a single object
   */
  async deleteObject(key) {
    if (this.dryRun) {
      this.log(`[DRY RUN] Would delete: ${key}`, true);
      return true;
    }

    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));

      this.log(`Deleted: ${key}`, true);
      return true;
    } catch (error) {
      this.log(`Error deleting ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up old user avatars (avatars/{userId}/ structure)
   */
  async cleanupOldUserAvatars() {
    this.log('🗑️  Cleaning up old user avatars (avatars/ folder)...');
    
    const objects = await this.listObjectsWithPrefix('avatars/');
    const sizes = ['large', 'medium', 'small'];
    
    for (const object of objects) {
      this.stats.userAvatars.found++;
      
      // Verify this is the old structure: avatars/{userId}/{size}/{filename}
      const pathParts = object.Key.split('/');
      if (pathParts.length === 4 && pathParts[0] === 'avatars' && sizes.includes(pathParts[2])) {
        const success = await this.deleteObject(object.Key);
        if (success) {
          this.stats.userAvatars.deleted++;
        } else {
          this.stats.userAvatars.errors++;
        }
      } else {
        this.log(`Skipping non-matching file: ${object.Key}`, true);
      }
    }
    
    this.log(`✅ Old user avatars: ${this.stats.userAvatars.deleted}/${this.stats.userAvatars.found} deleted`);
  }

  /**
   * Clean up old guild avatars (guilds/{guildId}/{size}/ structure)
   */
  async cleanupOldGuildAvatars() {
    this.log('🗑️  Cleaning up old guild avatars (guilds/{id}/{size}/ structure)...');
    
    const objects = await this.listObjectsWithPrefix('guilds/');
    const sizes = ['large', 'medium', 'small'];
    
    for (const object of objects) {
      this.stats.guildAvatars.found++;
      
      // Verify this is the old structure: guilds/{guildId}/{size}/{filename}
      // But NOT the new structure: guilds/{guildId}/avatars/{size}/{filename}
      const pathParts = object.Key.split('/');
      if (pathParts.length === 4 && 
          pathParts[0] === 'guilds' && 
          sizes.includes(pathParts[2]) &&
          pathParts[2] !== 'avatars') { // Make sure it's not the new structure
        
        const success = await this.deleteObject(object.Key);
        if (success) {
          this.stats.guildAvatars.deleted++;
        } else {
          this.stats.guildAvatars.errors++;
        }
      } else {
        this.log(`Skipping non-matching or new structure file: ${object.Key}`, true);
      }
    }
    
    this.log(`✅ Old guild avatars: ${this.stats.guildAvatars.deleted}/${this.stats.guildAvatars.found} deleted`);
  }

  /**
   * Clean up old temp user avatars (temp/avatars/{userId}/ structure)
   */
  async cleanupOldTempUserAvatars() {
    this.log('🗑️  Cleaning up old temp user avatars (temp/avatars/ folder)...');
    
    const objects = await this.listObjectsWithPrefix('temp/avatars/');
    const sizes = ['large', 'medium', 'small'];
    
    for (const object of objects) {
      this.stats.tempUserAvatars.found++;
      
      // Verify this is the old structure: temp/avatars/{userId}/{size}/{filename}
      const pathParts = object.Key.split('/');
      if (pathParts.length === 5 && 
          pathParts[0] === 'temp' && 
          pathParts[1] === 'avatars' && 
          sizes.includes(pathParts[3])) {
        
        const success = await this.deleteObject(object.Key);
        if (success) {
          this.stats.tempUserAvatars.deleted++;
        } else {
          this.stats.tempUserAvatars.errors++;
        }
      } else {
        this.log(`Skipping non-matching file: ${object.Key}`, true);
      }
    }
    
    this.log(`✅ Old temp user avatars: ${this.stats.tempUserAvatars.deleted}/${this.stats.tempUserAvatars.found} deleted`);
  }

  /**
   * Clean up old temp guild avatars (temp/guilds/{guildId}/{size}/ structure)
   */
  async cleanupOldTempGuildAvatars() {
    this.log('🗑️  Cleaning up old temp guild avatars (temp/guilds/{id}/{size}/ structure)...');
    
    const objects = await this.listObjectsWithPrefix('temp/guilds/');
    const sizes = ['large', 'medium', 'small'];
    
    for (const object of objects) {
      this.stats.tempGuildAvatars.found++;
      
      // Verify this is the old structure: temp/guilds/{guildId}/{size}/{filename}
      // But NOT the new structure: temp/guilds/{guildId}/avatars/{size}/{filename}
      const pathParts = object.Key.split('/');
      if (pathParts.length === 5 && 
          pathParts[0] === 'temp' && 
          pathParts[1] === 'guilds' && 
          sizes.includes(pathParts[3]) &&
          pathParts[3] !== 'avatars') { // Make sure it's not the new structure
        
        const success = await this.deleteObject(object.Key);
        if (success) {
          this.stats.tempGuildAvatars.deleted++;
        } else {
          this.stats.tempGuildAvatars.errors++;
        }
      } else {
        this.log(`Skipping non-matching or new structure file: ${object.Key}`, true);
      }
    }
    
    this.log(`✅ Old temp guild avatars: ${this.stats.tempGuildAvatars.deleted}/${this.stats.tempGuildAvatars.found} deleted`);
  }

  /**
   * Print final cleanup statistics
   */
  printStats() {
    this.log('\n📊 Cleanup Statistics:');
    this.log(`User avatars: ${this.stats.userAvatars.deleted}/${this.stats.userAvatars.found} deleted (${this.stats.userAvatars.errors} errors)`);
    this.log(`Guild avatars: ${this.stats.guildAvatars.deleted}/${this.stats.guildAvatars.found} deleted (${this.stats.guildAvatars.errors} errors)`);
    this.log(`Temp user avatars: ${this.stats.tempUserAvatars.deleted}/${this.stats.tempUserAvatars.found} deleted (${this.stats.tempUserAvatars.errors} errors)`);
    this.log(`Temp guild avatars: ${this.stats.tempGuildAvatars.deleted}/${this.stats.tempGuildAvatars.found} deleted (${this.stats.tempGuildAvatars.errors} errors)`);
    
    const totalDeleted = this.stats.userAvatars.deleted + this.stats.guildAvatars.deleted + 
                         this.stats.tempUserAvatars.deleted + this.stats.tempGuildAvatars.deleted;
    const totalErrors = this.stats.userAvatars.errors + this.stats.guildAvatars.errors + 
                        this.stats.tempUserAvatars.errors + this.stats.tempGuildAvatars.errors;
    
    this.log(`\n🎉 Cleanup complete! ${totalDeleted} old files deleted${totalErrors > 0 ? ` (${totalErrors} errors)` : ''}`);
  }

  /**
   * Verify that new structure exists before cleanup
   */
  async verifyNewStructureExists() {
    this.log('🔍 Verifying new folder structure exists...');
    
    const newPrefixes = [
      'users/',
      'guilds/',
      'temp/users/',
    ];
    
    let foundNewFiles = 0;
    
    for (const prefix of newPrefixes) {
      const objects = await this.listObjectsWithPrefix(prefix);
      foundNewFiles += objects.length;
      this.log(`Found ${objects.length} files in ${prefix}`, true);
    }
    
    if (foundNewFiles === 0) {
      this.log('❌ No files found in new structure! Migration may not have completed successfully.');
      this.log('Please run the migration script first before cleanup.');
      process.exit(1);
    }
    
    this.log(`✅ Found ${foundNewFiles} files in new structure. Proceeding with cleanup.`);
  }

  /**
   * Run the complete cleanup
   */
  async run() {
    this.log(`🚀 Starting R2 old structure cleanup${this.dryRun ? ' (DRY RUN)' : ''}...`);
    this.log(`Verbose logging: ${this.verbose ? 'enabled' : 'disabled'}`);
    
    if (!this.dryRun) {
      this.log('⚠️  WARNING: This will permanently delete old structure files!');
      this.log('⚠️  Make sure migration completed successfully and new structure is verified!');
    }
    
    try {
      // Verify new structure exists before cleanup
      await this.verifyNewStructureExists();
      
      // Clean up old structure files
      await this.cleanupOldUserAvatars();
      await this.cleanupOldGuildAvatars();
      await this.cleanupOldTempUserAvatars();
      await this.cleanupOldTempGuildAvatars();
      
      this.printStats();
      
    } catch (error) {
      this.log(`❌ Cleanup failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }
}

// Show usage if no args provided
if (process.argv.length <= 2) {
  console.log('R2 Old Structure Cleanup Script');
  console.log('');
  console.log('Usage:');
  console.log('  node cleanup-old-r2-structure.js --dry-run     # Preview what would be deleted');
  console.log('  node cleanup-old-r2-structure.js --confirm     # Actually delete old files');
  console.log('  node cleanup-old-r2-structure.js --confirm --verbose  # Delete with detailed logging');
  console.log('');
  console.log('⚠️  WARNING: --confirm will permanently delete files!');
  process.exit(0);
}

// Run cleanup if called directly
if (require.main === module) {
  const cleanup = new R2CleanupScript();
  cleanup.run().catch(console.error);
}

module.exports = R2CleanupScript;