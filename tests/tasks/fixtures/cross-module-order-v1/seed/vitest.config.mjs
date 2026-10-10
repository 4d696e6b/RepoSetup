import process from "node:process";
export default {
  cacheDir: process.env.TMPDIR + "/vite-cache",
  test: {
    include: ["test/public/managed.test.mjs"],
    watch: false,
    cache: false,
    fsModuleCache: false,
    allowOnly: false,
    passWithNoTests: false,
  },
};
