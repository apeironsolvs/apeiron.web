// Static build script for Vercel / deployment builds.
// Copies site/ -> public/ and admin-site/ -> public/admin/
import { rmSync, mkdirSync, cpSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC = join(ROOT, 'public');

rmSync(PUBLIC, { recursive: true, force: true });
mkdirSync(PUBLIC, { recursive: true });

// Copy public site files into public/
cpSync(join(ROOT, 'site'), PUBLIC, { recursive: true });

// Copy admin portal into public/admin/
cpSync(join(ROOT, 'admin-site'), join(PUBLIC, 'admin'), { recursive: true });

console.log('Static build successful: assets generated in public/');
