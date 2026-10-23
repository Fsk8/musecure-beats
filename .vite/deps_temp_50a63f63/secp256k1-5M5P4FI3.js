import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  encodeToCurve,
  hashToCurve,
  schnorr,
  secp256k1,
  secp256k1_hasher
} from "./chunk-4EHTZGM7.js";
import "./chunk-DIDMVLHY.js";
import "./chunk-5PX3OOMX.js";
import "./chunk-3HBVXMZT.js";
import "./chunk-J4YCHPKN.js";
import "./chunk-ZJQU6JCY.js";
export {
  encodeToCurve,
  hashToCurve,
  schnorr,
  secp256k1,
  secp256k1_hasher
};
//# sourceMappingURL=secp256k1-5M5P4FI3.js.map
