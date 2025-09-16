import { Stats, statSync } from 'fs';
import { resolve } from 'path';

/**
 * Parses file paths from a git patch and returns their current file permissions
 * @param patch - Git patch string
 * @returns Map of file path to octal mode string (e.g., '100644')
 */
export function getModeFromPatch(patch: string): Map<string, string> {
  const filePathToMode = new Map<string, string>();

  // Split patch into lines for processing
  const lines = patch.split('\n');
  let currentFile: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match diff header to get file path
    const diffMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (diffMatch) {
      // Use the 'b/' path as it represents the current state
      currentFile = diffMatch[2];
      continue;
    }

    // Match new file mode
    const newFileMatch = line.match(/^new file mode (\d+)$/);
    if (newFileMatch && currentFile) {
      filePathToMode.set(currentFile, newFileMatch[1]);
      continue;
    }

    // Match deleted file mode
    const deletedMatch = line.match(/^deleted file mode (\d+)$/);
    if (deletedMatch && currentFile) {
      // For deleted files, we might want to skip or handle differently
      // For now, we'll include them with their old mode
      filePathToMode.set(currentFile, deletedMatch[1]);
      continue;
    }

    // Match mode changes (prioritize this over index mode)
    const newModeMatch = line.match(/^new mode (\d+)$/);
    if (newModeMatch && currentFile) {
      filePathToMode.set(currentFile, newModeMatch[1]);
      continue;
    }

    // Match index line with mode (only if no explicit mode already set)
    const indexMatch = line.match(/^index [a-f0-9]+\.\.[a-f0-9]+ (\d+)$/);
    if (indexMatch && currentFile && !filePathToMode.has(currentFile)) {
      filePathToMode.set(currentFile, indexMatch[1]);
      continue;
    }
  }

  // For files that don't have mode information in the patch,
  // try to get the current mode from the file system
  for (const [filePath] of filePathToMode) {
    if (!filePathToMode.get(filePath)) {
      try {
        const stats = statSync(resolve(process.cwd(), filePath));
        // Git uses 100644 for regular files and 100755 for executables
        const gitMode = stats.isFile()
          ? stats.mode & parseInt('111', 8)
            ? '100755'
            : '100644'
          : '040000'; // directory
        filePathToMode.set(filePath, gitMode);
      } catch (err) {
        // File doesn't exist or can't be accessed, skip
      }
    }
  }

  // Also check for files without explicit mode in patch but with current filesystem mode
  const filesWithoutMode: string[] = [];
  for (const [filePath, mode] of filePathToMode) {
    if (!mode) {
      filesWithoutMode.push(filePath);
    }
  }

  // Try to get mode from filesystem for files without mode
  for (const filePath of filesWithoutMode) {
    try {
      const stats = statSync(resolve(process.cwd(), filePath));
      const gitMode = getGitModeFromStats(stats);
      if (gitMode) {
        filePathToMode.set(filePath, gitMode);
      }
    } catch (err) {
      // Remove files that don't exist
      filePathToMode.delete(filePath);
    }
  }

  return filePathToMode;
}

/**
 * Helper function to convert Node.js file stats to Git mode
 */
function getGitModeFromStats(stats: Stats): string | null {
  if (stats.isFile()) {
    // Check if file is executable
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    return isExecutable ? '100755' : '100644';
  } else if (stats.isDirectory()) {
    return '040000';
  } else if (stats.isSymbolicLink()) {
    return '120000';
  }
  return null;
}
