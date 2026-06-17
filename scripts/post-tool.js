import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const logFile = path.join(process.cwd(), 'hooks.log');

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

async function main() {
  let event = {};
  try {
    const stdinData = fs.readFileSync(0, 'utf-8');
    if (stdinData.trim()) {
      event = JSON.parse(stdinData);
    }
  } catch (e) {
    log(`Warning: Failed to parse stdin JSON: ${e.message}`);
  }

  log(`Received event: ${JSON.stringify(event)}`);

  // Extract target file path
  let targetFile = null;
  if (event.tool_input) {
    targetFile = event.tool_input.TargetFile || event.tool_input.file_path || event.tool_input.path;
  } else if (event.arguments) {
    targetFile = event.arguments.TargetFile || event.arguments.file_path || event.arguments.path;
  }

  if (!targetFile && event) {
    const findTargetFile = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const found = findTargetFile(obj[key]);
          if (found) return found;
        } else if (key.toLowerCase() === 'targetfile' || key.toLowerCase() === 'filepath' || key.toLowerCase() === 'absolutepath') {
          return obj[key];
        }
      }
      return null;
    };
    targetFile = findTargetFile(event);
  }

  if (targetFile && typeof targetFile === 'string') {
    const normalizedPath = path.resolve(targetFile);
    const relativePath = path.relative(process.cwd(), normalizedPath);
    const ext = path.extname(normalizedPath);
    const isSrcFile = relativePath.startsWith('src' + path.sep) || relativePath.startsWith('src/') || relativePath.startsWith('scripts/');

    log(`Normalized file path: ${normalizedPath} (relative: ${relativePath}, isSrcFile: ${isSrcFile})`);

    if (isSrcFile && (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx')) {
      // 1. Run ESLint auto-fix
      try {
        log(`Running ESLint on ${relativePath}...`);
        const eslintOutput = execSync(`npx eslint --fix "${normalizedPath}"`, { encoding: 'utf-8' });
        log(`ESLint ran successfully. Output: ${eslintOutput.trim() || 'No warnings'}`);
      } catch (err) {
        log(`ESLint completed with issues/errors: ${err.stdout || err.message}`);
      }

      // 2. Run TypeScript compilation check if it's a TS/TSX file
      if (ext === '.ts' || ext === '.tsx') {
        try {
          log(`Running TypeScript compilation check (tsc --noEmit)...`);
          execSync('npx tsc --noEmit', { encoding: 'utf-8' });
          log(`TypeScript check passed successfully!`);
        } catch (err) {
          log(`TypeScript check failed: ${err.stdout || err.message}`);
        }
      }
    }
  } else {
    log('No target file found in the event payload.');
  }
}

main().catch(err => {
  log(`Error in hook main loop: ${err.message}`);
});
