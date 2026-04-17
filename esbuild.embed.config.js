module.exports = {
  entryPoints: ["src/embed/embed.ts"],
  bundle: true,
  outfile: "public/embed/v1/embed.js",
  minify: true,
  target: "es2020",
  format: "iife",
  sourcemap: true,
};
