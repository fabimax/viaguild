const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function listTempAvatars() {
  // Initialize S3-compatible client for Cloudflare R2
  const endpoint = process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`;
  
  const client = new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // Important for R2
  });

  const bucketName = process.env.R2_BUCKET_NAME;

  try {
    console.log(`Listing files in ${bucketName}/temp/avatars/...`);
    console.log(`Endpoint: ${endpoint}`);
    console.log('---');

    let continuationToken;
    let allObjects = [];

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'temp/avatars/',
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await client.send(listCommand);

      if (response.Contents && response.Contents.length > 0) {
        allObjects = allObjects.concat(response.Contents);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    if (allObjects.length === 0) {
      console.log('No files found in temp/avatars/');
    } else {
      console.log(`Found ${allObjects.length} files:\n`);
      
      // Group by user and size
      const filesByUser = {};
      
      allObjects.forEach(obj => {
        const key = obj.Key;
        const parts = key.split('/');
        
        if (parts.length >= 4) {
          const userId = parts[2];
          const size = parts[3];
          const filename = parts[4];
          
          if (!filesByUser[userId]) {
            filesByUser[userId] = { large: [], medium: [], small: [], other: [] };
          }
          
          if (['large', 'medium', 'small'].includes(size)) {
            filesByUser[userId][size].push({
              filename,
              size: obj.Size,
              lastModified: obj.LastModified,
              key: key
            });
          } else {
            filesByUser[userId].other.push({
              path: key,
              size: obj.Size,
              lastModified: obj.LastModified
            });
          }
        } else {
          console.log(`Unexpected path structure: ${key}`);
        }
      });
      
      // Display organized results
      Object.entries(filesByUser).forEach(([userId, sizes]) => {
        console.log(`\nUser ID: ${userId}`);
        console.log('=' .repeat(50));
        
        ['large', 'medium', 'small'].forEach(size => {
          if (sizes[size].length > 0) {
            console.log(`\n  ${size.toUpperCase()} (${sizes[size].length} files):`);
            sizes[size].forEach(file => {
              const sizeKB = (file.size / 1024).toFixed(2);
              const date = file.lastModified.toISOString();
              console.log(`    - ${file.filename} (${sizeKB} KB) - ${date}`);
              console.log(`      Full path: ${file.key}`);
            });
          }
        });
        
        if (sizes.other.length > 0) {
          console.log(`\n  OTHER (${sizes.other.length} files):`);
          sizes.other.forEach(file => {
            const sizeKB = (file.size / 1024).toFixed(2);
            console.log(`    - ${file.path} (${sizeKB} KB)`);
          });
        }
      });
      
      // Summary
      console.log('\n' + '='.repeat(70));
      console.log('SUMMARY:');
      console.log(`Total files: ${allObjects.length}`);
      const totalSize = allObjects.reduce((sum, obj) => sum + obj.Size, 0);
      console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Number of users with temp avatars: ${Object.keys(filesByUser).length}`);
    }

  } catch (error) {
    console.error('Error listing objects:', error);
    console.error('Details:', {
      message: error.message,
      code: error.Code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
  }
}

// Run the script
listTempAvatars();