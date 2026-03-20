import { build, context } from "esbuild"

const isWatch = process.argv.includes("--watch")

const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  format: "iife" as const,
  target: ["es2020"],
  outfile: "dist/v1.js",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
}

async function main() {
  if (isWatch) {
    const ctx = await context(buildOptions)
    await ctx.watch()
    console.log("Watching for changes...")
  } else {
    const result = await build({
      ...buildOptions,
      metafile: true,
    })

    const outputs = result.metafile?.outputs || {}
    for (const [file, info] of Object.entries(outputs)) {
      const sizeKB = (info.bytes / 1024).toFixed(2)
      console.log(`${file}: ${sizeKB} KB`)
    }

    console.log("\nBuild complete!")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
