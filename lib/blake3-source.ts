// Lean source shared by the example and official reference-vector checks.
export const blake3Source = `-- BLAKE3 (2020): an educational implementation using only Lean core.
-- Specification: https://github.com/BLAKE3-team/BLAKE3-specs
-- Implements unkeyed hashing with a 32-byte output, including the chunk tree.
-- Keyed hashing, key derivation, streaming, and extended output are not exposed.
-- Tested against official vectors; not a formal correctness or security proof.
namespace BLAKE3

private def iv : Array UInt32 := #[
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]

private def chunkStart : UInt32 := 1
private def chunkEnd : UInt32 := 2
private def parent : UInt32 := 4
private def root : UInt32 := 8

private def rotateRight (x n : UInt32) : UInt32 :=
  (x >>> n) ||| (x <<< (32 - n))

-- Mix four state words with two message words. UInt32 addition wraps.
private def mix (s : Array UInt32) (a b c d : Nat)
    (x y : UInt32) : Array UInt32 := Id.run do
  let mut s := s
  s := s.set! a (s[a]! + s[b]! + x)
  s := s.set! d (rotateRight (s[d]! ^^^ s[a]!) 16)
  s := s.set! c (s[c]! + s[d]!)
  s := s.set! b (rotateRight (s[b]! ^^^ s[c]!) 12)
  s := s.set! a (s[a]! + s[b]! + y)
  s := s.set! d (rotateRight (s[d]! ^^^ s[a]!) 8)
  s := s.set! c (s[c]! + s[d]!)
  s := s.set! b (rotateRight (s[b]! ^^^ s[c]!) 7)
  return s

private def round (s m : Array UInt32) : Array UInt32 := Id.run do
  -- Four columns, then four diagonals of the 4-by-4 state.
  let s := mix s 0 4 8 12 m[0]! m[1]!
  let s := mix s 1 5 9 13 m[2]! m[3]!
  let s := mix s 2 6 10 14 m[4]! m[5]!
  let s := mix s 3 7 11 15 m[6]! m[7]!
  let s := mix s 0 5 10 15 m[8]! m[9]!
  let s := mix s 1 6 11 12 m[10]! m[11]!
  let s := mix s 2 7 8 13 m[12]! m[13]!
  return mix s 3 4 9 14 m[14]! m[15]!

-- Keep the final block's inputs: root output uses a different flag.
private structure Output where
  cv : Array UInt32
  words : Array UInt32
  counter : UInt64
  length : UInt32
  flags : UInt32

private def compress (o : Output) : Array UInt32 := Id.run do
  let mut s := o.cv ++ #[iv[0]!, iv[1]!, iv[2]!, iv[3]!,
    o.counter.toUInt32, (o.counter >>> 32).toUInt32, o.length, o.flags]
  let permutation : Array Nat := #[2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8]
  let mut m := o.words
  for _ in [0:7] do
    s := round s m
    m := permutation.map (fun i => m[i]!)
  -- A chaining value and the default digest both use the first eight words.
  return (List.range 8).toArray.map (fun i => s[i]! ^^^ s[i + 8]!)

-- Read a block as little-endian words. Only its unused bytes are zero-filled.
private def blockWords (input : ByteArray) (offset length : Nat) : Array UInt32 := Id.run do
  let mut words : Array UInt32 := #[]
  for i in [0:16] do
    let mut word : UInt32 := 0
    for j in [0:4] do
      if 4 * i + j < length then
        let byte := input[offset + 4 * i + j]!.toUInt32
        word := word ||| (byte <<< UInt32.ofNat (8 * j))
    words := words.push word
  return words

-- A chunk contains at most sixteen 64-byte blocks (1,024 bytes).
-- An empty input still has one final block, with length zero.
private def chunkOutput (input : ByteArray) (index : Nat) : Output := Id.run do
  let offset := index * 1024
  let length := min 1024 (input.size - offset)
  let blocks := max 1 ((length + 63) / 64)
  let mut cv := iv
  for b in [0:blocks - 1] do
    let flags := if b == 0 then chunkStart else 0
    cv := compress {
      cv, words := blockWords input (offset + 64 * b) 64
      counter := UInt64.ofNat index, length := 64, flags }
  let finalOffset := 64 * (blocks - 1)
  let finalLength := length - finalOffset
  return {
    cv, words := blockWords input (offset + finalOffset) finalLength
    counter := UInt64.ofNat index, length := UInt32.ofNat finalLength
    flags := chunkEnd ||| (if blocks == 1 then chunkStart else 0) }

private def parentOutput (left right : Array UInt32) : Output :=
  { cv := iv, words := left ++ right, counter := 0, length := 64, flags := parent }

-- Serialize each word least-significant byte first, then encode each byte.
private def hexWord (word : UInt32) : String := Id.run do
  let digits := "0123456789abcdef".toList.toArray
  let mut text := ""
  for i in [0:4] do
    let byte := (word >>> UInt32.ofNat (8 * i)) &&& 255
    text := text.push digits[(byte >>> 4).toNat]!
    text := text.push digits[(byte &&& 15).toNat]!
  return text

-- Hash bytes using BLAKE3's binary tree, not a single-chunk shortcut.
def digestBytes (input : ByteArray) : String := Id.run do
  let chunks := max 1 ((input.size + 1023) / 1024)
  let mut stack : Array (Array UInt32) := #[]
  for i in [0:chunks - 1] do
    let mut cv := compress (chunkOutput input i)
    let mut total := i + 1
    -- Each factor of two completes another pair of equal-sized subtrees.
    while total % 2 == 0 do
      cv := compress (parentOutput stack[stack.size - 1]! cv)
      stack := stack.pop
      total := total / 2
    stack := stack.push cv
  let mut output := chunkOutput input (chunks - 1)
  for left in stack.toList.reverse do
    output := parentOutput left (compress output)
  -- ROOT distinguishes the final digest from an internal chaining value.
  let words := compress { output with counter := 0, flags := output.flags ||| root }
  return words.foldl (fun text word => text ++ hexWord word) ""

-- Encode a string as UTF-8, then return 64 lowercase hexadecimal characters.
def digest (message : String) : String := digestBytes message.toUTF8

end BLAKE3
`;
