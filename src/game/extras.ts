// Optional extra content (reward scenes) is hidden until a code is entered in
// Settings. Only a salted SHA-256 hash of the code is stored here, so the code
// cannot be read from the source. To change it, compute
//   sha256("riichi-night:" + CODE)   (CODE upper-case, no spaces)
// e.g. python -c "import hashlib;print(hashlib.sha256(b'riichi-night:NEWCODE').hexdigest())"
// and replace CODE_HASH.
const CODE_HASH = "5f6900299de7f7e332d3d1262050f3eadc69db4f42be88401aa3639502437761";

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export async function checkExtrasCode(input: string): Promise<boolean> {
  const code = normalizeCode(input);
  if (!code || !globalThis.crypto?.subtle) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`riichi-night:${code}`));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return hex === CODE_HASH;
}
