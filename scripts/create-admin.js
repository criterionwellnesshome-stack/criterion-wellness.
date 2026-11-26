#!/usr/bin/env node

/**
 * Criterion Holistic Wellness Home - Secure Administrator Provisioning
 * 
 * Safeguard:
 * Passwords are NEVER accepted as command-line arguments to avoid shell history
 * and process table exposure. Passwords are typed interactively with masking.
 */

import readline from 'node:readline';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

// Helper to prompt for masked/hidden password
function promptSecret(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);

    let password = '';
    const onData = (char) => {
      char = char.toString();
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.pause();
          break;
        case '\u0003': // Ctrl+C
          process.exit(1);
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    };

    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on('data', onData);

      rl.question('', () => {
        stdin.removeListener('data', onData);
        stdin.setRawMode(false);
        stdout.write('\n');
        rl.close();
        resolve(password.trim());
      });
    } else {
      // Fallback for non-TTY environments
      rl.question('', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

function promptText(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

// OWASP standard: PBKDF2-HMAC-SHA256 with 600,000 iterations
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const iterations = 600000;
  const keylen = 32;
  const digest = 'sha256';

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
      if (err) return reject(err);
      const saltHex = salt.toString('hex');
      const hashHex = derivedKey.toString('hex');
      resolve(`$pbkdf2-sha256$i=${iterations}$${saltHex}$${hashHex}`);
    });
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('CRITERION WELLNESS - SECURE ADMINISTRATOR PROVISIONING');
  console.log('======================================================\n');

  const isLocal = process.argv.includes('--local') || !process.argv.includes('--remote');
  const targetEnv = isLocal ? 'Local D1 Database' : 'Production Cloudflare D1 Database';

  console.log(`Target: ${targetEnv}`);
  console.log('Note: Passwords are read securely without shell history exposure.\n');

  const fullName = await promptText('Admin Full Name: ');
  if (!fullName) {
    console.error('Error: Full name is required.');
    process.exit(1);
  }

  const email = await promptText('Admin Email: ');
  if (!email || !email.includes('@')) {
    console.error('Error: Valid email address is required.');
    process.exit(1);
  }

  const password = await promptSecret('Admin Password (min 10 characters): ');
  if (password.length < 10) {
    console.error('\nError: Password must be at least 10 characters long.');
    process.exit(1);
  }

  const confirmPassword = await promptSecret('Confirm Password: ');
  if (password !== confirmPassword) {
    console.error('\nError: Passwords do not match.');
    process.exit(1);
  }

  console.log('\nGenerating secure PBKDF2-HMAC-SHA256 key (600,000 iterations)...');
  const passwordHash = await hashPassword(password);
  const staffId = crypto.randomUUID();

  // Escape single quotes for SQL safety
  const safeFullName = fullName.replace(/'/g, "''");
  const safeEmail = email.toLowerCase().replace(/'/g, "''");

  const sql = `INSERT INTO staff (id, full_name, email, password_hash, role, is_active) VALUES ('${staffId}', '${safeFullName}', '${safeEmail}', '${passwordHash}', 'admin', 1);`;

  console.log(`\nInserting administrator "${safeFullName}" (${safeEmail})...`);

  try {
    const flag = isLocal ? '--local' : '--remote';
    const npxCmd = process.platform === 'win32' ? 'cmd.exe /c npx' : 'npx';
    execSync(`${npxCmd} wrangler d1 execute DB ${flag} --command="${sql}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('\n[SUCCESS] Administrator account provisioned successfully.');
  } catch (err) {
    console.error('\n[ERROR] Failed to insert administrator via Wrangler:');
    console.error(err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
