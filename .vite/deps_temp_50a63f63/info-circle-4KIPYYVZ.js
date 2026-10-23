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

// node_modules/.pnpm/@reown+appkit-ui@1.7.8_@types+react@19.3.0_bufferutil@4.1.0_encoding@0.1.13_react@18.3._debcbd0202bd91206f49437de8296dfd/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/info-circle.js
var import_dist = __toESM(require_dist(), 1);
var import_dist2 = __toESM(require_dist2(), 1);
var import_dist3 = __toESM(require_dist3(), 1);
var infoCircleSvg = svg`<svg fill="none" viewBox="0 0 14 15">
  <path
    fill="currentColor"
    d="M6 10.49a1 1 0 1 0 2 0v-2a1 1 0 0 0-2 0v2ZM7 4.49a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
  />
  <path
    fill="currentColor"
    fill-rule="evenodd"
    d="M7 14.99a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-7a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"
    clip-rule="evenodd"
  />
</svg>`;
export {
  infoCircleSvg
};
//# sourceMappingURL=info-circle-4KIPYYVZ.js.map
