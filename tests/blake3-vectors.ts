import { blake3Source } from '../lib/blake3-source';
import vectors from './blake3-vectors.json';

// Official vectors include empty input, block/chunk boundaries, unbalanced
// trees, and messages up to 100 KiB. Expected results do not use our Lean code.
export const blake3Digests = [...vectors.cases, ...vectors.text].map(item => item.digest);
export const blake3VectorCode = `${blake3Source}
private def vectorInput (length : Nat) : ByteArray := Id.run do
  let mut bytes := ByteArray.empty
  for i in [0:length] do
    bytes := bytes.push (UInt8.ofNat (i % 251))
  return bytes

#eval do
  for length in ([${vectors.cases.map(item => item.length).join(', ')}] : List Nat) do
    IO.println (BLAKE3.digestBytes (vectorInput length))

${vectors.text.map(item => `#eval IO.println (BLAKE3.digest ${JSON.stringify(item.message)})`).join('\n')}
`;
