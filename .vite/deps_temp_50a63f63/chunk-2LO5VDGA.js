import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  equalBytes
} from "./chunk-PRP7WBOH.js";
import {
  __toESM,
  require_dist,
  require_dist2,
  require_dist3
} from "./chunk-ZJQU6JCY.js";

// node_modules/.pnpm/@noble+curves@1.9.7/node_modules/@noble/curves/esm/abstract/utils.js
var import_dist = __toESM(require_dist());
var import_dist2 = __toESM(require_dist2());
var import_dist3 = __toESM(require_dist3());
var equalBytes2 = equalBytes;

export {
  equalBytes2 as equalBytes
};
//# sourceMappingURL=chunk-2LO5VDGA.js.map
