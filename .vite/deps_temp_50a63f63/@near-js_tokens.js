import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  FungibleToken,
  NEAR,
  NFTContract,
  NativeToken,
  NonFungibleToken,
  mainnet_exports,
  testnet_exports
} from "./chunk-DCKHNP7R.js";
import "./chunk-ZJQU6JCY.js";
export {
  FungibleToken,
  NEAR,
  NFTContract,
  NativeToken,
  NonFungibleToken,
  mainnet_exports as mainnet,
  testnet_exports as testnet
};
//# sourceMappingURL=@near-js_tokens.js.map
