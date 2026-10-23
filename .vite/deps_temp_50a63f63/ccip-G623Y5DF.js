import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  ccipRequest,
  offchainLookup,
  offchainLookupAbiItem,
  offchainLookupSignature
} from "./chunk-Q662XUFQ.js";
import "./chunk-5HFL4MUL.js";
import "./chunk-DIDMVLHY.js";
import "./chunk-3HBVXMZT.js";
import "./chunk-J4YCHPKN.js";
import "./chunk-ZJQU6JCY.js";
export {
  ccipRequest,
  offchainLookup,
  offchainLookupAbiItem,
  offchainLookupSignature
};
//# sourceMappingURL=ccip-G623Y5DF.js.map
