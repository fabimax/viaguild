#!/usr/bin/env node

/**
 * Cleanup script for expired temporary assets
 * Run this as a cron job to clean up expired uploads
 * 
 * Example cron (run every hour):
 * 0 * * * * cd /path/to/project/server && node src/scripts/cleanup-expired-assets.js
 */

const { PrismaClient } = require('@prisma/client');
const r2Service = require('../services/r2.service.js');

const prisma = new PrismaClient();

async function cleanupExpiredAssets() {
  console.log('Starting cleanup of expired assets...');
  const startTime = new Date();
  
  try {
    // Find all expired TEMP assets
    const expiredAssets = await prisma.uploadedAsset.findMany({
      where: {
        status: 'TEMP',
        expiresAt: {
          lt: new Date() // Less than current time = expired
        }
      },
      select: {
        id: true,
        storageIdentifier: true,
        hostedUrl: true,
        originalFilename: true,
        uploaderId: true,
        expiresAt: true
      }
    });
    
    console.log(`Found ${expiredAssets.length} expired assets to clean up`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    // Process each expired asset
    for (const asset of expiredAssets) {
      try {
        console.log(`Deleting expired asset: ${asset.originalFilename} (expired: ${asset.expiresAt})`);
        
        // Delete from R2
        await r2Service.client.send(new (require('@aws-sdk/client-s3').DeleteObjectCommand)({
          Bucket: r2Service.bucketName,
          Key: asset.storageIdentifier,
        }));
        
        // Delete from database
        await prisma.uploadedAsset.delete({
          where: { id: asset.id }
        });
        
        deletedCount++;
        console.log(`✓ Deleted ${asset.id}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to delete ${asset.id}:`, error.message);
        
        // If R2 deletion fails but we can still clean DB, do it
        if (error.Code === 'NoSuchKey') {
          try {
            await prisma.uploadedAsset.delete({
              where: { id: asset.id }
            });
            console.log(`  → Removed orphaned DB record for ${asset.id}`);
            deletedCount++;
            errorCount--; // Don't count as error if we cleaned up DB
          } catch (dbError) {
            console.error(`  → Failed to remove DB record:`, dbError.message);
          }
        }
      }
    }
    
    // Also find orphaned TEMP assets (older than 48 hours with no expiration set)
    const orphanedAssets = await prisma.uploadedAsset.findMany({
      where: {
        status: 'TEMP',
        expiresAt: null,
        createdAt: {
          lt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago
        }
      }
    });
    
    if (orphanedAssets.length > 0) {
      console.log(`\nFound ${orphanedAssets.length} orphaned TEMP assets (no expiration, >48h old)`);
      
      for (const asset of orphanedAssets) {
        try {
          await r2Service.client.send(new (require('@aws-sdk/client-s3').DeleteObjectCommand)({
            Bucket: r2Service.bucketName,
            Key: asset.storageIdentifier,
          }));
          
          await prisma.uploadedAsset.delete({
            where: { id: asset.id }
          });
          
          deletedCount++;
          console.log(`✓ Deleted orphaned asset ${asset.id}`);
        } catch (error) {
          errorCount++;
          console.error(`✗ Failed to delete orphaned asset ${asset.id}:`, error.message);
        }
      }
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // seconds
    
    console.log('\n=== Cleanup Summary ===');
    console.log(`Total assets processed: ${expiredAssets.length + orphanedAssets.length}`);
    console.log(`Successfully deleted: ${deletedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    
    // Log to a cleanup log table if you have one
    // await prisma.cleanupLog.create({
    //   data: {
    //     type: 'EXPIRED_ASSETS',
    //     itemsProcessed: expiredAssets.length + orphanedAssets.length,
    //     itemsDeleted: deletedCount,
    //     errors: errorCount,
    //     duration: Math.round(duration * 1000), // milliseconds
    //     completedAt: endTime
    //   }
    // });
    
  } catch (error) {
    console.error('Fatal error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupExpiredAssets()
    .then(() => {
      console.log('Cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredAssets };