import { defineConfig } from "tsdown";

export default defineConfig({
    cjsDefault: true,
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    format: ["cjs"],
    minify: false,
    platform: "node",
    removeNodeProtocol: false,
    shims: true,
    skipNodeModulesBundle: true,
    target: "node22",
});
