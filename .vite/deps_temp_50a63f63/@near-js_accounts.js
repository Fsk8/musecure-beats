import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  sha256
} from "./chunk-5ROOEFEH.js";
import {
  FailoverRpcProvider,
  JsonRpcProvider,
  exponentialBackoff
} from "./chunk-KCNXEWPD.js";
import {
  ArgumentTypeError,
  DEFAULT_FUNCTION_CALL_GAS,
  ErrorContext,
  GlobalContractDeployMode,
  GlobalContractIdentifier,
  KeyPair,
  KeyType,
  Logger,
  PositionalArgsError,
  PublicKey,
  Signature,
  SignedDelegate,
  SignedTransaction,
  TypedError,
  actionCreators,
  baseDecode,
  baseEncode,
  buildDelegateAction,
  createTransaction,
  encodeDelegateAction,
  encodeTransaction,
  getTransactionLastResult,
  parseNearAmount,
  parseResultError,
  printTxOutcomeLogs,
  printTxOutcomeLogsAndFailures,
  require_browser,
  require_util,
  serialize,
  stringifyJsonOrBytes
} from "./chunk-DC45WWGP.js";
import "./chunk-JSGJPOMW.js";
import "./chunk-LC5MBEXJ.js";
import "./chunk-T4WI34ID.js";
import "./chunk-2QPDYX4J.js";
import "./chunk-ZOOKFV4F.js";
import "./chunk-I4FVBOHE.js";
import {
  NEAR
} from "./chunk-DCKHNP7R.js";
import "./chunk-J4YCHPKN.js";
import {
  __commonJS,
  __publicField,
  __toESM,
  require_dist,
  require_dist2,
  require_dist3
} from "./chunk-ZJQU6JCY.js";

// node_modules/.pnpm/lru_map@0.4.1/node_modules/lru_map/dist/lru.js
var require_lru = __commonJS({
  "node_modules/.pnpm/lru_map@0.4.1/node_modules/lru_map/dist/lru.js"(exports, module) {
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    !function(g, c) {
      typeof exports == "object" && typeof module != "undefined" ? c(exports) : typeof define == "function" && define.amd ? define(["exports"], c) : c((g = g || self).lru_map = g.lru_map || {});
    }(exports, function(g) {
      const c = Symbol("newer"), e = Symbol("older");
      class n {
        constructor(a, b) {
          typeof a !== "number" && (b = a, a = 0), this.size = 0, this.limit = a, this.oldest = this.newest = void 0, this._keymap = /* @__PURE__ */ new Map(), b && (this.assign(b), a < 1 && (this.limit = this.size));
        }
        _markEntryAsUsed(a) {
          if (a === this.newest) return;
          a[c] && (a === this.oldest && (this.oldest = a[c]), a[c][e] = a[e]), a[e] && (a[e][c] = a[c]), a[c] = void 0, a[e] = this.newest, this.newest && (this.newest[c] = a), this.newest = a;
        }
        assign(a) {
          let b, d = this.limit || Number.MAX_VALUE;
          this._keymap.clear();
          let m = a[Symbol.iterator]();
          for (let h = m.next(); !h.done; h = m.next()) {
            let f = new l(h.value[0], h.value[1]);
            this._keymap.set(f.key, f), b ? (b[c] = f, f[e] = b) : this.oldest = f, b = f;
            if (d-- == 0) throw new Error("overflow");
          }
          this.newest = b, this.size = this._keymap.size;
        }
        get(a) {
          var b = this._keymap.get(a);
          return b ? (this._markEntryAsUsed(b), b.value) : void 0;
        }
        set(a, b) {
          var d = this._keymap.get(a);
          return d ? (d.value = b, this._markEntryAsUsed(d), this) : (this._keymap.set(a, d = new l(a, b)), this.newest ? (this.newest[c] = d, d[e] = this.newest) : this.oldest = d, this.newest = d, ++this.size, this.size > this.limit && this.shift(), this);
        }
        shift() {
          var a = this.oldest;
          if (a) return this.oldest[c] ? (this.oldest = this.oldest[c], this.oldest[e] = void 0) : (this.oldest = void 0, this.newest = void 0), a[c] = a[e] = void 0, this._keymap.delete(a.key), --this.size, [a.key, a.value];
        }
        find(a) {
          let b = this._keymap.get(a);
          return b ? b.value : void 0;
        }
        has(a) {
          return this._keymap.has(a);
        }
        delete(a) {
          var b = this._keymap.get(a);
          return b ? (this._keymap.delete(b.key), b[c] && b[e] ? (b[e][c] = b[c], b[c][e] = b[e]) : b[c] ? (b[c][e] = void 0, this.oldest = b[c]) : b[e] ? (b[e][c] = void 0, this.newest = b[e]) : this.oldest = this.newest = void 0, this.size--, b.value) : void 0;
        }
        clear() {
          this.oldest = this.newest = void 0, this.size = 0, this._keymap.clear();
        }
        keys() {
          return new j(this.oldest);
        }
        values() {
          return new k(this.oldest);
        }
        entries() {
          return this;
        }
        [Symbol.iterator]() {
          return new i(this.oldest);
        }
        forEach(a, b) {
          typeof b !== "object" && (b = this);
          let d = this.oldest;
          for (; d; ) a.call(b, d.value, d.key, this), d = d[c];
        }
        toJSON() {
          for (var a = new Array(this.size), b = 0, d = this.oldest; d; ) a[b++] = { key: d.key, value: d.value }, d = d[c];
          return a;
        }
        toString() {
          for (var a = "", b = this.oldest; b; ) a += String(b.key) + ":" + b.value, b = b[c], b && (a += " < ");
          return a;
        }
      }
      g.LRUMap = n;
      function l(a, b) {
        this.key = a, this.value = b, this[c] = void 0, this[e] = void 0;
      }
      function i(a) {
        this.entry = a;
      }
      i.prototype[Symbol.iterator] = function() {
        return this;
      }, i.prototype.next = function() {
        let a = this.entry;
        return a ? (this.entry = a[c], { done: false, value: [a.key, a.value] }) : { done: true, value: void 0 };
      };
      function j(a) {
        this.entry = a;
      }
      j.prototype[Symbol.iterator] = function() {
        return this;
      }, j.prototype.next = function() {
        let a = this.entry;
        return a ? (this.entry = a[c], { done: false, value: a.key }) : { done: true, value: void 0 };
      };
      function k(a) {
        this.entry = a;
      }
      k.prototype[Symbol.iterator] = function() {
        return this;
      }, k.prototype.next = function() {
        let a = this.entry;
        return a ? (this.entry = a[c], { done: false, value: a.value }) : { done: true, value: void 0 };
      };
    });
  }
});

// node_modules/.pnpm/is-property@1.0.2/node_modules/is-property/is-property.js
var require_is_property = __commonJS({
  "node_modules/.pnpm/is-property@1.0.2/node_modules/is-property/is-property.js"(exports, module) {
    "use strict";
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    function isProperty(str) {
      return /^[$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc][$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc0-9\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19b0-\u19c0\u19c8\u19c9\u19d0-\u19d9\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1dc0-\u1de6\u1dfc-\u1dff\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f]*$/.test(str);
    }
    module.exports = isProperty;
  }
});

// node_modules/.pnpm/generate-object-property@1.2.0/node_modules/generate-object-property/index.js
var require_generate_object_property = __commonJS({
  "node_modules/.pnpm/generate-object-property@1.2.0/node_modules/generate-object-property/index.js"(exports, module) {
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    var isProperty = require_is_property();
    var gen = function(obj, prop) {
      return isProperty(prop) ? obj + "." + prop : obj + "[" + JSON.stringify(prop) + "]";
    };
    gen.valid = isProperty;
    gen.property = function(prop) {
      return isProperty(prop) ? prop : JSON.stringify(prop);
    };
    module.exports = gen;
  }
});

// node_modules/.pnpm/generate-function@2.3.1/node_modules/generate-function/index.js
var require_generate_function = __commonJS({
  "node_modules/.pnpm/generate-function@2.3.1/node_modules/generate-function/index.js"(exports, module) {
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    var util = require_util();
    var isProperty = require_is_property();
    var INDENT_START = /[\{\[]/;
    var INDENT_END = /[\}\]]/;
    var RESERVED = [
      "do",
      "if",
      "in",
      "for",
      "let",
      "new",
      "try",
      "var",
      "case",
      "else",
      "enum",
      "eval",
      "null",
      "this",
      "true",
      "void",
      "with",
      "await",
      "break",
      "catch",
      "class",
      "const",
      "false",
      "super",
      "throw",
      "while",
      "yield",
      "delete",
      "export",
      "import",
      "public",
      "return",
      "static",
      "switch",
      "typeof",
      "default",
      "extends",
      "finally",
      "package",
      "private",
      "continue",
      "debugger",
      "function",
      "arguments",
      "interface",
      "protected",
      "implements",
      "instanceof",
      "NaN",
      "undefined"
    ];
    var RESERVED_MAP = {};
    for (i = 0; i < RESERVED.length; i++) {
      RESERVED_MAP[RESERVED[i]] = true;
    }
    var i;
    var isVariable = function(name) {
      return isProperty(name) && !RESERVED_MAP.hasOwnProperty(name);
    };
    var formats = {
      s: function(s) {
        return "" + s;
      },
      d: function(d) {
        return "" + Number(d);
      },
      o: function(o) {
        return JSON.stringify(o);
      }
    };
    var genfun = function() {
      var lines = [];
      var indent = 0;
      var vars = {};
      var push = function(str) {
        var spaces = "";
        while (spaces.length < indent * 2) spaces += "  ";
        lines.push(spaces + str);
      };
      var pushLine = function(line2) {
        if (INDENT_END.test(line2.trim()[0]) && INDENT_START.test(line2[line2.length - 1])) {
          indent--;
          push(line2);
          indent++;
          return;
        }
        if (INDENT_START.test(line2[line2.length - 1])) {
          push(line2);
          indent++;
          return;
        }
        if (INDENT_END.test(line2.trim()[0])) {
          indent--;
          push(line2);
          return;
        }
        push(line2);
      };
      var line = function(fmt) {
        if (!fmt) return line;
        if (arguments.length === 1 && fmt.indexOf("\n") > -1) {
          var lines2 = fmt.trim().split("\n");
          for (var i2 = 0; i2 < lines2.length; i2++) {
            pushLine(lines2[i2].trim());
          }
        } else {
          pushLine(util.format.apply(util, arguments));
        }
        return line;
      };
      line.scope = {};
      line.formats = formats;
      line.sym = function(name) {
        if (!name || !isVariable(name)) name = "tmp";
        if (!vars[name]) vars[name] = 0;
        return name + (vars[name]++ || "");
      };
      line.property = function(obj, name) {
        if (arguments.length === 1) {
          name = obj;
          obj = "";
        }
        name = name + "";
        if (isProperty(name)) return obj ? obj + "." + name : name;
        return obj ? obj + "[" + JSON.stringify(name) + "]" : JSON.stringify(name);
      };
      line.toString = function() {
        return lines.join("\n");
      };
      line.toFunction = function(scope) {
        if (!scope) scope = {};
        var src = "return (" + line.toString() + ")";
        Object.keys(line.scope).forEach(function(key) {
          if (!scope[key]) scope[key] = line.scope[key];
        });
        var keys = Object.keys(scope).map(function(key) {
          return key;
        });
        var vals = keys.map(function(key) {
          return scope[key];
        });
        return Function.apply(null, keys.concat(src)).apply(null, vals);
      };
      if (arguments.length) line.apply(null, arguments);
      return line;
    };
    genfun.formats = formats;
    module.exports = genfun;
  }
});

// node_modules/.pnpm/jsonpointer@5.0.1/node_modules/jsonpointer/jsonpointer.js
var require_jsonpointer = __commonJS({
  "node_modules/.pnpm/jsonpointer@5.0.1/node_modules/jsonpointer/jsonpointer.js"(exports) {
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    var hasExcape = /~/;
    var escapeMatcher = /~[01]/g;
    function escapeReplacer(m) {
      switch (m) {
        case "~1":
          return "/";
        case "~0":
          return "~";
      }
      throw new Error("Invalid tilde escape: " + m);
    }
    function untilde(str) {
      if (!hasExcape.test(str)) return str;
      return str.replace(escapeMatcher, escapeReplacer);
    }
    function setter(obj, pointer, value) {
      var part;
      var hasNextPart;
      for (var p = 1, len = pointer.length; p < len; ) {
        if (pointer[p] === "constructor" || pointer[p] === "prototype" || pointer[p] === "__proto__") return obj;
        part = untilde(pointer[p++]);
        hasNextPart = len > p;
        if (typeof obj[part] === "undefined") {
          if (Array.isArray(obj) && part === "-") {
            part = obj.length;
          }
          if (hasNextPart) {
            if (pointer[p] !== "" && pointer[p] < Infinity || pointer[p] === "-") obj[part] = [];
            else obj[part] = {};
          }
        }
        if (!hasNextPart) break;
        obj = obj[part];
      }
      var oldValue = obj[part];
      if (value === void 0) delete obj[part];
      else obj[part] = value;
      return oldValue;
    }
    function compilePointer(pointer) {
      if (typeof pointer === "string") {
        pointer = pointer.split("/");
        if (pointer[0] === "") return pointer;
        throw new Error("Invalid JSON pointer.");
      } else if (Array.isArray(pointer)) {
        for (const part of pointer) {
          if (typeof part !== "string" && typeof part !== "number") {
            throw new Error("Invalid JSON pointer. Must be of type string or number.");
          }
        }
        return pointer;
      }
      throw new Error("Invalid JSON pointer.");
    }
    function get(obj, pointer) {
      if (typeof obj !== "object") throw new Error("Invalid input object.");
      pointer = compilePointer(pointer);
      var len = pointer.length;
      if (len === 1) return obj;
      for (var p = 1; p < len; ) {
        obj = obj[untilde(pointer[p++])];
        if (len === p) return obj;
        if (typeof obj !== "object" || obj === null) return void 0;
      }
    }
    function set(obj, pointer, value) {
      if (typeof obj !== "object") throw new Error("Invalid input object.");
      pointer = compilePointer(pointer);
      if (pointer.length === 0) throw new Error("Invalid JSON pointer for set.");
      return setter(obj, pointer, value);
    }
    function compile(pointer) {
      var compiled = compilePointer(pointer);
      return {
        get: function(object) {
          return get(object, compiled);
        },
        set: function(object, value) {
          return set(object, compiled, value);
        }
      };
    }
    exports.get = get;
    exports.set = set;
    exports.compile = compile;
  }
});

// node_modules/.pnpm/xtend@4.0.2/node_modules/xtend/immutable.js
var require_immutable = __commonJS({
  "node_modules/.pnpm/xtend@4.0.2/node_modules/xtend/immutable.js"(exports, module) {
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend() {
      var target = {};
      for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/.pnpm/is-my-ip-valid@1.0.1/node_modules/is-my-ip-valid/index.js
var require_is_my_ip_valid = __commonJS({
  "node_modules/.pnpm/is-my-ip-valid@1.0.1/node_modules/is-my-ip-valid/index.js"(exports, module) {
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    var reIpv4FirstPass = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    var reSubnetString = /\/\d{1,3}(?=%|$)/;
    var reForwardSlash = /\//;
    var reZone = /%.*$/;
    var reBadCharacters = /([^0-9a-f:/%])/i;
    var reBadAddress = /([0-9a-f]{5,}|:{3,}|[^:]:$|^:[^:]|\/$)/i;
    function validate4(input) {
      if (!reIpv4FirstPass.test(input)) return false;
      var parts = input.split(".");
      if (parts.length !== 4) return false;
      if (parts[0][0] === "0" && parts[0].length > 1) return false;
      if (parts[1][0] === "0" && parts[1].length > 1) return false;
      if (parts[2][0] === "0" && parts[2].length > 1) return false;
      if (parts[3][0] === "0" && parts[3].length > 1) return false;
      var n0 = Number(parts[0]);
      var n1 = Number(parts[1]);
      var n2 = Number(parts[2]);
      var n3 = Number(parts[3]);
      return n0 >= 0 && n0 < 256 && n1 >= 0 && n1 < 256 && n2 >= 0 && n2 < 256 && n3 >= 0 && n3 < 256;
    }
    function validate6(input) {
      var withoutSubnet = input.replace(reSubnetString, "");
      var hasSubnet = input.length !== withoutSubnet.length;
      if (hasSubnet) return false;
      if (!hasSubnet) {
        if (reForwardSlash.test(input)) return false;
      }
      var withoutZone = withoutSubnet.replace(reZone, "");
      var lastPartSeparator = withoutZone.lastIndexOf(":");
      if (lastPartSeparator === -1) return false;
      var lastPart = withoutZone.substring(lastPartSeparator + 1);
      var hasV4Part = validate4(lastPart);
      var address = hasV4Part ? withoutZone.substring(0, lastPartSeparator + 1) + "1234:5678" : withoutZone;
      if (reBadCharacters.test(address)) return false;
      if (reBadAddress.test(address)) return false;
      var halves = address.split("::");
      if (halves.length > 2) return false;
      if (halves.length === 2) {
        var first = halves[0] === "" ? [] : halves[0].split(":");
        var last = halves[1] === "" ? [] : halves[1].split(":");
        var remainingLength = 8 - (first.length + last.length);
        if (remainingLength <= 0) return false;
      } else {
        if (address.split(":").length !== 8) return false;
      }
      return true;
    }
    function validate(input) {
      return validate4(input) || validate6(input);
    }
    module.exports = function validator3(options) {
      if (!options) options = {};
      if (options.version === 4) return validate4;
      if (options.version === 6) return validate6;
      if (options.version == null) return validate;
      throw new Error("Unknown version: " + options.version);
    };
    module.exports["__all_regexes__"] = [
      reIpv4FirstPass,
      reSubnetString,
      reForwardSlash,
      reZone,
      reBadCharacters,
      reBadAddress
    ];
  }
});

// node_modules/.pnpm/is-my-json-valid@2.20.6/node_modules/is-my-json-valid/formats.js
var require_formats = __commonJS({
  "node_modules/.pnpm/is-my-json-valid@2.20.6/node_modules/is-my-json-valid/formats.js"(exports) {
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    var createIpValidator = require_is_my_ip_valid();
    var reEmailWhitespace = /\s/;
    var reHostnameFirstPass = /^[a-zA-Z0-9.-]+$/;
    var reHostnamePart = /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])$/;
    var rePhoneFirstPass = /^\+[0-9][0-9 ]{5,27}[0-9]$/;
    var rePhoneDoubleSpace = / {2}/;
    var rePhoneGlobalSpace = / /g;
    exports["date-time"] = /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-[0-9]{2}[tT ]\d{2}:\d{2}:\d{2}(?:\.\d+|)([zZ]|[+-]\d{2}:\d{2})$/;
    exports["date"] = /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-[0-9]{2}$/;
    exports["time"] = /^\d{2}:\d{2}:\d{2}$/;
    exports["email"] = function(input) {
      return input.indexOf("@") !== -1 && !reEmailWhitespace.test(input);
    };
    exports["ip-address"] = exports["ipv4"] = createIpValidator({ version: 4 });
    exports["ipv6"] = createIpValidator({ version: 6 });
    exports["uri"] = /^[a-zA-Z][a-zA-Z0-9+\-.]*:[^\s]*$/;
    exports["color"] = /(#?([0-9A-Fa-f]{3,6})\b)|(aqua)|(black)|(blue)|(fuchsia)|(gray)|(green)|(lime)|(maroon)|(navy)|(olive)|(orange)|(purple)|(red)|(silver)|(teal)|(white)|(yellow)|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\))/;
    exports["hostname"] = function(input) {
      if (!reHostnameFirstPass.test(input)) return false;
      var parts = input.split(".");
      for (var i = 0; i < parts.length; i++) {
        if (!reHostnamePart.test(parts[i])) return false;
      }
      return true;
    };
    exports["alpha"] = /^[a-zA-Z]+$/;
    exports["alphanumeric"] = /^[a-zA-Z0-9]+$/;
    exports["style"] = /.:\s*[^;]/g;
    exports["phone"] = function(input) {
      if (!rePhoneFirstPass.test(input)) return false;
      if (rePhoneDoubleSpace.test(input)) return false;
      var digits = input.substring(1).replace(rePhoneGlobalSpace, "").length;
      return digits >= 7 && digits <= 15;
    };
    exports["utc-millisec"] = /^[0-9]{1,15}\.?[0-9]{0,15}$/;
  }
});

// node_modules/.pnpm/is-my-json-valid@2.20.6/node_modules/is-my-json-valid/index.js
var require_is_my_json_valid = __commonJS({
  "node_modules/.pnpm/is-my-json-valid@2.20.6/node_modules/is-my-json-valid/index.js"(exports, module) {
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    var genobj = require_generate_object_property();
    var genfun = require_generate_function();
    var jsonpointer = require_jsonpointer();
    var xtend = require_immutable();
    var formats = require_formats();
    var get = function(obj, additionalSchemas, ptr) {
      var visit = function(sub) {
        if (sub && sub.id === ptr) return sub;
        if (typeof sub !== "object" || !sub) return null;
        return Object.keys(sub).reduce(function(res2, k) {
          return res2 || visit(sub[k]);
        }, null);
      };
      var res = visit(obj);
      if (res) return res;
      ptr = ptr.replace(/^#/, "");
      ptr = ptr.replace(/\/$/, "");
      try {
        return jsonpointer.get(obj, decodeURI(ptr));
      } catch (err) {
        var end = ptr.indexOf("#");
        var other;
        if (end !== 0) {
          if (end === -1) {
            other = additionalSchemas[ptr];
          } else {
            var ext = ptr.slice(0, end);
            other = additionalSchemas[ext];
            var fragment = ptr.slice(end).replace(/^#/, "");
            try {
              return jsonpointer.get(other, fragment);
            } catch (err2) {
            }
          }
        } else {
          other = additionalSchemas[ptr];
        }
        return other || null;
      }
    };
    var types = {};
    types.any = function() {
      return "true";
    };
    types.null = function(name) {
      return name + " === null";
    };
    types.boolean = function(name) {
      return "typeof " + name + ' === "boolean"';
    };
    types.array = function(name) {
      return "Array.isArray(" + name + ")";
    };
    types.object = function(name) {
      return "typeof " + name + ' === "object" && ' + name + " && !Array.isArray(" + name + ")";
    };
    types.number = function(name) {
      return "typeof " + name + ' === "number" && isFinite(' + name + ")";
    };
    types.integer = function(name) {
      return "typeof " + name + ' === "number" && (Math.floor(' + name + ") === " + name + " || " + name + " > 9007199254740992 || " + name + " < -9007199254740992)";
    };
    types.string = function(name) {
      return "typeof " + name + ' === "string"';
    };
    var unique = function(array, len) {
      len = Math.min(len === -1 ? array.length : len, array.length);
      var list = [];
      for (var i = 0; i < len; i++) {
        list.push(typeof array[i] === "object" ? JSON.stringify(array[i]) : array[i]);
      }
      for (var i = 1; i < list.length; i++) {
        if (list.indexOf(list[i]) !== i) return false;
      }
      return true;
    };
    var isMultipleOf = function(name, multipleOf) {
      var res;
      var factor = (multipleOf | 0) !== multipleOf ? Math.pow(10, multipleOf.toString().split(".").pop().length) : 1;
      if (factor > 1) {
        var factorName = (name | 0) !== name ? Math.pow(10, name.toString().split(".").pop().length) : 1;
        if (factorName > factor) res = true;
        else res = Math.round(factor * name) % (factor * multipleOf);
      } else res = name % multipleOf;
      return !res;
    };
    var testLimitedRegex = function(r, s, maxLength) {
      if (maxLength > -1 && s.length > maxLength) return true;
      return r.test(s);
    };
    var compile = function(schema, cache, root, reporter, opts) {
      var fmts = opts ? xtend(formats, opts.formats) : formats;
      var scope = { unique, formats: fmts, isMultipleOf, testLimitedRegex };
      var verbose = opts ? !!opts.verbose : false;
      var greedy = opts && opts.greedy !== void 0 ? opts.greedy : false;
      var syms = {};
      var allocated = [];
      var gensym = function(name) {
        var res = name + (syms[name] = (syms[name] || 0) + 1);
        allocated.push(res);
        return res;
      };
      var formatName = function(field) {
        var s = JSON.stringify(field);
        try {
          var pattern = /\[([^\[\]"]+)\]/;
          while (pattern.test(s)) s = s.replace(pattern, replacer);
          return s;
        } catch (_) {
          return JSON.stringify(field);
        }
        function replacer(match, v) {
          if (allocated.indexOf(v) === -1) throw new Error("Unreplaceable");
          return '." + ' + v + ' + "';
        }
      };
      var reversePatterns = {};
      var patterns = function(p) {
        if (reversePatterns[p]) return reversePatterns[p];
        var n = gensym("pattern");
        scope[n] = new RegExp(p);
        reversePatterns[p] = n;
        return n;
      };
      var vars = ["i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "x", "y", "z"];
      var genloop = function() {
        var v = vars.shift();
        vars.push(v + v[0]);
        allocated.push(v);
        return v;
      };
      var visit = function(name, node, reporter2, filter, schemaPath) {
        var properties = node.properties;
        var type = node.type;
        var tuple = false;
        if (Array.isArray(node.items)) {
          properties = {};
          node.items.forEach(function(item, i2) {
            properties[i2] = item;
          });
          type = "array";
          tuple = true;
        }
        var indent = 0;
        var error = function(msg, prop, value) {
          validate("errors++");
          if (reporter2 === true) {
            validate("if (validate.errors === null) validate.errors = []");
            if (verbose) {
              validate(
                "validate.errors.push({field:%s,message:%s,value:%s,type:%s,schemaPath:%s})",
                formatName(prop || name),
                JSON.stringify(msg),
                value || name,
                JSON.stringify(type),
                JSON.stringify(schemaPath)
              );
            } else {
              validate("validate.errors.push({field:%s,message:%s})", formatName(prop || name), JSON.stringify(msg));
            }
          }
        };
        if (node.required === true) {
          indent++;
          validate("if (%s === undefined) {", name);
          error("is required");
          validate("} else {");
        } else {
          indent++;
          validate("if (%s !== undefined) {", name);
        }
        var valid = [].concat(type).map(function(t) {
          if (t && !types.hasOwnProperty(t)) {
            throw new Error("Unknown type: " + t);
          }
          return types[t || "any"](name);
        }).join(" || ") || "true";
        if (valid !== "true") {
          indent++;
          validate("if (!(%s)) {", valid);
          error("is the wrong type");
          validate("} else {");
        }
        if (tuple) {
          if (node.additionalItems === false) {
            validate("if (%s.length > %d) {", name, node.items.length);
            error("has additional items");
            validate("}");
          } else if (node.additionalItems) {
            var i = genloop();
            validate("for (var %s = %d; %s < %s.length; %s++) {", i, node.items.length, i, name, i);
            visit(name + "[" + i + "]", node.additionalItems, reporter2, filter, schemaPath.concat("additionalItems"));
            validate("}");
          }
        }
        if (node.format && fmts[node.format]) {
          if (type !== "string" && formats[node.format]) validate("if (%s) {", types.string(name));
          var n = gensym("format");
          scope[n] = fmts[node.format];
          if (typeof scope[n] === "function") validate("if (!%s(%s)) {", n, name);
          else validate("if (!testLimitedRegex(%s, %s, %d)) {", n, name, typeof node.maxLength === "undefined" ? -1 : node.maxLength);
          error("must be " + node.format + " format");
          validate("}");
          if (type !== "string" && formats[node.format]) validate("}");
        }
        if (Array.isArray(node.required)) {
          var n = gensym("missing");
          validate("var %s = 0", n);
          var checkRequired = function(req) {
            var prop = genobj(name, req);
            validate("if (%s === undefined) {", prop);
            error("is required", prop);
            validate("%s++", n);
            validate("}");
          };
          validate("if ((%s)) {", type !== "object" ? types.object(name) : "true");
          node.required.map(checkRequired);
          validate("}");
          if (!greedy) {
            validate("if (%s === 0) {", n);
            indent++;
          }
        }
        if (node.uniqueItems) {
          if (type !== "array") validate("if (%s) {", types.array(name));
          validate("if (!(unique(%s, %d))) {", name, node.maxItems || -1);
          error("must be unique");
          validate("}");
          if (type !== "array") validate("}");
        }
        if (node.enum) {
          var complex = node.enum.some(function(e) {
            return typeof e === "object";
          });
          var compare = complex ? function(e) {
            return "JSON.stringify(" + name + ") !== JSON.stringify(" + JSON.stringify(e) + ")";
          } : function(e) {
            return name + " !== " + JSON.stringify(e);
          };
          validate("if (%s) {", node.enum.map(compare).join(" && ") || "false");
          error("must be an enum value");
          validate("}");
        }
        if (node.dependencies) {
          if (type !== "object") validate("if (%s) {", types.object(name));
          Object.keys(node.dependencies).forEach(function(key) {
            var deps = node.dependencies[key];
            if (typeof deps === "string") deps = [deps];
            var exists = function(k) {
              return genobj(name, k) + " !== undefined";
            };
            if (Array.isArray(deps)) {
              validate("if (%s !== undefined && !(%s)) {", genobj(name, key), deps.map(exists).join(" && ") || "true");
              error("dependencies not set");
              validate("}");
            }
            if (typeof deps === "object") {
              validate("if (%s !== undefined) {", genobj(name, key));
              visit(name, deps, reporter2, filter, schemaPath.concat(["dependencies", key]));
              validate("}");
            }
          });
          if (type !== "object") validate("}");
        }
        if (node.additionalProperties || node.additionalProperties === false) {
          if (type !== "object") validate("if (%s) {", types.object(name));
          var i = genloop();
          var keys = gensym("keys");
          var toCompare = function(p2) {
            return keys + "[" + i + "] !== " + JSON.stringify(p2);
          };
          var toTest = function(p2) {
            return "!" + patterns(p2) + ".test(" + keys + "[" + i + "])";
          };
          var additionalProp = Object.keys(properties || {}).map(toCompare).concat(Object.keys(node.patternProperties || {}).map(toTest)).join(" && ") || "true";
          validate("var %s = Object.keys(%s)", keys, name)("for (var %s = 0; %s < %s.length; %s++) {", i, i, keys, i)("if (%s) {", additionalProp);
          if (node.additionalProperties === false) {
            if (filter) validate("delete %s", name + "[" + keys + "[" + i + "]]");
            error("has additional properties", null, JSON.stringify(name + ".") + " + " + keys + "[" + i + "]");
          } else {
            visit(name + "[" + keys + "[" + i + "]]", node.additionalProperties, reporter2, filter, schemaPath.concat(["additionalProperties"]));
          }
          validate("}")("}");
          if (type !== "object") validate("}");
        }
        if (node.$ref) {
          var sub = get(root, opts && opts.schemas || {}, node.$ref);
          if (sub) {
            var fn = cache[node.$ref];
            if (!fn) {
              cache[node.$ref] = function proxy(data) {
                return fn(data);
              };
              fn = compile(sub, cache, root, false, opts);
            }
            var n = gensym("ref");
            scope[n] = fn;
            validate("if (!(%s(%s))) {", n, name);
            error("referenced schema does not match");
            validate("}");
          }
        }
        if (node.not) {
          var prev = gensym("prev");
          validate("var %s = errors", prev);
          visit(name, node.not, false, filter, schemaPath.concat("not"));
          validate("if (%s === errors) {", prev);
          error("negative schema matches");
          validate("} else {")("errors = %s", prev)("}");
        }
        if (node.items && !tuple) {
          if (type !== "array") validate("if (%s) {", types.array(name));
          var i = genloop();
          validate("for (var %s = 0; %s < %s.length; %s++) {", i, i, name, i);
          visit(name + "[" + i + "]", node.items, reporter2, filter, schemaPath.concat("items"));
          validate("}");
          if (type !== "array") validate("}");
        }
        if (node.patternProperties) {
          if (type !== "object") validate("if (%s) {", types.object(name));
          var keys = gensym("keys");
          var i = genloop();
          validate("var %s = Object.keys(%s)", keys, name)("for (var %s = 0; %s < %s.length; %s++) {", i, i, keys, i);
          Object.keys(node.patternProperties).forEach(function(key) {
            var p2 = patterns(key);
            validate("if (%s.test(%s)) {", p2, keys + "[" + i + "]");
            visit(name + "[" + keys + "[" + i + "]]", node.patternProperties[key], reporter2, filter, schemaPath.concat(["patternProperties", key]));
            validate("}");
          });
          validate("}");
          if (type !== "object") validate("}");
        }
        if (node.pattern) {
          var p = patterns(node.pattern);
          if (type !== "string") validate("if (%s) {", types.string(name));
          validate("if (!(testLimitedRegex(%s, %s, %d))) {", p, name, typeof node.maxLength === "undefined" ? -1 : node.maxLength);
          error("pattern mismatch");
          validate("}");
          if (type !== "string") validate("}");
        }
        if (node.allOf) {
          node.allOf.forEach(function(sch, key) {
            visit(name, sch, reporter2, filter, schemaPath.concat(["allOf", key]));
          });
        }
        if (node.anyOf && node.anyOf.length) {
          var prev = gensym("prev");
          node.anyOf.forEach(function(sch, i2) {
            if (i2 === 0) {
              validate("var %s = errors", prev);
            } else {
              validate("if (errors !== %s) {", prev)("errors = %s", prev);
            }
            visit(name, sch, false, false, schemaPath);
          });
          node.anyOf.forEach(function(sch, i2) {
            if (i2) validate("}");
          });
          validate("if (%s !== errors) {", prev);
          error("no schemas match");
          validate("}");
        }
        if (node.oneOf && node.oneOf.length) {
          var prev = gensym("prev");
          var passes = gensym("passes");
          validate("var %s = errors", prev)("var %s = 0", passes);
          node.oneOf.forEach(function(sch, i2) {
            visit(name, sch, false, false, schemaPath);
            validate("if (%s === errors) {", prev)("%s++", passes)("} else {")("errors = %s", prev)("}");
          });
          validate("if (%s !== 1) {", passes);
          error("no (or more than one) schemas match");
          validate("}");
        }
        if (node.multipleOf !== void 0) {
          if (type !== "number" && type !== "integer") validate("if (%s) {", types.number(name));
          validate("if (!isMultipleOf(%s, %d)) {", name, node.multipleOf);
          error("has a remainder");
          validate("}");
          if (type !== "number" && type !== "integer") validate("}");
        }
        if (node.maxProperties !== void 0) {
          if (type !== "object") validate("if (%s) {", types.object(name));
          validate("if (Object.keys(%s).length > %d) {", name, node.maxProperties);
          error("has more properties than allowed");
          validate("}");
          if (type !== "object") validate("}");
        }
        if (node.minProperties !== void 0) {
          if (type !== "object") validate("if (%s) {", types.object(name));
          validate("if (Object.keys(%s).length < %d) {", name, node.minProperties);
          error("has less properties than allowed");
          validate("}");
          if (type !== "object") validate("}");
        }
        if (node.maxItems !== void 0) {
          if (type !== "array") validate("if (%s) {", types.array(name));
          validate("if (%s.length > %d) {", name, node.maxItems);
          error("has more items than allowed");
          validate("}");
          if (type !== "array") validate("}");
        }
        if (node.minItems !== void 0) {
          if (type !== "array") validate("if (%s) {", types.array(name));
          validate("if (%s.length < %d) {", name, node.minItems);
          error("has less items than allowed");
          validate("}");
          if (type !== "array") validate("}");
        }
        if (node.maxLength !== void 0) {
          if (type !== "string") validate("if (%s) {", types.string(name));
          validate("if (%s.length > %d) {", name, node.maxLength);
          error("has longer length than allowed");
          validate("}");
          if (type !== "string") validate("}");
        }
        if (node.minLength !== void 0) {
          if (type !== "string") validate("if (%s) {", types.string(name));
          validate("if (%s.length < %d) {", name, node.minLength);
          error("has less length than allowed");
          validate("}");
          if (type !== "string") validate("}");
        }
        if (node.minimum !== void 0) {
          if (type !== "number" && type !== "integer") validate("if (%s) {", types.number(name));
          validate("if (%s %s %d) {", name, node.exclusiveMinimum ? "<=" : "<", node.minimum);
          error("is less than minimum");
          validate("}");
          if (type !== "number" && type !== "integer") validate("}");
        }
        if (node.maximum !== void 0) {
          if (type !== "number" && type !== "integer") validate("if (%s) {", types.number(name));
          validate("if (%s %s %d) {", name, node.exclusiveMaximum ? ">=" : ">", node.maximum);
          error("is more than maximum");
          validate("}");
          if (type !== "number" && type !== "integer") validate("}");
        }
        if (properties) {
          Object.keys(properties).forEach(function(p2) {
            if (Array.isArray(type) && type.indexOf("null") !== -1) validate("if (%s !== null) {", name);
            visit(
              genobj(name, p2),
              properties[p2],
              reporter2,
              filter,
              schemaPath.concat(tuple ? p2 : ["properties", p2])
            );
            if (Array.isArray(type) && type.indexOf("null") !== -1) validate("}");
          });
        }
        while (indent--) validate("}");
      };
      var validate = genfun("function validate(data) {")("if (data === undefined) data = null")("validate.errors = null")("var errors = 0");
      visit("data", schema, reporter, opts && opts.filter, []);
      validate("return errors === 0")("}");
      validate = validate.toFunction(scope);
      validate.errors = null;
      if (Object.defineProperty) {
        Object.defineProperty(validate, "error", {
          get: function() {
            if (!validate.errors) return "";
            return validate.errors.map(function(err) {
              return err.field + " " + err.message;
            }).join("\n");
          }
        });
      }
      validate.toJSON = function() {
        return schema;
      };
      return validate;
    };
    module.exports = function(schema, opts) {
      if (typeof schema === "string") schema = JSON.parse(schema);
      return compile(schema, {}, schema, true, opts);
    };
    module.exports.filter = function(schema, opts) {
      var validate = module.exports(schema, xtend(opts, { filter: true }));
      return function(sch) {
        validate(sch);
        return sch;
      };
    };
  }
});

// node_modules/.pnpm/near-abi@0.2.0/node_modules/near-abi/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/near-abi@0.2.0/node_modules/near-abi/lib/index.js"(exports) {
    "use strict";
    var import_dist67 = __toESM(require_dist());
    var import_dist68 = __toESM(require_dist2());
    var import_dist69 = __toESM(require_dist3());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AbiSerializationType = exports.AbiFunctionModifier = exports.AbiFunctionKind = exports.SCHEMA_VERSION = void 0;
    exports.SCHEMA_VERSION = "0.4.0";
    var AbiFunctionKind2;
    (function(AbiFunctionKind3) {
      AbiFunctionKind3["View"] = "view";
      AbiFunctionKind3["Call"] = "call";
    })(AbiFunctionKind2 = exports.AbiFunctionKind || (exports.AbiFunctionKind = {}));
    var AbiFunctionModifier;
    (function(AbiFunctionModifier2) {
      AbiFunctionModifier2["Init"] = "init";
      AbiFunctionModifier2["Private"] = "private";
      AbiFunctionModifier2["Payable"] = "payable";
    })(AbiFunctionModifier = exports.AbiFunctionModifier || (exports.AbiFunctionModifier = {}));
    var AbiSerializationType2;
    (function(AbiSerializationType3) {
      AbiSerializationType3["Json"] = "json";
      AbiSerializationType3["Borsh"] = "borsh";
    })(AbiSerializationType2 = exports.AbiSerializationType || (exports.AbiSerializationType = {}));
  }
});

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/index.js
var import_dist64 = __toESM(require_dist());
var import_dist65 = __toESM(require_dist2());
var import_dist66 = __toESM(require_dist3());

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/account.js
var import_dist34 = __toESM(require_dist(), 1);
var import_dist35 = __toESM(require_dist2(), 1);
var import_dist36 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/connection.js
var import_dist28 = __toESM(require_dist(), 1);
var import_dist29 = __toESM(require_dist2(), 1);
var import_dist30 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+signers@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5.1__1fd95e5151c4314e375250a7eccb2568/node_modules/@near-js/signers/lib/esm/index.js
var import_dist25 = __toESM(require_dist());
var import_dist26 = __toESM(require_dist2());
var import_dist27 = __toESM(require_dist3());

// node_modules/.pnpm/@near-js+signers@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5.1__1fd95e5151c4314e375250a7eccb2568/node_modules/@near-js/signers/lib/esm/key_pair_signer.js
var import_dist4 = __toESM(require_dist(), 1);
var import_dist5 = __toESM(require_dist2(), 1);
var import_dist6 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+signers@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5.1__1fd95e5151c4314e375250a7eccb2568/node_modules/@near-js/signers/lib/esm/signer.js
var import_dist = __toESM(require_dist(), 1);
var import_dist2 = __toESM(require_dist2(), 1);
var import_dist3 = __toESM(require_dist3(), 1);
var Nep413MessageSchema = {
  struct: {
    message: "string",
    nonce: { array: { type: "u8", len: 32 } },
    recipient: "string",
    callbackUrl: { option: "string" }
  }
};
var Signer = class {
};

// node_modules/.pnpm/@near-js+signers@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5.1__1fd95e5151c4314e375250a7eccb2568/node_modules/@near-js/signers/lib/esm/key_pair_signer.js
var KeyPairSigner = class _KeyPairSigner extends Signer {
  constructor(key) {
    super();
    __publicField(this, "key");
    this.key = key;
  }
  static fromSecretKey(encodedKey) {
    const key = KeyPair.fromString(encodedKey);
    return new _KeyPairSigner(key);
  }
  async getPublicKey() {
    return this.key.getPublicKey();
  }
  async signNep413Message(message, accountId, recipient, nonce, callbackUrl) {
    if (nonce.length !== 32)
      throw new Error("Nonce must be exactly 32 bytes long");
    const pk = this.key.getPublicKey();
    const PREFIX = 2147484061;
    const serializedPrefix = serialize("u32", PREFIX);
    const params = {
      message,
      recipient,
      nonce,
      callbackUrl
    };
    const serializedParams = serialize(Nep413MessageSchema, params);
    const serializedMessage = new Uint8Array(
      serializedPrefix.length + serializedParams.length
    );
    serializedMessage.set(serializedPrefix);
    serializedMessage.set(serializedParams, serializedPrefix.length);
    const hash = new Uint8Array(sha256(serializedMessage));
    const { signature } = this.key.sign(hash);
    return {
      accountId,
      publicKey: pk,
      signature
    };
  }
  async signTransaction(transaction) {
    const pk = this.key.getPublicKey();
    if (transaction.publicKey.toString() !== pk.toString())
      throw new Error("The public key doesn't match the signer's key");
    const message = encodeTransaction(transaction);
    const hash = new Uint8Array(sha256(message));
    const { signature } = this.key.sign(hash);
    const signedTx = new SignedTransaction({
      transaction,
      signature: new Signature({
        keyType: transaction.publicKey.ed25519Key ? KeyType.ED25519 : KeyType.SECP256K1,
        data: signature
      })
    });
    return [hash, signedTx];
  }
  async signDelegateAction(delegateAction) {
    const pk = this.key.getPublicKey();
    if (delegateAction.publicKey.toString() !== pk.toString())
      throw new Error("The public key doesn't match the signer's key");
    const message = encodeDelegateAction(delegateAction);
    const hash = new Uint8Array(sha256(message));
    const { signature } = this.key.sign(hash);
    const signedDelegate = new SignedDelegate({
      delegateAction,
      signature: new Signature({
        keyType: pk.keyType,
        data: signature
      })
    });
    return [hash, signedDelegate];
  }
};

// node_modules/.pnpm/@near-js+signers@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5.1__1fd95e5151c4314e375250a7eccb2568/node_modules/@near-js/signers/lib/esm/in_memory_signer.js
var import_dist22 = __toESM(require_dist(), 1);
var import_dist23 = __toESM(require_dist2(), 1);
var import_dist24 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+keystores@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._fad1cde187967593bd49f528b484ba10/node_modules/@near-js/keystores/lib/esm/index.js
var import_dist19 = __toESM(require_dist());
var import_dist20 = __toESM(require_dist2());
var import_dist21 = __toESM(require_dist3());

// node_modules/.pnpm/@near-js+keystores@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._fad1cde187967593bd49f528b484ba10/node_modules/@near-js/keystores/lib/esm/in_memory_key_store.js
var import_dist10 = __toESM(require_dist(), 1);
var import_dist11 = __toESM(require_dist2(), 1);
var import_dist12 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+keystores@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._fad1cde187967593bd49f528b484ba10/node_modules/@near-js/keystores/lib/esm/keystore.js
var import_dist7 = __toESM(require_dist(), 1);
var import_dist8 = __toESM(require_dist2(), 1);
var import_dist9 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+keystores@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._fad1cde187967593bd49f528b484ba10/node_modules/@near-js/keystores/lib/esm/merge_key_store.js
var import_dist13 = __toESM(require_dist(), 1);
var import_dist14 = __toESM(require_dist2(), 1);
var import_dist15 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+keystores@2.5.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._fad1cde187967593bd49f528b484ba10/node_modules/@near-js/keystores/lib/esm/multi_contract_keystore.js
var import_dist16 = __toESM(require_dist(), 1);
var import_dist17 = __toESM(require_dist2(), 1);
var import_dist18 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/connection.js
var import_depd = __toESM(require_browser(), 1);
function getProvider(config) {
  switch (config.type) {
    case void 0:
      return config;
    case "JsonRpcProvider":
      return new JsonRpcProvider({ ...config.args });
    case "FailoverRpcProvider": {
      const providers = ((config == null ? void 0 : config.args) || []).map(
        (arg) => new JsonRpcProvider(arg)
      );
      return new FailoverRpcProvider(providers);
    }
    default:
      throw new Error(`Unknown provider type ${config.type}`);
  }
}
function getSigner(config) {
  switch (config.type) {
    case void 0:
      return config;
    case "KeyPairSigner": {
      return new KeyPairSigner(config.keyPair);
    }
    default:
      throw new Error(`Unknown signer type ${config.type}`);
  }
}
var Connection = class _Connection {
  constructor(networkId, provider, signer) {
    __publicField(this, "networkId");
    __publicField(this, "provider");
    __publicField(this, "signer");
    const deprecate = (0, import_depd.default)("new Connection(networkId, provider, signer)");
    deprecate("`Connection` is no longer used anywhere, please switch to constructing `Account` without it - use `new Account(accountId, provider, signer)`");
    this.networkId = networkId;
    this.provider = provider;
    this.signer = signer;
  }
  getConnection() {
    return this;
  }
  /**
   * @param config Contains connection info details
   */
  static fromConfig(config) {
    const provider = getProvider(config.provider);
    const signer = getSigner(config.signer);
    return new _Connection(
      config.networkId,
      provider,
      signer
    );
  }
};

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/utils.js
var import_dist31 = __toESM(require_dist(), 1);
var import_dist32 = __toESM(require_dist2(), 1);
var import_dist33 = __toESM(require_dist3(), 1);
var import_depd2 = __toESM(require_browser(), 1);
function parseJsonFromRawResponse(response) {
  return JSON.parse(Buffer.from(response).toString());
}
function bytesJsonStringify(input) {
  return Buffer.from(JSON.stringify(input));
}
function validateArgs(args) {
  const isUint8Array2 = args.byteLength !== void 0 && args.byteLength === args.length;
  if (isUint8Array2) {
    return;
  }
  if (Array.isArray(args) || typeof args !== "object") {
    throw new PositionalArgsError();
  }
}
async function viewState(connection, accountId, prefix, blockQuery = { finality: "optimistic" }) {
  const deprecate = (0, import_depd2.default)("viewState()");
  deprecate("It will be removed in the next major release");
  const { values } = await connection.provider.query({
    request_type: "view_state",
    ...blockQuery,
    account_id: accountId,
    prefix_base64: Buffer.from(prefix).toString("base64")
  });
  return values.map(({ key, value }) => ({
    key: Buffer.from(key, "base64"),
    value: Buffer.from(value, "base64")
  }));
}
async function viewFunction(connection, {
  contractId,
  methodName,
  args = {},
  parse = parseJsonFromRawResponse,
  stringify = bytesJsonStringify,
  blockQuery = { finality: "optimistic" }
}) {
  const deprecate = (0, import_depd2.default)("viewFunction()");
  deprecate("It will be removed in the next major release");
  validateArgs(args);
  const encodedArgs = stringify(args);
  const result = await connection.provider.query({
    request_type: "call_function",
    ...blockQuery,
    account_id: contractId,
    method_name: methodName,
    args_base64: encodedArgs.toString("base64")
  });
  if (result.logs) {
    printTxOutcomeLogs({ contractId, logs: result.logs });
  }
  return result.result && result.result.length > 0 && parse(Buffer.from(result.result));
}

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/account.js
var import_depd3 = __toESM(require_browser(), 1);
var {
  addKey,
  createAccount,
  deleteAccount,
  deleteKey,
  deployContract,
  deployGlobalContract,
  fullAccessKey,
  functionCall,
  functionCallAccessKey,
  transfer,
  useGlobalContract
} = actionCreators;
var DEFAULT_FINALITY = "optimistic";
var DEFAULT_WAIT_STATUS = "EXECUTED_OPTIMISTIC";
var Account = class _Account {
  constructor(accountId, provider, signer) {
    __publicField(this, "accountId");
    __publicField(this, "provider");
    __publicField(this, "signer");
    /** @hidden */
    __publicField(this, "accessKeyByPublicKeyCache", {});
    this.accountId = accountId;
    this.provider = provider;
    this.signer = signer;
  }
  /**
   * Allows to set the signer used to control the account
   *
   * @param signer holds the private key and can sign Transactions
   */
  setSigner(signer) {
    this.signer = signer;
  }
  getSigner() {
    return this.signer;
  }
  /**
   * Returns an overview of the account's state, including the account's
   * balance, storage usage, and code hash
   */
  async getState() {
    const protocolConfig = await this.provider.experimental_protocolConfig({
      finality: DEFAULT_FINALITY
    });
    const state = await this.provider.viewAccount(this.accountId, {
      finality: DEFAULT_FINALITY
    });
    const costPerByte = BigInt(
      protocolConfig.runtime_config.storage_amount_per_byte
    );
    const usedOnStorage = BigInt(state.storage_usage) * costPerByte;
    const locked = BigInt(state.locked);
    const total = BigInt(state.amount) + locked;
    const available = total - (locked > usedOnStorage ? locked : usedOnStorage);
    return {
      balance: {
        total,
        usedOnStorage,
        locked,
        available
      },
      storageUsage: state.storage_usage,
      codeHash: state.code_hash
    };
  }
  /**
   * Calls {@link Provider.viewAccessKey} to retrieve information for a
   * specific key in the account
   */
  async getAccessKey(publicKey) {
    return this.provider.viewAccessKey(this.accountId, publicKey, {
      finality: DEFAULT_FINALITY
    });
  }
  /**
   * Calls {@link Provider.viewAccessKeyList} to retrieve the account's keys
   */
  async getAccessKeyList() {
    return this.provider.viewAccessKeyList(this.accountId, {
      finality: DEFAULT_FINALITY
    });
  }
  /**
   * Calls {@link Provider.viewContractCode} to retrieve the account's
   * contract code and its hash
   */
  async getContractCode() {
    return this.provider.viewContractCode(this.accountId, {
      finality: DEFAULT_FINALITY
    });
  }
  /**
   * Calls {@link Provider.viewContractState} to retrieve the keys and values
   * stored on the account's contract
   */
  async getContractState(prefix) {
    return this.provider.viewContractState(this.accountId, prefix, {
      finality: DEFAULT_FINALITY
    });
  }
  /**
   * Create a transaction that can be later signed with a {@link Signer}
   *
   * @param receiverId Account against which to perform the actions
   * @param actions Actions to perform
   * @param publicKey The public part of the key that will be used to sign the transaction
   */
  async createTransaction(receiverId, actions, publicKey) {
    if (!publicKey) throw new Error("Please provide a public key");
    const pk = PublicKey.from(publicKey);
    const accessKey = await this.getAccessKey(pk);
    const block = await this.provider.viewBlock({
      finality: DEFAULT_FINALITY
    });
    const recentBlockHash = block.header.hash;
    const nonce = BigInt(accessKey.nonce) + 1n;
    return createTransaction(
      this.accountId,
      pk,
      receiverId,
      nonce + 1n,
      actions,
      baseDecode(recentBlockHash)
    );
  }
  /**
   * Create a signed transaction ready to be broadcast by a {@link Provider}
   */
  async createSignedTransaction(receiverId, actions) {
    if (!this.signer) throw new Error("Please set a signer");
    const tx = await this.createTransaction(
      receiverId,
      actions,
      await this.signer.getPublicKey()
    );
    const [, signedTx] = await this.signer.signTransaction(tx);
    return signedTx;
  }
  /**
   * Create a meta transaction ready to be signed by a {@link Signer}
   *
   * @param receiverId NEAR account receiving the transaction
   * @param actions list of actions to perform as part of the meta transaction
   * @param blockHeightTtl number of blocks after which a meta transaction will expire if not processed
   */
  async createMetaTransaction(receiverId, actions, blockHeightTtl = 200, publicKey) {
    if (!publicKey) throw new Error(`Please provide a public key`);
    const pk = PublicKey.from(publicKey);
    const accessKey = await this.getAccessKey(pk);
    const nonce = BigInt(accessKey.nonce) + 1n;
    const { header } = await this.provider.viewBlock({
      finality: DEFAULT_FINALITY
    });
    const maxBlockHeight = BigInt(header.height) + BigInt(blockHeightTtl);
    return buildDelegateAction({
      receiverId,
      senderId: this.accountId,
      actions,
      publicKey: pk,
      nonce,
      maxBlockHeight
    });
  }
  /**
   * Create a signed MetaTransaction that can be broadcasted to a relayer
   *
   * @param receiverId NEAR account receiving the transaction
   * @param actions list of actions to perform as part of the meta transaction
   * @param blockHeightTtl number of blocks after which a meta transaction will expire if not processed
   */
  async createSignedMetaTransaction(receiverId, actions, blockHeightTtl = 200) {
    if (!this.signer) throw new Error(`Please set a signer`);
    const delegateAction = await this.createMetaTransaction(
      receiverId,
      actions,
      blockHeightTtl,
      await this.signer.getPublicKey()
    );
    return this.signer.signDelegateAction(delegateAction);
  }
  /**
   * Creates a transaction, signs it and broadcast it to the network
   *
   * @param receiverId The NEAR account ID of the transaction receiver.
   * @param actions The list of actions to be performed in the transaction.
   * @param throwOnFailure Whether to throw an error if the transaction fails.
   * @returns {Promise<FinalExecutionOutcome>} A promise that resolves to the final execution outcome of the transaction.
   *
   */
  async signAndSendTransaction({
    receiverId,
    actions,
    waitUntil = DEFAULT_WAIT_STATUS,
    throwOnFailure = true
  }) {
    const signedTx = await this.createSignedTransaction(
      receiverId,
      actions
    );
    const result = await this.provider.sendTransactionUntil(
      signedTx,
      waitUntil
    );
    if (throwOnFailure && typeof result.status === "object" && typeof result.status.Failure === "object" && result.status.Failure !== null) {
      throw parseResultError(result);
    }
    return result;
  }
  async signAndSendTransactions({
    transactions,
    waitUntil = DEFAULT_WAIT_STATUS,
    throwOnFailure = true
  }) {
    if (!this.signer) throw new Error("Please set a signer");
    const results = await Promise.all(
      transactions.map(async ({ receiverId, actions }) => {
        return this.signAndSendTransaction({
          receiverId,
          actions,
          waitUntil,
          throwOnFailure
        });
      })
    );
    return results;
  }
  /**
   * Creates a new NEAR account with a given ID and public key.
   * 
   * This method can create two types of accounts:
   * 
   * 1. Top-level accounts of the form `name.tla` (e.g., `bob.near`):
   * 
   * 2. Sub-accounts of the current account (e.g., `sub.ana.near`):
   *    - The new account ID must end with the current account ID
   *    - Example: If your account is `ana.near`, you can create `sub.ana.near`
   *
   * @param newAccountId the new account to create (e.g. bob.near or sub.ana.near)
   * @param publicKey the public part of the key that will control the account
   * @param nearToTransfer how much NEAR to transfer to the account in yoctoNEAR (default: 0)
   *
   */
  async createAccount(newAccountId, publicKey, nearToTransfer = "0") {
    if (newAccountId.endsWith(this.accountId)) {
      return this.createSubAccount(
        newAccountId,
        publicKey,
        nearToTransfer
      );
    }
    const splitted = newAccountId.split(".");
    if (splitted.length != 2) {
      throw new Error(
        "newAccountId needs to be of the form <string>.<tla>"
      );
    }
    const TLA = splitted[1];
    return this.signAndSendTransaction({
      receiverId: TLA,
      actions: [
        functionCall(
          "create_account",
          {
            new_account_id: newAccountId,
            new_public_key: publicKey.toString()
          },
          BigInt("60000000000000"),
          BigInt(nearToTransfer)
        )
      ]
    });
  }
  /**
   * Creates a sub account of this account. For example, if the account is
   * ana.near, you can create sub.ana.near.
   *
   * @param accountOrPrefix a prefix (e.g. `sub`) or the full sub-account (`sub.ana.near`)
   * @param publicKey the public part of the key that will control the account
   * @param nearToTransfer how much NEAR to transfer to the account (default: 0)
   *
   */
  async createSubAccount(accountOrPrefix, publicKey, nearToTransfer = "0") {
    if (!this.signer) throw new Error("Please set a signer");
    const newAccountId = accountOrPrefix.includes(".") ? accountOrPrefix : `${accountOrPrefix}.${this.accountId}`;
    if (newAccountId.length > 64) {
      throw new Error(`Accounts cannot exceed 64 characters`);
    }
    if (!newAccountId.endsWith(this.accountId)) {
      throw new Error(`New account must end up with ${this.accountId}`);
    }
    const actions = [
      createAccount(),
      transfer(BigInt(nearToTransfer)),
      addKey(PublicKey.from(publicKey), fullAccessKey())
    ];
    return this.signAndSendTransaction({
      receiverId: newAccountId,
      actions
    });
  }
  /**
   * Deletes the account, transferring all remaining NEAR to a beneficiary
   * account
   *
   * Important: Deleting an account does not transfer FTs or NFTs
   *
   * @param beneficiaryId Will receive the account's remaining balance
   */
  async deleteAccount(beneficiaryId) {
    return this.signAndSendTransaction({
      receiverId: this.accountId,
      actions: [deleteAccount(beneficiaryId)]
    });
  }
  /**
   * Deploy a smart contract in the account
   *
   * @param code The compiled contract code bytes
   */
  async deployContract(code) {
    return this.signAndSendTransaction({
      receiverId: this.accountId,
      actions: [deployContract(code)]
    });
  }
  /**
   * Deploy a global contract that can be reused by multiple accounts
   *
   * @param code The compiled contract code bytes
   * @param deployMode Deploy mode - "codeHash" for immutable contracts, "accountId" for updateable contracts
   */
  async deployGlobalContract(code, deployMode) {
    const mode = deployMode === "codeHash" ? new GlobalContractDeployMode({ CodeHash: null }) : new GlobalContractDeployMode({ AccountId: null });
    return this.signAndSendTransaction({
      receiverId: this.accountId,
      actions: [deployGlobalContract(code, mode)]
    });
  }
  /**
   * Use a previously deployed global contract on this account
   *
   * @param contractIdentifier The global contract identifier - either { accountId: string } or { codeHash: string | Uint8Array }
   */
  async useGlobalContract(contractIdentifier) {
    const identifier = "accountId" in contractIdentifier ? new GlobalContractIdentifier({ AccountId: contractIdentifier.accountId }) : new GlobalContractIdentifier({
      CodeHash: typeof contractIdentifier.codeHash === "string" ? Buffer.from(contractIdentifier.codeHash, "hex") : contractIdentifier.codeHash
    });
    return this.signAndSendTransaction({
      receiverId: this.accountId,
      actions: [useGlobalContract(identifier)]
    });
  }
  /**
   *
   * @param options
   * @param options.publicKey The key to add to the account
   * @param options.contractId The contract that this key can call
   * @param options.methodNames The methods this key is allowed to call
   * @param options.allowance The amount of NEAR this key can expend in gas
   * @returns
   */
  async addFunctionCallAccessKey({
    publicKey,
    contractId,
    methodNames = [],
    allowance = NEAR.toUnits("0.25")
  }) {
    return this.signAndSendTransaction({
      receiverId: this.accountId,
      actions: [
        addKey(
          PublicKey.from(publicKey),
          functionCallAccessKey(
            contractId,
            methodNames,
            BigInt(allowance)
          )
        )
      ]
    });
  }
  /**
   * Add a full access key to the account
   *
   * @param publicKey The public key to be added
   * @returns {Promise<FinalExecutionOutcome>}
   */
  async addFullAccessKey(publicKey) {
    return this.signAndSendTransaction({
      receiverId: this.accountId,
      actions: [addKey(PublicKey.from(publicKey), fullAccessKey())]
    });
  }
  /**
   * @param publicKey The public key to be deleted
   * @returns {Promise<FinalExecutionOutcome>}
   */
  async deleteKey(publicKey) {
    return this.signAndSendTransaction({
      receiverId: this.accountId,
      actions: [deleteKey(PublicKey.from(publicKey))]
    });
  }
  /**
   * Call a function on a smart contract and return parsed transaction result
   *
   * @param options
   * @param options.contractId The contract in which to call the function
   * @param options.methodName The method that will be called
   * @param options.args Arguments, either as a valid JSON Object or a raw Uint8Array
   * @param options.deposit (optional) Amount of NEAR Tokens to attach to the call (default 0)
   * @param options.gas (optional) Amount of GAS to use attach to the call (default 30TGas)
   * @param options.waitUntil (optional) Transaction finality to wait for (default INCLUDED_FINAL)
   * @returns
   */
  async callFunction(params) {
    const outcome = await this.callFunctionRaw(params);
    return getTransactionLastResult(outcome);
  }
  /**
   * Call a function on a smart contract and return raw transaction outcome
   *
   * @param options
   * @param options.contractId The contract in which to call the function
   * @param options.methodName The method that will be called
   * @param options.args Arguments, either as a valid JSON Object or a raw Uint8Array
   * @param options.deposit (optional) Amount of NEAR Tokens to attach to the call (default 0)
   * @param options.gas (optional) Amount of GAS to use attach to the call (default 30TGas)
   * @param options.waitUntil (optional) Transaction finality to wait for (default INCLUDED_FINAL)
   * @returns {FinalExecutionOutcome}
   */
  async callFunctionRaw({
    contractId,
    methodName,
    args = {},
    deposit = "0",
    gas = DEFAULT_FUNCTION_CALL_GAS,
    waitUntil = DEFAULT_WAIT_STATUS
  }) {
    return await this.signAndSendTransaction({
      receiverId: contractId,
      actions: [
        functionCall(methodName, args, BigInt(gas), BigInt(deposit))
      ],
      waitUntil
    });
  }
  /**
   * This function simply calls the `signNep413Message` method of the Signer
   *
   * @param options
   * @param options.message The message to be signed (e.g. "authenticating")
   * @param options.recipient Who will receive the message (e.g. auth.app.com)
   * @param options.nonce A challenge sent by the recipient
   * @param options.callbackUrl (optional) Deprecated parameter used only by browser wallets
   * @returns
   */
  async signNep413Message({
    message,
    recipient,
    nonce,
    callbackUrl
  }) {
    if (!this.signer) throw new Error("Please set a signer");
    return this.signer.signNep413Message(
      message,
      this.accountId,
      recipient,
      nonce,
      callbackUrl
    );
  }
  /**
   *
   * @param token The token to check the balance of. Defaults to Native NEAR.
   * @returns The available balance of the account in units (e.g. yoctoNEAR).
   */
  async getBalance(token = NEAR) {
    return token.getBalance(this);
  }
  /**
   * Transfers a token to the specified receiver.
   *
   * Supports sending either the native NEAR token or any supported Fungible Token (FT).
   *
   * @param amount - The amount of tokens to transfer in units (e.g. yoctoNEAR).
   * @param receiverId - The NEAR account ID of the receiver.
   * @param token - The token to transfer. Defaults to Native NEAR.
   *
   */
  async transfer({
    receiverId,
    amount,
    token = NEAR
  }) {
    return token.transfer({ from: this, receiverId, amount });
  }
  // DEPRECATED FUNCTIONS BELLOW - Please remove in next release
  /**
   * @deprecated Will be removed in the next major release, please use {@link Account.createSignedMetaTransaction} instead
   *
   * Compose and sign a SignedDelegate action to be executed in a transaction on behalf of this Account instance
   *
   * @param options Options for the transaction.
   * @param options.actions Actions to be included in the meta transaction
   * @param options.blockHeightTtl Number of blocks past the current block height for which the SignedDelegate action may be included in a meta transaction
   * @param options.receiverId Receiver account of the meta transaction
   */
  async signedDelegate({
    actions,
    blockHeightTtl,
    receiverId
  }) {
    const deprecate = (0, import_depd3.default)("Account.signedDelegate()");
    deprecate("It will be removed in the next major release, please switch to Account.createSignedMetaTransaction()");
    const { header } = await this.provider.viewBlock({
      finality: DEFAULT_FINALITY
    });
    if (!this.signer) throw new Error(`Please set a signer`);
    const pk = await this.signer.getPublicKey();
    const accessKey = await this.getAccessKey(pk);
    const delegateAction = buildDelegateAction({
      actions,
      maxBlockHeight: BigInt(header.height) + BigInt(blockHeightTtl),
      nonce: BigInt(accessKey.nonce) + 1n,
      publicKey: pk,
      receiverId,
      senderId: this.accountId
    });
    const [, signedDelegate] = await this.signer.signDelegateAction(
      delegateAction
    );
    return signedDelegate;
  }
  /**
   * @deprecated Will be removed in the next major release, accounts no longer use Connections since it's deprecated too
   */
  getConnection() {
    return new Connection("", this.provider, this.signer);
  }
  /** @hidden */
  validateArgs(args) {
    const isUint8Array2 = args.byteLength !== void 0 && args.byteLength === args.length;
    if (isUint8Array2) {
      return;
    }
    if (Array.isArray(args) || typeof args !== "object") {
      throw new PositionalArgsError();
    }
  }
  /**
   * @deprecated Will be removed in the next major release, please use {@link Account.callFunction} instead
   *
   * Execute a function call.
   * @param options The options for the function call.
   * @param options.contractId The NEAR account ID of the smart contract.
   * @param options.methodName The name of the method to be called on the smart contract.
   * @param options.args The arguments to be passed to the method.
   * @param options.gas The maximum amount of gas to be used for the function call.
   * @param options.attachedDeposit The amount of NEAR tokens to be attached to the function call.
   * @param options.walletMeta Metadata for wallet integration.
   * @param options.walletCallbackUrl The callback URL for wallet integration.
   * @param options.stringify A function to convert input arguments into bytes array
   * @returns {Promise<FinalExecutionOutcome>} A promise that resolves to the final execution outcome of the function call.
   */
  async functionCall({
    contractId,
    methodName,
    args = {},
    gas = DEFAULT_FUNCTION_CALL_GAS,
    attachedDeposit,
    walletMeta,
    walletCallbackUrl,
    stringify
  }) {
    const deprecate = (0, import_depd3.default)("Account.functionCall()");
    deprecate("It will be removed in the next major release, please switch to Account.callFunction()");
    this.validateArgs(args);
    const stringifyArg = stringify === void 0 ? stringifyJsonOrBytes : stringify;
    const functionCallArgs = [
      methodName,
      args,
      gas,
      attachedDeposit,
      stringifyArg,
      false
    ];
    return this.signAndSendTransactionLegacy({
      receiverId: contractId,
      // eslint-disable-next-line prefer-spread
      actions: [functionCall.apply(void 0, functionCallArgs)],
      walletMeta,
      walletCallbackUrl
    });
  }
  /**
   * @deprecated Will be removed in the next major release, use instead {@link Provider.viewTransactionStatus}
   */
  async getTransactionStatus(txHash) {
    const deprecate = (0, import_depd3.default)("Account.getTransactionStatus()");
    deprecate("It will be removed in the next major release, please switch to Provider.viewTransactionStatus()");
    return this.provider.viewTransactionStatus(
      txHash,
      this.accountId,
      // accountId is used to determine on which shard to look for a tx
      "EXECUTED_OPTIMISTIC"
    );
  }
  /**
   * @deprecated Will be removed in the next major release, use ${@link Account.createSignedTransaction}
   * Create a signed transaction which can be broadcast to the network
   * @param receiverId NEAR account receiving the transaction
   * @param actions list of actions to perform as part of the transaction
   * @see {@link "@near-js/providers".json-rpc-provider.JsonRpcProvider.sendTransaction | JsonRpcProvider.sendTransaction}
   */
  async signTransaction(receiverId, actions, opts) {
    const deprecate = (0, import_depd3.default)("Account.signTransaction()");
    deprecate("It will be removed in the next major release, please switch to Account.createSignedTransaction()");
    const signer = (opts == null ? void 0 : opts.signer) || this.signer;
    if (!signer) throw new Error(`Please set a signer`);
    const pk = await signer.getPublicKey();
    const accessKey = await this.getAccessKey(pk);
    const block = await this.provider.viewBlock({
      finality: DEFAULT_FINALITY
    });
    const recentBlockHash = block.header.hash;
    const nonce = BigInt(accessKey.nonce) + 1n;
    const tx = createTransaction(
      this.accountId,
      pk,
      receiverId,
      nonce + 1n,
      actions,
      baseDecode(recentBlockHash)
    );
    return signer.signTransaction(tx);
  }
  /**
   * @deprecated Will be removed in the next major release, 
   * instead please create a transaction with
   * the actions bellow and broadcast it to the network
   * 1. createAccount
   * 2. transfer some tokens
   * 3. deployContract
   * 4. (optional) addKey
   * 5. (optional) functionCall to an initialization function
   *
   * Create a new account and deploy a contract to it
   * @param contractId NEAR account where the contract is deployed
   * @param publicKey The public key to add to the created contract account
   * @param data The compiled contract code
   * @param amount of NEAR to transfer to the created contract account. Transfer enough to pay for storage https://docs.near.org/docs/concepts/storage-staking
   */
  async createAndDeployContract(contractId, publicKey, data, amount) {
    const deprecate = (0, import_depd3.default)("Account.createAndDeployContract()");
    deprecate("It will be removed in the next major release");
    const accessKey = fullAccessKey();
    await this.signAndSendTransactionLegacy({
      receiverId: contractId,
      actions: [
        createAccount(),
        transfer(amount),
        addKey(PublicKey.from(publicKey), accessKey),
        deployContract(data)
      ]
    });
    return new _Account(contractId, this.provider);
  }
  /**
   * @deprecated Will be removed in the next major release, please instead use {@link Account.transfer}
   *
   * @param receiverId NEAR account receiving Ⓝ
   * @param amount Amount to send in yoctoⓃ
   */
  async sendMoney(receiverId, amount) {
    const deprecate = (0, import_depd3.default)("Account.sendMoney()");
    deprecate("It will be removed in the next major release, please switch to Account.transfer()");
    return this.signAndSendTransactionLegacy({
      receiverId,
      actions: [transfer(amount)]
    });
  }
  /**
   * @deprecated Will be removed in the next major release, please instead use {@link Account.signAndSendTransaction}
   *
   * Sign a transaction to perform a list of actions and broadcast it using the RPC API.
   * @see {@link "@near-js/providers".json-rpc-provider.JsonRpcProvider | JsonRpcProvider }
   *
   * @param options The options for signing and sending the transaction.
   * @param options.receiverId The NEAR account ID of the transaction receiver.
   * @param options.actions The list of actions to be performed in the transaction.
   * @param options.returnError Whether to return an error if the transaction fails.
   * @returns {Promise<FinalExecutionOutcome>} A promise that resolves to the final execution outcome of the transaction.
   *
   */
  async signAndSendTransactionLegacy({ receiverId, actions, returnError }, opts) {
    const deprecate = (0, import_depd3.default)("Account.signAndSendTransactionLegacy()");
    deprecate("It will be removed in the next major release, please switch to Account.signAndSendTransaction()");
    let txHash, signedTx;
    const TX_NONCE_RETRY_NUMBER = 12;
    const TX_NONCE_RETRY_WAIT = 500;
    const TX_NONCE_RETRY_WAIT_BACKOFF = 1.5;
    const result = await exponentialBackoff(
      TX_NONCE_RETRY_WAIT,
      TX_NONCE_RETRY_NUMBER,
      TX_NONCE_RETRY_WAIT_BACKOFF,
      async () => {
        [txHash, signedTx] = await this.signTransaction(
          receiverId,
          actions,
          opts
        );
        try {
          return await this.provider.sendTransaction(signedTx);
        } catch (error) {
          if (error.type === "InvalidNonce") {
            Logger.warn(
              `Retrying transaction ${receiverId}:${baseEncode(
                txHash
              )} with new nonce.`
            );
            return null;
          }
          if (error.type === "Expired") {
            Logger.warn(
              `Retrying transaction ${receiverId}:${baseEncode(
                txHash
              )} due to expired block hash`
            );
            return null;
          }
          error.context = new ErrorContext(baseEncode(txHash));
          throw error;
        }
      }
    );
    if (!result) {
      throw new TypedError(
        "nonce retries exceeded for transaction. This usually means there are too many parallel requests with the same access key.",
        "RetriesExceeded"
      );
    }
    printTxOutcomeLogsAndFailures({
      contractId: signedTx.transaction.receiverId,
      outcome: result
    });
    if (!returnError && typeof result.status === "object" && typeof result.status.Failure === "object" && result.status.Failure !== null) {
      if (result.status.Failure.error_message && result.status.Failure.error_type) {
        throw new TypedError(
          `Transaction ${result.transaction_outcome.id} failed. ${result.status.Failure.error_message}`,
          result.status.Failure.error_type
        );
      } else {
        throw parseResultError(result);
      }
    }
    return result;
  }
  /**
   * @deprecated Will be removed in the next major release, accounts will no longer handle keystores
   *
   * Finds the {@link AccessKeyView} associated with the accounts {@link PublicKey} stored in the {@link "@near-js/keystores".keystore.KeyStore | Keystore}.
   *
   * @param receiverId currently unused
   * @param actions currently unused
   * @returns `{ publicKey PublicKey; accessKey: AccessKeyView }`
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findAccessKey(receiverId, actions) {
    const deprecate = (0, import_depd3.default)("Account.findAccessKey()");
    deprecate("It will be removed in the next major release");
    if (!this.signer) throw new Error(`Please set a signer`);
    const publicKey = await this.signer.getPublicKey();
    if (!publicKey) {
      throw new TypedError(
        `no matching key pair found in ${this.signer.constructor.name}`,
        "PublicKeyNotFound"
      );
    }
    const cachedAccessKey = this.accessKeyByPublicKeyCache[publicKey.toString()];
    if (cachedAccessKey !== void 0) {
      return { publicKey, accessKey: cachedAccessKey };
    }
    try {
      const rawAccessKey = await this.provider.query({
        request_type: "view_access_key",
        account_id: this.accountId,
        public_key: publicKey.toString(),
        finality: DEFAULT_FINALITY
      });
      const accessKey = {
        ...rawAccessKey,
        nonce: BigInt(rawAccessKey.nonce || 0)
      };
      if (this.accessKeyByPublicKeyCache[publicKey.toString()]) {
        return {
          publicKey,
          accessKey: this.accessKeyByPublicKeyCache[publicKey.toString()]
        };
      }
      this.accessKeyByPublicKeyCache[publicKey.toString()] = accessKey;
      return { publicKey, accessKey };
    } catch (e) {
      if (e.type == "AccessKeyDoesNotExist") {
        return null;
      }
      throw e;
    }
  }
  /**
   * @deprecated Will be removed in the next major release, please use {@link Account.addFullAccessKey} or {@link Account.addFunctionAccessKey}
   *
   * @see [https://docs.near.org/concepts/basics/accounts/access-keys](https://docs.near.org/concepts/basics/accounts/access-keys)
   * @todo expand this API to support more options.
   * @param publicKey A public key to be associated with the contract
   * @param contractId NEAR account where the contract is deployed
   * @param methodNames The method names on the contract that should be allowed to be called. Pass null for no method names and '' or [] for any method names.
   * @param amount Payment in yoctoⓃ that is sent to the contract during this function call
   */
  async addKey(publicKey, contractId, methodNames, amount) {
    const deprecate = (0, import_depd3.default)("Account.addKey()");
    deprecate("It will be removed in the next major release, please switch to either Account.addFullAccessKey(), or Account.addFunctionAccessKey()");
    if (!methodNames) {
      methodNames = [];
    }
    if (!Array.isArray(methodNames)) {
      methodNames = [methodNames];
    }
    let accessKey;
    if (!contractId) {
      accessKey = fullAccessKey();
    } else {
      accessKey = functionCallAccessKey(contractId, methodNames, amount);
    }
    return this.signAndSendTransactionLegacy({
      receiverId: this.accountId,
      actions: [addKey(PublicKey.from(publicKey), accessKey)]
    });
  }
  /**
   * @deprecated Will be removed in the next major release, please use {@link Provider.callFunction} instead
   *
   * Invoke a contract view function using the RPC API.
   * @see [https://docs.near.org/api/rpc/contracts#call-a-contract-function](https://docs.near.org/api/rpc/contracts#call-a-contract-function)
   *
   * @param options Function call options.
   * @param options.contractId NEAR account where the contract is deployed
   * @param options.methodName The view-only method (no state mutations) name on the contract as it is written in the contract code
   * @param options.args Any arguments to the view contract method, wrapped in JSON
   * @param options.parse Parse the result of the call. Receives a Buffer (bytes array) and converts it to any object. By default result will be treated as json.
   * @param options.stringify Convert input arguments into a bytes array. By default the input is treated as a JSON.
   * @param options.blockQuery specifies which block to query state at. By default returns last DEFAULT_FINALITY block (i.e. not necessarily finalized).
   * @returns {Promise<any>}
   */
  async viewFunction(options) {
    const deprecate = (0, import_depd3.default)("Account.viewFunction()");
    deprecate("It will be removed in the next major release, please switch to either Provider.callFunction()");
    return await viewFunction(this.getConnection(), options);
  }
  /**
   * @deprecated Will be removed in the next major release, please use {@link Account.getContractState} instead
   *
   * Returns the state (key value pairs) of this account's contract based on the key prefix.
   * Pass an empty string for prefix if you would like to return the entire state.
   * @see [https://docs.near.org/api/rpc/contracts#view-contract-state](https://docs.near.org/api/rpc/contracts#view-contract-state)
   *
   * @param prefix allows to filter which keys should be returned. Empty prefix means all keys. String prefix is utf-8 encoded.
   * @param blockQuery specifies which block to query state at. By default returns last DEFAULT_FINALITY block (i.e. not necessarily finalized).
   */
  async viewState(prefix, blockQuery = { finality: DEFAULT_FINALITY }) {
    const deprecate = (0, import_depd3.default)("Account.viewState()");
    deprecate("It will be removed in the next major release, please switch to either Account.getContractState()");
    return await viewState(
      this.getConnection(),
      this.accountId,
      prefix,
      blockQuery
    );
  }
  /**
   * @deprecated Will be removed in the next major release, please use {@link Account.getAccessKeyList} instead
   *
   * Get all access keys for the account
   * @see [https://docs.near.org/api/rpc/access-keys#view-access-key-list](https://docs.near.org/api/rpc/access-keys#view-access-key-list)
   *
   */
  async getAccessKeys() {
    var _a;
    const deprecate = (0, import_depd3.default)("Account.getAccessKeys()");
    deprecate("It will be removed in the next major release, please switch to either Account.getAccessKeyList()");
    const response = await this.provider.query({
      request_type: "view_access_key_list",
      account_id: this.accountId,
      finality: DEFAULT_FINALITY
    });
    return (_a = response == null ? void 0 : response.keys) == null ? void 0 : _a.map((key) => ({
      ...key,
      access_key: {
        ...key.access_key,
        nonce: BigInt(key.access_key.nonce)
      }
    }));
  }
  /**
   * @deprecated
   *
   * Returns a list of authorized apps
   * @todo update the response value to return all the different keys, not just app keys.
   *
   */
  async getAccountDetails() {
    const accessKeys = await this.getAccessKeys();
    const authorizedApps = accessKeys.filter((item) => item.access_key.permission !== "FullAccess").map((item) => {
      const perm = item.access_key.permission;
      return {
        contractId: perm.FunctionCall.receiver_id,
        amount: perm.FunctionCall.allowance,
        publicKey: item.public_key
      };
    });
    return { authorizedApps };
  }
  /**
   * @deprecated Will be removed in the next major release, please use {@link Account.getState} instead
   *
   * Returns basic NEAR account information via the `view_account` RPC query method
   * @see [https://docs.near.org/api/rpc/contracts#view-account](https://docs.near.org/api/rpc/contracts#view-account)
   */
  async state() {
    const deprecate = (0, import_depd3.default)("Account.state()");
    deprecate("It will be removed in the next major release, please switch to either Account.getState()");
    return this.provider.query({
      request_type: "view_account",
      account_id: this.accountId,
      finality: "optimistic"
    });
  }
  /**
   * @deprecated Will be removed in the next major release, please use {@link Account.getState} instead
   *
   */
  async getAccountBalance() {
    const deprecate = (0, import_depd3.default)("Account.getAccountBalance()");
    deprecate("It will be removed in the next major release, please switch to either Account.getState()");
    const protocolConfig = await this.provider.experimental_protocolConfig({
      finality: DEFAULT_FINALITY
    });
    const state = await this.state();
    const costPerByte = BigInt(
      protocolConfig.runtime_config.storage_amount_per_byte
    );
    const stateStaked = BigInt(state.storage_usage) * costPerByte;
    const staked = BigInt(state.locked);
    const totalBalance = BigInt(state.amount) + staked;
    const availableBalance = totalBalance - (staked > stateStaked ? staked : stateStaked);
    return {
      total: totalBalance.toString(),
      stateStaked: stateStaked.toString(),
      staked: staked.toString(),
      available: availableBalance.toString()
    };
  }
  /**
   * Returns the NEAR tokens balance and validators of a given account that is delegated to the staking pools that are part of the validators set in the current epoch.
   *
   * @deprecated Will be removed in the next major release
   *
   * NOTE: If the tokens are delegated to a staking pool that is currently on pause or does not have enough tokens to participate in validation, they won't be accounted for.
   * @returns {Promise<ActiveDelegatedStakeBalance>}
   */
  async getActiveDelegatedStakeBalance() {
    const deprecate = (0, import_depd3.default)("Account.getActiveDelegatedStakeBalance()");
    deprecate("It will be removed in the next major release");
    const block = await this.provider.block({
      finality: DEFAULT_FINALITY
    });
    const blockHash = block.header.hash;
    const epochId = block.header.epoch_id;
    const { current_validators, next_validators, current_proposals } = await this.provider.validators(epochId);
    const pools = /* @__PURE__ */ new Set();
    [
      ...current_validators,
      ...next_validators,
      ...current_proposals
    ].forEach((validator3) => pools.add(validator3.account_id));
    const uniquePools = [...pools];
    const promises = uniquePools.map(
      (validator3) => this.viewFunction({
        contractId: validator3,
        methodName: "get_account_total_balance",
        args: { account_id: this.accountId },
        blockQuery: { blockId: blockHash }
      })
    );
    const results = await Promise.allSettled(promises);
    const hasTimeoutError = results.some((result) => {
      if (result.status === "rejected" && result.reason.type === "TimeoutError") {
        return true;
      }
      return false;
    });
    if (hasTimeoutError) {
      throw new Error("Failed to get delegated stake balance");
    }
    const summary = results.reduce(
      (result, state, index) => {
        const validatorId = uniquePools[index];
        if (state.status === "fulfilled") {
          const currentBN = BigInt(state.value);
          if (currentBN !== 0n) {
            return {
              ...result,
              stakedValidators: [
                ...result.stakedValidators,
                { validatorId, amount: currentBN.toString() }
              ],
              total: result.total + currentBN
            };
          }
        }
        if (state.status === "rejected") {
          return {
            ...result,
            failedValidators: [
              ...result.failedValidators,
              { validatorId, error: state.reason }
            ]
          };
        }
        return result;
      },
      { stakedValidators: [], failedValidators: [], total: 0n }
    );
    return {
      ...summary,
      total: summary.total.toString()
    };
  }
};

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/account_creator.js
var import_dist37 = __toESM(require_dist(), 1);
var import_dist38 = __toESM(require_dist2(), 1);
var import_dist39 = __toESM(require_dist3(), 1);
var import_depd4 = __toESM(require_browser(), 1);
var AccountCreator = class {
  constructor() {
    const deprecate = (0, import_depd4.default)("AccountCreator");
    deprecate(`${this.constructor.name} is deprecated and will be removed in the next major release`);
  }
};
var LocalAccountCreator = class extends AccountCreator {
  constructor(masterAccount, initialBalance) {
    super();
    __publicField(this, "masterAccount");
    __publicField(this, "initialBalance");
    this.masterAccount = masterAccount;
    this.initialBalance = initialBalance;
  }
  /**
   * Creates an account using a masterAccount, meaning the new account is created from an existing account
   * @param newAccountId The name of the NEAR account to be created
   * @param publicKey The public key from the masterAccount used to create this account
   * @returns {Promise<void>}
   */
  async createAccount(newAccountId, publicKey) {
    await this.masterAccount.createAccount(newAccountId, publicKey, this.initialBalance);
  }
};
var UrlAccountCreator = class extends AccountCreator {
  constructor(connection, helperUrl) {
    super();
    __publicField(this, "connection");
    __publicField(this, "helperUrl");
    this.connection = connection;
    this.helperUrl = helperUrl;
  }
  /**
   * Creates an account using a helperUrl
   * This is [hosted here](https://helper.nearprotocol.com) or set up locally with the [near-contract-helper](https://github.com/nearprotocol/near-contract-helper) repository
   * @param newAccountId The name of the NEAR account to be created
   * @param publicKey The public key from the masterAccount used to create this account
   * @returns {Promise<void>}
   */
  async createAccount(newAccountId, publicKey) {
    await fetch(`${this.helperUrl}/account`, {
      body: JSON.stringify({ newAccountId, newAccountPublicKey: publicKey.toString() }),
      method: "POST"
    });
  }
};

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/constants.js
var import_dist40 = __toESM(require_dist(), 1);
var import_dist41 = __toESM(require_dist2(), 1);
var import_dist42 = __toESM(require_dist3(), 1);
var MULTISIG_STORAGE_KEY = "__multisigRequest";
var MULTISIG_ALLOWANCE = BigInt(parseNearAmount("1"));
var MULTISIG_GAS = 100000000000000n;
var MULTISIG_DEPOSIT = 0n;
var MULTISIG_CHANGE_METHODS = ["add_request", "add_request_and_confirm", "delete_request", "confirm"];
var MULTISIG_CONFIRM_METHODS = ["confirm"];

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/contract.js
var import_dist55 = __toESM(require_dist(), 1);
var import_dist56 = __toESM(require_dist2(), 1);
var import_dist57 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/local-view-execution/index.js
var import_dist49 = __toESM(require_dist(), 1);
var import_dist50 = __toESM(require_dist2(), 1);
var import_dist51 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/local-view-execution/storage.js
var import_dist43 = __toESM(require_dist(), 1);
var import_dist44 = __toESM(require_dist2(), 1);
var import_dist45 = __toESM(require_dist3(), 1);
var LRU = __toESM(require_lru(), 1);
var _Storage = class _Storage {
  constructor(options = { max: _Storage.MAX_ELEMENTS }) {
    __publicField(this, "cache");
    // map block hash to block height
    __publicField(this, "blockHeights");
    this.cache = new LRU.LRUMap(options.max);
    this.blockHeights = /* @__PURE__ */ new Map();
  }
  load(blockRef) {
    const noBlockId = !("blockId" in blockRef);
    if (noBlockId) return void 0;
    let blockId = blockRef.blockId;
    if (blockId.toString().length == 44) {
      blockId = this.blockHeights.get(blockId.toString());
    }
    return this.cache.get(blockId);
  }
  save(blockHash, { blockHeight, blockTimestamp, contractCode, contractState }) {
    this.blockHeights.set(blockHash, blockHeight);
    this.cache.set(blockHeight, { blockHeight, blockTimestamp, contractCode, contractState });
  }
};
__publicField(_Storage, "MAX_ELEMENTS", 100);
var Storage = _Storage;

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/local-view-execution/runtime.js
var import_dist46 = __toESM(require_dist(), 1);
var import_dist47 = __toESM(require_dist2(), 1);
var import_dist48 = __toESM(require_dist3(), 1);
var notImplemented = (name) => () => {
  throw new Error("method not implemented: " + name);
};
var prohibitedInView = (name) => () => {
  throw new Error("method not available for view calls: " + name);
};
var Runtime = class {
  constructor({ contractCode, ...context }) {
    __publicField(this, "context");
    __publicField(this, "wasm");
    __publicField(this, "memory");
    __publicField(this, "registers");
    __publicField(this, "logs");
    __publicField(this, "result");
    this.context = context;
    this.wasm = this.prepareWASM(Buffer.from(contractCode, "base64"));
    this.memory = new WebAssembly.Memory({ initial: 1024, maximum: 2048 });
    this.registers = {};
    this.logs = [];
    this.result = Buffer.from([]);
  }
  readUTF16CStr(ptr) {
    const arr = [];
    const mem = new Uint16Array(this.memory.buffer);
    let key = Number(ptr) / 2;
    while (mem[key] != 0) {
      arr.push(mem[key]);
      key++;
    }
    return Buffer.from(Uint16Array.from(arr).buffer).toString("ucs2");
  }
  readUTF8CStr(len, ptr) {
    const arr = [];
    const mem = new Uint8Array(this.memory.buffer);
    let key = Number(ptr);
    for (let i = 0; i < len && mem[key] != 0; i++) {
      arr.push(mem[key]);
      key++;
    }
    return Buffer.from(arr).toString("utf8");
  }
  storageRead(keyLen, keyPtr) {
    const storageKey = Buffer.from(new Uint8Array(this.memory.buffer, Number(keyPtr), Number(keyLen)));
    const stateVal = this.context.contractState.filter((obj) => Buffer.compare(obj.key, storageKey) === 0).map((obj) => obj.value);
    if (stateVal.length === 0) return null;
    return stateVal.length > 1 ? stateVal : stateVal[0];
  }
  prepareWASM(input) {
    const parts = [];
    const magic = input.subarray(0, 4);
    if (magic.toString("utf8") !== "\0asm") {
      throw new Error("Invalid magic number");
    }
    const version = input.readUInt32LE(4);
    if (version != 1) {
      throw new Error("Invalid version: " + version);
    }
    let offset = 8;
    parts.push(input.subarray(0, offset));
    function decodeLEB128() {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = input[offset++];
        result |= (byte & 127) << shift;
        shift += 7;
      } while (byte & 128);
      return result;
    }
    function decodeLimits() {
      const flags = input[offset++];
      const hasMax = flags & 1;
      const initial = decodeLEB128();
      const max = hasMax ? decodeLEB128() : null;
      return { initial, max };
    }
    function decodeString() {
      const length = decodeLEB128();
      const result = input.subarray(offset, offset + length);
      offset += length;
      return result.toString("utf8");
    }
    function encodeLEB128(value) {
      const result = [];
      do {
        let byte = value & 127;
        value >>= 7;
        if (value !== 0) {
          byte |= 128;
        }
        result.push(byte);
      } while (value !== 0);
      return Buffer.from(result);
    }
    function encodeString(value) {
      const result = Buffer.from(value, "utf8");
      return Buffer.concat([encodeLEB128(result.length), result]);
    }
    do {
      const sectionStart = offset;
      const sectionId = input.readUInt8(offset);
      offset++;
      const sectionSize = decodeLEB128();
      const sectionEnd = offset + sectionSize;
      if (sectionId == 5) {
        parts.push(Buffer.from([5, 1, 0]));
      } else if (sectionId == 2) {
        const sectionParts = [];
        const numImports = decodeLEB128();
        for (let i = 0; i < numImports; i++) {
          const importStart = offset;
          decodeString();
          decodeString();
          const kind = input.readUInt8(offset);
          offset++;
          let skipImport = false;
          switch (kind) {
            case 0:
              decodeLEB128();
              break;
            case 1:
              offset++;
              decodeLimits();
              break;
            case 2:
              decodeLimits();
              skipImport = true;
              break;
            case 3:
              offset++;
              offset++;
              break;
            default:
              throw new Error("Invalid import kind: " + kind);
          }
          if (!skipImport) {
            sectionParts.push(input.subarray(importStart, offset));
          }
        }
        const importMemory = Buffer.concat([
          encodeString("env"),
          encodeString("memory"),
          Buffer.from([2]),
          // Memory import
          Buffer.from([0]),
          encodeLEB128(1)
        ]);
        sectionParts.push(importMemory);
        const sectionData = Buffer.concat([
          encodeLEB128(sectionParts.length),
          ...sectionParts
        ]);
        parts.push(Buffer.concat([
          Buffer.from([2]),
          // Import section
          encodeLEB128(sectionData.length),
          sectionData
        ]));
      } else if (sectionId == 7) {
        const sectionParts = [];
        const numExports = decodeLEB128();
        for (let i = 0; i < numExports; i++) {
          const exportStart = offset;
          decodeString();
          const kind = input.readUInt8(offset);
          offset++;
          decodeLEB128();
          if (kind !== 2) {
            sectionParts.push(input.subarray(exportStart, offset));
          }
        }
        const sectionData = Buffer.concat([
          encodeLEB128(sectionParts.length),
          ...sectionParts
        ]);
        parts.push(Buffer.concat([
          Buffer.from([7]),
          // Export section
          encodeLEB128(sectionData.length),
          sectionData
        ]));
      } else {
        parts.push(input.subarray(sectionStart, sectionEnd));
      }
      offset = sectionEnd;
    } while (offset < input.length);
    return Buffer.concat(parts);
  }
  // Host functions
  getRegisterLength(registerId) {
    return BigInt(this.registers[registerId.toString()] ? this.registers[registerId.toString()].length : Number.MAX_SAFE_INTEGER);
  }
  readFromRegister(registerId, ptr) {
    const mem = new Uint8Array(this.memory.buffer);
    mem.set(this.registers[registerId.toString()] || Buffer.from([]), Number(ptr));
  }
  getCurrentAccountId(registerId) {
    this.registers[registerId.toString()] = Buffer.from(this.context.contractId);
  }
  inputMethodArgs(registerId) {
    this.registers[registerId.toString()] = Buffer.from(this.context.methodArgs);
  }
  getBlockHeight() {
    return BigInt(this.context.blockHeight);
  }
  getBlockTimestamp() {
    return BigInt(this.context.blockTimestamp);
  }
  sha256(valueLen, valuePtr, registerId) {
    const value = new Uint8Array(this.memory.buffer, Number(valuePtr), Number(valueLen));
    this.registers[registerId.toString()] = sha256(value);
  }
  returnValue(valueLen, valuePtr) {
    this.result = Buffer.from(new Uint8Array(this.memory.buffer, Number(valuePtr), Number(valueLen)));
  }
  panic(message) {
    throw new Error("panic: " + message);
  }
  abort(msg_ptr, filename_ptr, line, col) {
    const msg = this.readUTF16CStr(msg_ptr);
    const filename = this.readUTF16CStr(filename_ptr);
    const message = `${msg} ${filename}:${line}:${col}`;
    if (!msg || !filename) {
      throw new Error("abort: String encoding is bad UTF-16 sequence.");
    }
    throw new Error("abort: " + message);
  }
  appendToLog(len, ptr) {
    this.logs.push(this.readUTF8CStr(len, ptr));
  }
  readStorage(key_len, key_ptr, register_id) {
    const result = this.storageRead(key_len, key_ptr);
    if (result == null) {
      return 0n;
    }
    this.registers[register_id] = result;
    return 1n;
  }
  hasStorageKey(key_len, key_ptr) {
    const result = this.storageRead(key_len, key_ptr);
    if (result == null) {
      return 0n;
    }
    return 1n;
  }
  getHostImports() {
    return {
      register_len: this.getRegisterLength.bind(this),
      read_register: this.readFromRegister.bind(this),
      current_account_id: this.getCurrentAccountId.bind(this),
      input: this.inputMethodArgs.bind(this),
      block_index: this.getBlockHeight.bind(this),
      block_timestamp: this.getBlockTimestamp.bind(this),
      sha256: this.sha256.bind(this),
      value_return: this.returnValue.bind(this),
      abort: this.abort.bind(this),
      log_utf8: this.appendToLog.bind(this),
      log_utf16: this.appendToLog.bind(this),
      storage_read: this.readStorage.bind(this),
      storage_has_key: this.hasStorageKey.bind(this),
      panic: () => this.panic("explicit guest panic"),
      panic_utf8: (len, ptr) => this.panic(this.readUTF8CStr(len, ptr)),
      // Not implemented
      epoch_height: notImplemented("epoch_height"),
      storage_usage: notImplemented("storage_usage"),
      account_balance: notImplemented("account_balance"),
      account_locked_balance: notImplemented("account_locked_balance"),
      random_seed: notImplemented("random_seed"),
      ripemd160: notImplemented("ripemd160"),
      keccak256: notImplemented("keccak256"),
      keccak512: notImplemented("keccak512"),
      ecrecover: notImplemented("ecrecover"),
      validator_stake: notImplemented("validator_stake"),
      validator_total_stake: notImplemented("validator_total_stake"),
      // Prohibited
      write_register: prohibitedInView("write_register"),
      signer_account_id: prohibitedInView("signer_account_id"),
      signer_account_pk: prohibitedInView("signer_account_pk"),
      predecessor_account_id: prohibitedInView("predecessor_account_id"),
      attached_deposit: prohibitedInView("attached_deposit"),
      prepaid_gas: prohibitedInView("prepaid_gas"),
      used_gas: prohibitedInView("used_gas"),
      promise_create: prohibitedInView("promise_create"),
      promise_then: prohibitedInView("promise_then"),
      promise_and: prohibitedInView("promise_and"),
      promise_batch_create: prohibitedInView("promise_batch_create"),
      promise_batch_then: prohibitedInView("promise_batch_then"),
      promise_batch_action_create_account: prohibitedInView("promise_batch_action_create_account"),
      promise_batch_action_deploy_contract: prohibitedInView("promise_batch_action_deploy_contract"),
      promise_batch_action_function_call: prohibitedInView("promise_batch_action_function_call"),
      promise_batch_action_function_call_weight: prohibitedInView("promise_batch_action_function_call_weight"),
      promise_batch_action_transfer: prohibitedInView("promise_batch_action_transfer"),
      promise_batch_action_stake: prohibitedInView("promise_batch_action_stake"),
      promise_batch_action_add_key_with_full_access: prohibitedInView("promise_batch_action_add_key_with_full_access"),
      promise_batch_action_add_key_with_function_call: prohibitedInView("promise_batch_action_add_key_with_function_call"),
      promise_batch_action_delete_key: prohibitedInView("promise_batch_action_delete_key"),
      promise_batch_action_delete_account: prohibitedInView("promise_batch_action_delete_account"),
      promise_results_count: prohibitedInView("promise_results_count"),
      promise_result: prohibitedInView("promise_result"),
      promise_return: prohibitedInView("promise_return"),
      storage_write: prohibitedInView("storage_write"),
      storage_remove: prohibitedInView("storage_remove")
    };
  }
  async execute(methodName) {
    const module = await WebAssembly.compile(this.wasm);
    const instance = await WebAssembly.instantiate(module, { env: { ...this.getHostImports(), memory: this.memory } });
    const callMethod = instance.exports[methodName];
    if (callMethod == void 0) {
      throw new Error(`Contract method '${methodName}' does not exists in contract ${this.context.contractId} for block id ${this.context.blockHeight}`);
    }
    callMethod();
    return {
      result: this.result,
      logs: this.logs
    };
  }
};

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/local-view-execution/index.js
var import_depd5 = __toESM(require_browser(), 1);
var LocalViewExecution = class {
  constructor(connection) {
    __publicField(this, "connection");
    __publicField(this, "storage");
    this.connection = connection.getConnection();
    this.storage = new Storage();
    const deprecate = (0, import_depd5.default)("LocalViewExecution");
    deprecate("It will be removed in the next major release");
  }
  async fetchContractCode(contractId, blockQuery) {
    const result = await this.connection.provider.query({
      request_type: "view_code",
      account_id: contractId,
      ...blockQuery
    });
    return result.code_base64;
  }
  async fetchContractState(contractId, blockQuery) {
    return viewState(this.connection, contractId, "", blockQuery);
  }
  async fetch(contractId, blockQuery) {
    const block = await this.connection.provider.block(blockQuery);
    const blockHash = block.header.hash;
    const blockHeight = block.header.height;
    const blockTimestamp = block.header.timestamp;
    const contractCode = await this.fetchContractCode(contractId, blockQuery);
    const contractState = await this.fetchContractState(contractId, blockQuery);
    return {
      blockHash,
      blockHeight,
      blockTimestamp,
      contractCode,
      contractState
    };
  }
  async loadOrFetch(contractId, blockQuery) {
    const stored = this.storage.load(blockQuery);
    if (stored) {
      return stored;
    }
    const { blockHash, ...fetched } = await this.fetch(contractId, blockQuery);
    this.storage.save(blockHash, fetched);
    return fetched;
  }
  /**
   * Calls a view function on a contract, fetching the contract code and state if needed.
   * @param options Options for calling the view function.
   * @param options.contractId The contract account ID.
   * @param options.methodName The name of the view function to call.
   * @param options.args The arguments to pass to the view function.
   * @param options.blockQuery The block query options.
   * @returns {Promise<any>} - A promise that resolves to the result of the view function.
   */
  async viewFunction({ contractId, methodName, args = {}, blockQuery = { finality: "optimistic" } }) {
    const methodArgs = JSON.stringify(args);
    const { contractCode, contractState, blockHeight, blockTimestamp } = await this.loadOrFetch(
      contractId,
      blockQuery
    );
    const runtime = new Runtime({ contractId, contractCode, contractState, blockHeight, blockTimestamp, methodArgs });
    const { result, logs } = await runtime.execute(methodName);
    if (logs) {
      printTxOutcomeLogs({ contractId, logs });
    }
    return JSON.parse(Buffer.from(result).toString());
  }
};

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/contract.js
var import_is_my_json_valid = __toESM(require_is_my_json_valid(), 1);
var import_depd6 = __toESM(require_browser(), 1);
var import_near_abi = __toESM(require_lib(), 1);

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/errors.js
var import_dist52 = __toESM(require_dist(), 1);
var import_dist53 = __toESM(require_dist2(), 1);
var import_dist54 = __toESM(require_dist3(), 1);
var UnsupportedSerializationError = class extends Error {
  constructor(methodName, serializationType) {
    super(`Contract method '${methodName}' is using an unsupported serialization type ${serializationType}`);
  }
};
var UnknownArgumentError = class extends Error {
  constructor(actualArgName, expectedArgNames) {
    super(`Unrecognized argument '${actualArgName}', expected '${JSON.stringify(expectedArgNames)}'`);
  }
};
var ArgumentSchemaError = class extends Error {
  constructor(argName, errors) {
    super(`Argument '${argName}' does not conform to the specified ABI schema: '${JSON.stringify(errors)}'`);
  }
};
var ConflictingOptions = class extends Error {
  constructor() {
    super("Conflicting contract method options have been passed. You can either specify ABI or a list of view/call methods.");
  }
};

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/contract.js
function nameFunction(name, body) {
  return {
    [name](...args) {
      return body(...args);
    }
  }[name];
}
function validateArguments(args, abiFunction, abiRoot) {
  var _a;
  if (!isObject(args)) return;
  if (abiFunction.params && abiFunction.params.serialization_type !== import_near_abi.AbiSerializationType.Json) {
    throw new UnsupportedSerializationError(
      abiFunction.name,
      abiFunction.params.serialization_type
    );
  }
  if (abiFunction.result && abiFunction.result.serialization_type !== import_near_abi.AbiSerializationType.Json) {
    throw new UnsupportedSerializationError(
      abiFunction.name,
      abiFunction.result.serialization_type
    );
  }
  const params = ((_a = abiFunction.params) == null ? void 0 : _a.args) || [];
  for (const p of params) {
    const arg = args[p.name];
    const typeSchema = p.type_schema;
    typeSchema.definitions = abiRoot.body.root_schema.definitions;
    const validate = (0, import_is_my_json_valid.default)(typeSchema);
    const valid = validate(arg);
    if (!valid) {
      throw new ArgumentSchemaError(p.name, validate.errors);
    }
  }
  for (const argName of Object.keys(args)) {
    const param = params.find((p) => p.name === argName);
    if (!param) {
      throw new UnknownArgumentError(
        argName,
        params.map((p) => p.name)
      );
    }
  }
}
var isUint8Array = (x) => x && x.byteLength !== void 0 && x.byteLength === x.length;
var isObject = (x) => Object.prototype.toString.call(x) === "[object Object]";
var Contract = class {
  /**
   * @param account NEAR account to sign change method transactions
   * @param contractId NEAR account id where the contract is deployed
   * @param options NEAR smart contract methods that your application will use. These will be available as `contract.methodName`
   */
  constructor(connection, contractId, options) {
    /** @deprecated */
    __publicField(this, "account");
    __publicField(this, "connection");
    __publicField(this, "contractId");
    __publicField(this, "lve");
    const deprecate = (0, import_depd6.default)("new Contract()");
    deprecate(
      'It will be removed in the next major release, please switch to "TypedContract" with type-safe ABI support'
    );
    this.connection = connection.getConnection();
    if (connection instanceof Account) {
      const deprecate2 = (0, import_depd6.default)(
        "new Contract(account, contractId, options)"
      );
      deprecate2(
        "use `new Contract(connection, contractId, options)` instead"
      );
      this.account = connection;
    }
    this.contractId = contractId;
    this.lve = new LocalViewExecution(connection);
    const {
      viewMethods = [],
      changeMethods = [],
      abi: abiRoot,
      useLocalViewExecution
    } = options;
    let viewMethodsWithAbi = viewMethods.map((name) => ({
      name,
      abi: null
    }));
    let changeMethodsWithAbi = changeMethods.map((name) => ({
      name,
      abi: null
    }));
    if (abiRoot) {
      if (viewMethodsWithAbi.length > 0 || changeMethodsWithAbi.length > 0) {
        throw new ConflictingOptions();
      }
      viewMethodsWithAbi = abiRoot.body.functions.filter((m) => m.kind === import_near_abi.AbiFunctionKind.View).map((m) => ({ name: m.name, abi: m }));
      changeMethodsWithAbi = abiRoot.body.functions.filter((methodAbi) => methodAbi.kind === import_near_abi.AbiFunctionKind.Call).map((methodAbi) => ({ name: methodAbi.name, abi: methodAbi }));
    }
    viewMethodsWithAbi.forEach(({ name, abi }) => {
      Object.defineProperty(this, name, {
        writable: false,
        enumerable: true,
        value: nameFunction(
          name,
          async (args = {}, options2 = {}, ...ignored) => {
            if (ignored.length || !(isObject(args) || isUint8Array(args)) || !isObject(options2)) {
              throw new PositionalArgsError();
            }
            if (abi) {
              validateArguments(args, abi, abiRoot);
            }
            if (useLocalViewExecution) {
              try {
                return await this.lve.viewFunction({
                  contractId: this.contractId,
                  methodName: name,
                  args,
                  ...options2
                });
              } catch (error) {
                Logger.warn(
                  `Local view execution failed with: "${error.message}"`
                );
                Logger.warn(`Fallback to normal RPC call`);
              }
            }
            if (this.account) {
              return this.account.viewFunction({
                contractId: this.contractId,
                methodName: name,
                args,
                ...options2
              });
            }
            return viewFunction(this.connection, {
              contractId: this.contractId,
              methodName: name,
              args,
              ...options2
            });
          }
        )
      });
    });
    changeMethodsWithAbi.forEach(({ name, abi }) => {
      Object.defineProperty(this, name, {
        writable: false,
        enumerable: true,
        value: nameFunction(name, async (...args) => {
          if (args.length && (args.length > 3 || !(isObject(args[0]) || isUint8Array(args[0])))) {
            throw new PositionalArgsError();
          }
          if (args.length > 1 || !(args[0] && args[0].args)) {
            const deprecate2 = (0, import_depd6.default)(
              "contract.methodName(args, gas, amount)"
            );
            deprecate2(
              "use `contract.methodName({ signerAccount, args, gas?, amount?, callbackUrl?, meta? })` instead"
            );
            args[0] = {
              args: args[0],
              gas: args[1],
              amount: args[2]
            };
          }
          if (abi) {
            validateArguments(args[0].args, abi, abiRoot);
          }
          return this._changeMethod({ methodName: name, ...args[0] });
        })
      });
    });
  }
  async _changeMethod({
    signerAccount,
    args,
    methodName,
    gas,
    amount,
    meta,
    callbackUrl
  }) {
    validateBNLike({ gas, amount });
    const account = this.account || signerAccount;
    if (!account) throw new Error(`signerAccount must be specified`);
    const rawResult = await account.functionCall({
      contractId: this.contractId,
      methodName,
      args,
      gas,
      attachedDeposit: amount,
      walletMeta: meta,
      walletCallbackUrl: callbackUrl
    });
    return getTransactionLastResult(rawResult);
  }
};
function validateBNLike(argMap) {
  const bnLike = "number, decimal string or BigInt";
  for (const argName of Object.keys(argMap)) {
    const argValue = argMap[argName];
    if (argValue && typeof argValue !== "bigint" && isNaN(argValue)) {
      throw new ArgumentTypeError(argName, bnLike, argValue);
    }
  }
}

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/typed_contract.js
var import_dist58 = __toESM(require_dist(), 1);
var import_dist59 = __toESM(require_dist2(), 1);
var import_dist60 = __toESM(require_dist3(), 1);
var import_is_my_json_valid2 = __toESM(require_is_my_json_valid(), 1);
var Contract2 = class {
  constructor({
    abi,
    provider,
    contractId
  }) {
    __publicField(this, "abi");
    __publicField(this, "contractId");
    __publicField(this, "view");
    __publicField(this, "call");
    this.contractId = contractId;
    this.abi = abi;
    let hasViewFunction = false;
    let hasCallFunction = false;
    const abiFunctions = (abi == null ? void 0 : abi.body.functions) || [];
    for (const func of abiFunctions) {
      if (func.kind === "view") {
        hasViewFunction = true;
      } else if (func.kind === "call") {
        hasCallFunction = true;
      }
      if (hasViewFunction && hasCallFunction) break;
    }
    if (hasViewFunction || !abi) {
      this.view = new Proxy(
        {},
        {
          get: (_, functionName) => {
            const abiFunction = ((abi == null ? void 0 : abi.body.functions) || []).find(
              ({ name }) => name === functionName
            );
            return async (params = {}) => {
              const args = params.args ?? {};
              if (abiFunction && abi) {
                validateArguments2(args, abiFunction, abi);
              }
              return provider.callFunction(
                contractId,
                functionName,
                args,
                params.blockQuery
              );
            };
          }
        }
      );
    }
    if (hasCallFunction || !abi) {
      this.call = new Proxy(
        {},
        {
          get: (_, functionName) => {
            const abiFunction = ((abi == null ? void 0 : abi.body.functions) || []).find(
              ({ name }) => name === functionName
            );
            return async (params) => {
              const args = params.args ?? {};
              if (abiFunction && abi) {
                validateArguments2(args, abiFunction, abi);
              }
              return params.account.callFunction({
                contractId,
                methodName: functionName,
                args,
                deposit: params.deposit,
                gas: params.gas,
                waitUntil: params.waitUntil
              });
            };
          }
        }
      );
    }
    if (!abi) {
      delete this.abi;
    }
  }
};
var TypedContract = Contract2;
function validateArguments2(args, abiFunction, abiRoot) {
  if (typeof args !== "object" || typeof abiFunction.params !== "object")
    return;
  if (abiFunction.params.serialization_type === "json") {
    const params = abiFunction.params.args;
    for (const p of params) {
      const arg = args[p.name];
      const typeSchema = p.type_schema;
      typeSchema.definitions = abiRoot.body.root_schema.definitions;
      const validate = (0, import_is_my_json_valid2.default)(typeSchema);
      const valid = validate(arg);
      if (!valid) {
        throw new ArgumentSchemaError(p.name, validate.errors);
      }
    }
    for (const argName of Object.keys(args)) {
      const param = params.find((p) => p.name === argName);
      if (!param) {
        throw new UnknownArgumentError(
          argName,
          params.map((p) => p.name)
        );
      }
    }
  }
}

// node_modules/.pnpm/@near-js+accounts@2.3.1_d4ce5898882012ae77af1be86e826168/node_modules/@near-js/accounts/lib/esm/types.js
var import_dist61 = __toESM(require_dist(), 1);
var import_dist62 = __toESM(require_dist2(), 1);
var import_dist63 = __toESM(require_dist3(), 1);
var MultisigDeleteRequestRejectionError = ((MultisigDeleteRequestRejectionError2) => {
  MultisigDeleteRequestRejectionError2["CANNOT_DESERIALIZE_STATE"] = "Cannot deserialize the contract state";
  MultisigDeleteRequestRejectionError2["MULTISIG_NOT_INITIALIZED"] = "Smart contract panicked: Multisig contract should be initialized before usage";
  MultisigDeleteRequestRejectionError2["NO_SUCH_REQUEST"] = "Smart contract panicked: panicked at 'No such request: either wrong number or already confirmed'";
  MultisigDeleteRequestRejectionError2["REQUEST_COOLDOWN_ERROR"] = "Request cannot be deleted immediately after creation.";
  MultisigDeleteRequestRejectionError2["METHOD_NOT_FOUND"] = "Contract method is not found";
  return MultisigDeleteRequestRejectionError2;
})(MultisigDeleteRequestRejectionError || {});
var MultisigStateStatus = ((MultisigStateStatus2) => {
  MultisigStateStatus2[MultisigStateStatus2["INVALID_STATE"] = 0] = "INVALID_STATE";
  MultisigStateStatus2[MultisigStateStatus2["STATE_NOT_INITIALIZED"] = 1] = "STATE_NOT_INITIALIZED";
  MultisigStateStatus2[MultisigStateStatus2["VALID_STATE"] = 2] = "VALID_STATE";
  MultisigStateStatus2[MultisigStateStatus2["UNKNOWN_STATE"] = 3] = "UNKNOWN_STATE";
  return MultisigStateStatus2;
})(MultisigStateStatus || {});
export {
  Account,
  AccountCreator,
  ArgumentSchemaError,
  ConflictingOptions,
  Connection,
  Contract,
  LocalAccountCreator,
  MULTISIG_ALLOWANCE,
  MULTISIG_CHANGE_METHODS,
  MULTISIG_CONFIRM_METHODS,
  MULTISIG_DEPOSIT,
  MULTISIG_GAS,
  MULTISIG_STORAGE_KEY,
  MultisigDeleteRequestRejectionError,
  MultisigStateStatus,
  TypedContract,
  UnknownArgumentError,
  UnsupportedSerializationError,
  UrlAccountCreator
};
//# sourceMappingURL=@near-js_accounts.js.map
