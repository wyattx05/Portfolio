/**
 * Unit tests for file utilities
 */
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { atomicWrite, readFile, createBackup, rotateBackups } = require('../cms/lib/file-utils');

describe('File Utilities', () => {
  let tempDir;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'cms-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temp dir recursively
    const cleanup = async (dir) => {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await cleanup(fullPath);
        } else {
          await fs.unlink(fullPath);
        }
      }
      await fs.rmdir(dir);
    };
    
    try {
      await cleanup(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test('atomicWrite creates file with correct content', async () => {
    const filePath = path.join(tempDir, 'test.json');
    const content = JSON.stringify({ test: 'data' }, null, 2);

    await atomicWrite(filePath, content);
    const written = await readFile(filePath);

    expect(written).toBe(content);
  });

  test('atomicWrite overwrites existing file', async () => {
    const filePath = path.join(tempDir, 'overwrite.json');
    const content1 = 'old content';
    const content2 = 'new content';

    await atomicWrite(filePath, content1);
    await atomicWrite(filePath, content2);
    const written = await readFile(filePath);

    expect(written).toBe(content2);
  });

  test('atomicWrite does not leave temp files', async () => {
    const filePath = path.join(tempDir, 'clean.json');
    await atomicWrite(filePath, 'test');

    const files = await fs.readdir(tempDir);
    const tmpFiles = files.filter(f => f.endsWith('.tmp'));

    expect(tmpFiles.length).toBe(0);
  });

  test('readFile throws on non-existent file', async () => {
    const filePath = path.join(tempDir, 'nonexistent.json');

    await expect(readFile(filePath)).rejects.toThrow();
  });

  test('createBackup creates backup with timestamp', async () => {
    const sourceFile = path.join(tempDir, 'source.json');
    const backupDir = path.join(tempDir, 'backups');

    await atomicWrite(sourceFile, 'source content');
    await createBackup(sourceFile, backupDir);

    const files = await fs.readdir(backupDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toMatch(/content-.*\.json\.bak/);
  });

  test('rotateBackups deletes old files', async () => {
    const backupDir = path.join(tempDir, 'rotation');
    await fs.mkdir(backupDir, { recursive: true });

    // Create 15 backup files
    for (let i = 0; i < 15; i++) {
      const file = path.join(backupDir, `content-2024-01-${String(i).padStart(2, '0')}.json.bak`);
      await fs.writeFile(file, `backup ${i}`);
    }

    await rotateBackups(backupDir, 10);

    const remaining = await fs.readdir(backupDir);
    expect(remaining.length).toBe(10);
  });
});
