import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  SHA224,
  SHA256,
  SHA384,
  SHA512,
  SHA512_224,
  SHA512_256,
  sha224,
  sha256,
  sha384,
  sha512,
  sha512_224,
  sha512_256
} from "./chunk-5PX3OOMX.js";
import "./chunk-3HBVXMZT.js";
import "./chunk-J4YCHPKN.js";
import "./chunk-ZJQU6JCY.js";
export {
  SHA224,
  SHA256,
  SHA384,
  SHA512,
  SHA512_224,
  SHA512_256,
  sha224,
  sha256,
  sha384,
  sha512,
  sha512_224,
  sha512_256
};
//# sourceMappingURL=@noble_hashes_sha2.js.map
