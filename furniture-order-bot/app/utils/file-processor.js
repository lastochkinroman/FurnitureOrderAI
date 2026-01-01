const fs = require('fs');
const path = require('path');

function cleanupFiles(filePaths) {
  if (!Array.isArray(filePaths)) {
    filePaths = [filePaths];
  }

  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Failed to clean up file ${filePath}:`, error.message);
    }
  });
}

function cleanupTempFiles() {
  const tempDir = path.join(__dirname, '../../temp');

  if (!fs.existsSync(tempDir)) {
    return;
  }

  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up old temp file: ${file}`);
        }
      } catch (error) {
        console.warn(`Failed to check/clean temp file ${file}:`, error.message);
      }
    });
  } catch (error) {
    console.warn('Failed to cleanup temp files:', error.message);
  }
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.warn(`Failed to get file size for ${filePath}:`, error.message);
    return 0;
  }
}

function isValidFileType(filePath, allowedExtensions) {
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.includes(ext);
}

module.exports = {
  cleanupFiles,
  cleanupTempFiles,
  ensureDirectoryExists,
  getFileSize,
  isValidFileType
};
