import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  svg
} from "./chunk-JJREBROI.js";
import {
  __toESM,
  require_dist,
  require_dist2,
  require_dist3
} from "./chunk-ZJQU6JCY.js";

// node_modules/.pnpm/@reown+appkit-ui@1.7.8_@types+react@19.3.0_bufferutil@4.1.0_encoding@0.1.13_react@18.3._debcbd0202bd91206f49437de8296dfd/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-top.js
var import_dist = __toESM(require_dist(), 1);
var import_dist2 = __toESM(require_dist2(), 1);
var import_dist3 = __toESM(require_dist3(), 1);
var arrowTopSvg = svg`<svg fill="none" viewBox="0 0 14 15">
  <path
    fill="currentColor"
    fill-rule="evenodd"
    d="M7 13.99a1 1 0 0 1-1-1V5.4L3.54 7.86a1 1 0 0 1-1.42-1.41L6.3 2.28a1 1 0 0 1 1.41 0l4.17 4.17a1 1 0 1 1-1.41 1.41L8 5.4v7.59a1 1 0 0 1-1 1Z"
    clip-rule="evenodd"
  />
</svg>`;
export {
  arrowTopSvg
};
//# sourceMappingURL=arrow-top-4IYVHM2P.js.map
