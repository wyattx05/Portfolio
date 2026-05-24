const fs = require('fs').promises;
const path = require('path');
const pino = require('pino');

const logger = pino();

/**
 * Atomically write content to a file using temp file + rename pattern
 * Prevents corruption if process crashes mid-write
 */
async function atomicWrite(filePath, content) {
  const tmpFile = filePath + '.tmp';
  
  try {
    // Write to temp file
    await fs.writeFile(tmpFile, content, 'utf-8');
    
    // Atomic rename (only succeeds if temp file exists and is readable)
    await fs.rename(tmpFile, filePath);
    
    logger.debug({ filePath }, 'Atomic write completed');
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tmpFile);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Read content from file
 */
async function readFile(filePath) {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Create a backup of a file with timestamp
 */
async function createBackup(sourceFile, backupDir) {
  try {
    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `content-${timestamp}.json.bak`);
    
    const content = await readFile(sourceFile);
    await fs.writeFile(backupFile, content, 'utf-8');
    
    logger.debug({ backupFile }, 'Backup created');
    return backupFile;
  } catch (error) {
    logger.error({ error, sourceFile }, 'Backup creation failed');
    throw error;
  }
}

/**
 * Rotate backups: keep last N, delete older ones
 */
async function rotateBackups(backupDir, keepCount = 10) {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.endsWith('.bak'))
      .sort()
      .reverse();
    
    if (backupFiles.length > keepCount) {
      const toDelete = backupFiles.slice(keepCount);
      
      for (const file of toDelete) {
        await fs.unlink(path.join(backupDir, file));
        logger.debug({ file }, 'Old backup deleted');
      }
      
      logger.info({ deleted: toDelete.length, kept: keepCount }, 'Backup rotation completed');
    }
  } catch (error) {
    logger.error({ error, backupDir }, 'Backup rotation failed');
    throw error;
  }
}

/**
 * List all backups in a directory
 */
async function listBackups(backupDir) {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.endsWith('.bak'))
      .sort()
      .reverse();
    
    return Promise.all(backupFiles.map(async (filename) => {
      const fullPath = path.join(backupDir, filename);
      const stats = await fs.stat(fullPath);

      return {
        filename,
        timestamp: stats.mtime.toISOString(),
        size: stats.size,
      };
    }));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Restore from a backup file
 */
async function restoreFromBackup(backupFile, targetFile) {
  try {
    const content = await readFile(backupFile);
    await atomicWrite(targetFile, content);
    logger.info({ backupFile, targetFile }, 'Restore completed');
    return content;
  } catch (error) {
    logger.error({ error, backupFile, targetFile }, 'Restore failed');
    throw error;
  }
}

module.exports = {
  atomicWrite,
  readFile,
  createBackup,
  rotateBackups,
  listBackups,
  restoreFromBackup,
};
