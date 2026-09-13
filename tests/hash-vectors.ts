import { createHash } from 'node:crypto';
import { sha256Source } from '../lib/sha256-source';

// Padding boundaries, multiple blocks, UTF-8, and escaped source characters.
export const hashMessages = ['', 'abc', 'λ', 'こんにちは', 'Lean 🦀', 'line one\nline two\r\n', 'quote " and backslash \\', ...[1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 129, 1000].map(length => 'a'.repeat(length))];
export const hashDigests = hashMessages.map(message => createHash('sha256').update(message, 'utf8').digest('hex'));
export const hashVectorCode = `${sha256Source}\n${hashMessages.map(message => `#eval IO.println (SHA256.digest ${JSON.stringify(message)})`).join('\n')}`;
