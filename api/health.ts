import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const loaded = require("../dist/server.cjs");

export default loaded.default ?? loaded;
