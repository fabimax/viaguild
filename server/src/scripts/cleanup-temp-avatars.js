#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const r2Service = require('../services/r2.service');

async function cleanupAllTempAvatars() {
  console.log('Cleaning up all temp avatar files...');
  
  // The user ID from your logs
  const userId = '92ad183a-218a-4557-b7ce-ed20fcef58ff';
  
  // Clean up all temp files for this user
  await r2Service.cleanupOldTempFiles(userId);
  
  console.log('Cleanup complete!');
  process.exit(0);
}

cleanupAllTempAvatars().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});