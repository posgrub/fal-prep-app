/** Seedable RNG so sessions are reproducible in tests (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Tag match with wildcard support: 'tfm12.*' matches 'tfm12.smoke'. */
export function tagMatches(pattern: string, tag: string): boolean {
  return pattern.endsWith('.*') ? tag.startsWith(pattern.slice(0, -1)) : pattern === tag;
}
export function questionMatches(q: { topicTags: string[] }, patterns: string[]): boolean {
  return q.topicTags.some(t => patterns.some(p => tagMatches(p, t)));
}
