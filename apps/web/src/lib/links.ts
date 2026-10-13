/**
 * Every outward link in one place.
 *
 * The submission checklist asks for a blog post and a demo video, and both are published late —
 * after the code is frozen. Scattering them through the pages means the day they exist is the day
 * someone has to find all the places they were supposed to go. A null here renders as 'not
 * published yet', which is honest, rather than as a link that 404s in front of a reviewer.
 */
export const LINKS = {
  site: 'https://unwritten-house.vercel.app',
  repo: 'https://github.com/EdCryptoFi/unwritten',
  aiBuilder: 'https://github.com/EdCryptoFi/unwritten-ai-builder',
  /** The checklist's 'published blog post'. Fill in on publish. */
  writeup: null as string | null,
  /** The checklist's 'working demo' video. Fill in on upload. */
  video: null as string | null,
} as const;
