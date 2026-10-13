import type { NextConfig } from 'next';

/**
 * Every workspace package is listed, not just the one that happened to break first.
 *
 * They all ship raw TypeScript (`"main": "./src/index.ts"`), so Next has to compile them rather
 * than consume a build output. The local build tolerated the shorter list; a remote build with a
 * cold cache is not the place to discover which of them needed it.
 */
const config: NextConfig = {
  transpilePackages: [
    '@unwritten/fixtures',
    '@unwritten/policy',
    '@unwritten/memory',
    '@unwritten/chain',
  ],
};

export default config;
