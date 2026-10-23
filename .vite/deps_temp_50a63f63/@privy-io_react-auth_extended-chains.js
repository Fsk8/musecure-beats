import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  A,
  e9 as e,
  f,
  g,
  r5 as r,
  s2 as s,
  w2 as w
} from "./chunk-FPP6Z2DT.js";
import "./chunk-5GA5IP7B.js";
import "./chunk-E7PRQFXC.js";
import "./chunk-PRP7WBOH.js";
import "./chunk-4EHTZGM7.js";
import "./chunk-Q662XUFQ.js";
import "./chunk-5HFL4MUL.js";
import "./chunk-DIDMVLHY.js";
import {
  require_react
} from "./chunk-KUALYXHM.js";
import "./chunk-ZOOKFV4F.js";
import "./chunk-I4FVBOHE.js";
import "./chunk-5PX3OOMX.js";
import "./chunk-3HBVXMZT.js";
import "./chunk-J4YCHPKN.js";
import {
  __toESM,
  require_dist,
  require_dist2,
  require_dist3
} from "./chunk-ZJQU6JCY.js";

// node_modules/.pnpm/@privy-io+react-auth@2.25.0_@solana+kit@5.5.1_bufferutil@4.1.0_utf-8-validate@6.0.6__@s_bba03e6529363b78c6aa34406c491d92/node_modules/@privy-io/react-auth/dist/esm/extended-chains.mjs
var import_dist = __toESM(require_dist(), 1);
var import_dist2 = __toESM(require_dist2(), 1);
var import_dist3 = __toESM(require_dist3(), 1);
var import_react = __toESM(require_react(), 1);
var h = () => {
  let { refreshSessionAndUser: t, privy: i } = s();
  return (0, import_react.useMemo)(() => ({ async createWallet(r3) {
    let a = await r(i, { request: { chain_type: r3.chainType } }), s2 = await t();
    if (!s2) throw Error("User must be authenticated before creating a Privy wallet");
    return { user: s2, wallet: a };
  } }), [t, i]);
};
var u = () => {
  let { user: e2 } = g(), { privy: h2 } = s(), { signWithUserSigner: u2 } = w();
  return (0, import_react.useMemo)(() => ({ async signRawHash({ address: r3, chainType: a, hash: i }) {
    if (!e2) throw Error("User must be authenticated before signing");
    let s2 = f(e2, a).filter((r4) => A(r4)).find((e3) => e3.address === r3);
    if (!s2) throw Error("Wallet not found");
    let d = await e(h2, u2, { wallet_id: s2.id, params: { hash: i } });
    if (d.data && "signature" in d.data && "hex" === d.data.encoding) return { signature: d.data.signature };
    throw Error("Failed to sign");
  } }), [h2, u2, e2]);
};
export {
  h as useCreateWallet,
  u as useSignRawHash
};
//# sourceMappingURL=@privy-io_react-auth_extended-chains.js.map
