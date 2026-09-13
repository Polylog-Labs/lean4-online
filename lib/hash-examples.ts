import type { Example } from './content';
import { sha256Source } from './sha256-source';

export const hashExamples: Example[] = [
  {
    id: 'hashing', title: 'Hashing and collisions', file: 'Hashing.lean', category: 'Cryptography', mode: 'program',
    description: 'Use Lean’s built-in hash and see why a hash match is not proof of equality.',
    code: `-- hash is in Lean's core library. No import is needed.
-- It returns a UInt64 using a Hashable instance for the input type.
def fingerprint (text : String) : UInt64 := hash text

def main : IO Unit := do
  let original := fingerprint "Lean"
  let unchanged := fingerprint "Lean"
  let changed := fingerprint "lean"
  IO.println s!"Same input: {original == unchanged}"
  IO.println s!"Changed input: {original == changed}"

  -- For Nat, hash simply wraps the number to 64 bits.
  -- These distinct numbers therefore have the same hash.
  let a : Nat := 0
  let b : Nat := 2^64
  IO.println s!"Equal values: {a == b}"
  IO.println s!"Equal hashes: {hash a == hash b}"

-- A collision means distinct inputs have the same hash.
-- Lean's hash is for data structures, not cryptographic commitments.
-- Open the SHA-256 example for a cryptographic hash algorithm.
`, expected: 'Same input: true\nChanged input: false\nEqual values: false\nEqual hashes: true',
    concepts: [{ token: 'hash · Hashable', explanation: 'hash asks the input type’s Hashable instance for a 64-bit hash. The implementation depends on the type and is not a cryptographic guarantee.' }, { token: 'UInt64', explanation: 'An unsigned 64-bit integer. There are only 2^64 possible outputs, so hashing unbounded inputs must allow collisions.' }, { token: 'hash a == hash b', explanation: 'Equal hashes do not establish a = b. This program shows a concrete collision.' }],
    challenge: 'Print fingerprint "Lean". Then hash 1 and 2^64 + 1 as natural numbers to find another collision.', related: ['sha256'],
    references: [{ title: 'Lean core Hashable instances', url: 'https://github.com/leanprover/lean4/blob/v4.33.1/src/Init/Data/Hashable.lean' }],
  },
  {
    id: 'sha256', title: 'SHA-256 without extra libraries', file: 'SHA256.lean', category: 'Cryptography', mode: 'program',
    description: 'Compute SHA-256 digests using the implementation included in this file.',
    code: `${sha256Source}
-- Basic usage: change the message passed to SHA256.digest.
def main : IO Unit := do
  IO.println (SHA256.digest "abc")
  IO.println (SHA256.digest "")
  let original := SHA256.digest "abc"
  let unchanged := SHA256.digest "abc"
  let changed := SHA256.digest "abd"
  IO.println s!"Same message: {original == unchanged}"
  IO.println s!"Changed message: {original == changed}"
`, expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\nSame message: true\nChanged message: false',
    concepts: [{ token: 'SHA256.digest "abc"', explanation: 'Returns a 256-bit digest encoded as 64 hexadecimal characters. Running this file downloads no additional library.' }, { token: 'message.toUTF8', explanation: 'Encodes the string as bytes before hashing. Encoding, spaces, and newlines affect the digest.' }, { token: 'UInt32 · ^^^ · &&& · >>>', explanation: 'Unsigned 32-bit words support modular addition, bitwise XOR, bitwise AND, and shifts.' }, { token: 'Digest comparison', explanation: 'A digest can detect a change relative to a trusted reference. Hashing does not encrypt the message or authenticate its sender by itself.' }, { token: 'Implementation scope', explanation: 'This educational implementation is tested against reference digests, including Unicode and multi-block messages. Tests are not a general correctness proof or a security audit.' }],
    challenge: 'Add a newline to "abc" and compare its digest with the original.', related: ['hashing', 'array-example'],
    references: [{ title: 'NIST Secure Hash Standard (FIPS 180-4)', url: 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final' }],
  },
];
