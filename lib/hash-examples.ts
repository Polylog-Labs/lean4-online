import type { Example } from './content';
import { sha256Source } from './sha256-source';
import { blake3Source } from './blake3-source';

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
    challenge: 'Add a newline to "abc" and compare its digest with the original.', related: ['blake3', 'hashing', 'array-example'],
    references: [{ title: 'NIST Secure Hash Standard (FIPS 180-4)', url: 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final' }],
  },
  {
    id: 'blake3', title: 'BLAKE3 without extra libraries', file: 'BLAKE3.lean', category: 'Cryptography', mode: 'program',
    description: 'Compute BLAKE3 digests with a self-contained implementation of its compression function and chunk tree.',
    code: `${blake3Source}
-- Basic usage: change the message passed to BLAKE3.digest.
def main : IO Unit := do
  IO.println (BLAKE3.digest "abc")
  IO.println (BLAKE3.digest "")
  let original := BLAKE3.digest "abc"
  let unchanged := BLAKE3.digest "abc"
  let changed := BLAKE3.digest "abd"
  IO.println s!"Same message: {original == unchanged}"
  IO.println s!"Changed message: {original == changed}"
`, expected: '6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85\naf1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262\nSame message: true\nChanged message: false',
    concepts: [
      { token: 'BLAKE3.digest "abc"', explanation: 'Encodes the string as UTF-8 and returns the default 32-byte BLAKE3 digest as 64 hexadecimal characters. BLAKE3.digestBytes accepts a ByteArray directly. No additional library download is needed.' },
      { token: 'UInt32 · ^^^ · ||| · >>>', explanation: 'The compression function uses addition modulo 2^32, bitwise XOR and OR, and right rotations built from shifts. Words are read and written in little-endian byte order.' },
      { token: 'structure Output · { output with … }', explanation: 'Output stores the inputs to a compression call. Structure update syntax copies those fields and changes the counter and flags for the final digest.' },
      { token: 'Chunks and the tree', explanation: 'BLAKE3 divides input into 1,024-byte chunks. Each chunk processes up to sixteen 64-byte blocks; parent nodes combine pairs of chaining values. A stack tracks completed subtrees, including when the number of chunks is not a power of two.' },
      { token: 'ROOT flag', explanation: 'A flag distinguishes the final digest from an internal chaining value. Taking an ordinary chaining value as the digest would produce the wrong result.' },
      { token: 'Implementation scope', explanation: 'This educational version implements unkeyed hashing with a 32-byte output. It runs sequentially and does not expose keyed hashing, key derivation, streaming, or extended output. Official test vectors check its results; they are not a general correctness proof or a security audit.' },
      { token: 'Digest comparison', explanation: 'BLAKE3 and SHA-256 produce different digests for the same input. Both can detect changes relative to a trusted reference; hashing alone does not encrypt a message or authenticate its sender.' },
    ],
    challenge: 'Hash String.ofList (List.replicate 1025 \'a\') to cross a chunk boundary. Then change its length to 1024 and compare the digests.',
    related: ['sha256', 'hashing', 'array-example'],
    references: [
      { title: 'BLAKE3 specification', url: 'https://github.com/BLAKE3-team/BLAKE3-specs/blob/master/blake3.pdf' },
      { title: 'Official BLAKE3 test vectors', url: 'https://github.com/BLAKE3-team/BLAKE3/blob/6aab490a26124663329dfd3961b8469f8fdb158b/test_vectors/test_vectors.json' },
    ],
  },
];
