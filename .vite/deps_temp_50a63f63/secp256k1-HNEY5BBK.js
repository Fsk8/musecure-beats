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
  secp256k1
} from "./chunk-JS3K4L54.js";
import "./chunk-5ROOEFEH.js";
import "./chunk-JSGJPOMW.js";
import "./chunk-T4WI34ID.js";
import "./chunk-ZJQU6JCY.js";
export {
  encodeToCurve,
  hashToCurve,
  schnorr,
  secp256k1
};
//# sourceMappingURL=secp256k1-HNEY5BBK.js.map
