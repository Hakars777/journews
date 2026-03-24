/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("node:fs/promises");
const path = require("node:path");

class CopyServerChunksNextToRuntimePlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise(
      "CopyServerChunksNextToRuntimePlugin",
      async () => {
        const outDir = compiler.options.output?.path;
        if (!outDir) return;

        const chunksDir = path.join(outDir, "chunks");
        let entries;
        try {
          entries = await fs.readdir(chunksDir, { withFileTypes: true });
        } catch {
          return;
        }

        const jsFiles = entries
          .filter((e) => e.isFile() && e.name.endsWith(".js"))
          .map((e) => e.name);
        if (!jsFiles.length) return;

        await Promise.all(
          jsFiles.map(async (name) => {
            const src = path.join(chunksDir, name);
            const dst = path.join(outDir, name);
            try {
              await fs.copyFile(src, dst);
            } catch {
              // ignore
            }
          }),
        );
      },
    );
  }
}

const remotePatterns = [];
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // ignore malformed env during local setup
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.platform === "win32" ? ".next-build" : ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [],
    remotePatterns,
  },
  webpack(config, { isServer, dev }) {
    if (isServer && !dev) {
      config.plugins = config.plugins || [];
      config.plugins.push(new CopyServerChunksNextToRuntimePlugin());
    }
    return config;
  },
};

module.exports = nextConfig;