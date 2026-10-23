import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  Logger,
  ServerError,
  TypedError,
  baseEncode,
  encodeTransaction,
  findSeatPrice,
  formatError,
  getErrorTypeFromErrorMessage,
  parseRpcError
} from "./chunk-DC45WWGP.js";
import {
  __commonJS,
  __publicField,
  __toESM,
  require_dist,
  require_dist2,
  require_dist3
} from "./chunk-ZJQU6JCY.js";

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/options.js
var require_options = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/options.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    var __assign = exports && exports.__assign || function() {
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var defaultOptions = {
      delayFirstAttempt: false,
      jitter: "none",
      maxDelay: Infinity,
      numOfAttempts: 10,
      retry: function() {
        return true;
      },
      startingDelay: 100,
      timeMultiple: 2
    };
    function getSanitizedOptions(options) {
      var sanitized = __assign(__assign({}, defaultOptions), options);
      if (sanitized.numOfAttempts < 1) {
        sanitized.numOfAttempts = 1;
      }
      return sanitized;
    }
    exports.getSanitizedOptions = getSanitizedOptions;
  }
});

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/jitter/full/full.jitter.js
var require_full_jitter = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/jitter/full/full.jitter.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    Object.defineProperty(exports, "__esModule", { value: true });
    function fullJitter(delay) {
      var jitteredDelay = Math.random() * delay;
      return Math.round(jitteredDelay);
    }
    exports.fullJitter = fullJitter;
  }
});

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/jitter/no/no.jitter.js
var require_no_jitter = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/jitter/no/no.jitter.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    Object.defineProperty(exports, "__esModule", { value: true });
    function noJitter(delay) {
      return delay;
    }
    exports.noJitter = noJitter;
  }
});

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/jitter/jitter.factory.js
var require_jitter_factory = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/jitter/jitter.factory.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    Object.defineProperty(exports, "__esModule", { value: true });
    var full_jitter_1 = require_full_jitter();
    var no_jitter_1 = require_no_jitter();
    function JitterFactory(options) {
      switch (options.jitter) {
        case "full":
          return full_jitter_1.fullJitter;
        case "none":
        default:
          return no_jitter_1.noJitter;
      }
    }
    exports.JitterFactory = JitterFactory;
  }
});

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/delay/delay.base.js
var require_delay_base = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/delay/delay.base.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    Object.defineProperty(exports, "__esModule", { value: true });
    var jitter_factory_1 = require_jitter_factory();
    var Delay = (
      /** @class */
      function() {
        function Delay2(options) {
          this.options = options;
          this.attempt = 0;
        }
        Delay2.prototype.apply = function() {
          var _this = this;
          return new Promise(function(resolve) {
            return setTimeout(resolve, _this.jitteredDelay);
          });
        };
        Delay2.prototype.setAttemptNumber = function(attempt) {
          this.attempt = attempt;
        };
        Object.defineProperty(Delay2.prototype, "jitteredDelay", {
          get: function() {
            var jitter = jitter_factory_1.JitterFactory(this.options);
            return jitter(this.delay);
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(Delay2.prototype, "delay", {
          get: function() {
            var constant = this.options.startingDelay;
            var base = this.options.timeMultiple;
            var power = this.numOfDelayedAttempts;
            var delay = constant * Math.pow(base, power);
            return Math.min(delay, this.options.maxDelay);
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(Delay2.prototype, "numOfDelayedAttempts", {
          get: function() {
            return this.attempt;
          },
          enumerable: true,
          configurable: true
        });
        return Delay2;
      }()
    );
    exports.Delay = Delay;
  }
});

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/delay/skip-first/skip-first.delay.js
var require_skip_first_delay = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/delay/skip-first/skip-first.delay.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    var __extends = exports && exports.__extends || /* @__PURE__ */ function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports && exports.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1) throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var delay_base_1 = require_delay_base();
    var SkipFirstDelay = (
      /** @class */
      function(_super) {
        __extends(SkipFirstDelay2, _super);
        function SkipFirstDelay2() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        SkipFirstDelay2.prototype.apply = function() {
          return __awaiter(this, void 0, void 0, function() {
            return __generator(this, function(_a) {
              return [2, this.isFirstAttempt ? true : _super.prototype.apply.call(this)];
            });
          });
        };
        Object.defineProperty(SkipFirstDelay2.prototype, "isFirstAttempt", {
          get: function() {
            return this.attempt === 0;
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(SkipFirstDelay2.prototype, "numOfDelayedAttempts", {
          get: function() {
            return this.attempt - 1;
          },
          enumerable: true,
          configurable: true
        });
        return SkipFirstDelay2;
      }(delay_base_1.Delay)
    );
    exports.SkipFirstDelay = SkipFirstDelay;
  }
});

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/delay/always/always.delay.js
var require_always_delay = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/delay/always/always.delay.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    var __extends = exports && exports.__extends || /* @__PURE__ */ function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();
    Object.defineProperty(exports, "__esModule", { value: true });
    var delay_base_1 = require_delay_base();
    var AlwaysDelay = (
      /** @class */
      function(_super) {
        __extends(AlwaysDelay2, _super);
        function AlwaysDelay2() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        return AlwaysDelay2;
      }(delay_base_1.Delay)
    );
    exports.AlwaysDelay = AlwaysDelay;
  }
});

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/delay/delay.factory.js
var require_delay_factory = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/delay/delay.factory.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    Object.defineProperty(exports, "__esModule", { value: true });
    var skip_first_delay_1 = require_skip_first_delay();
    var always_delay_1 = require_always_delay();
    function DelayFactory(options, attempt) {
      var delay = initDelayClass(options);
      delay.setAttemptNumber(attempt);
      return delay;
    }
    exports.DelayFactory = DelayFactory;
    function initDelayClass(options) {
      if (!options.delayFirstAttempt) {
        return new skip_first_delay_1.SkipFirstDelay(options);
      }
      return new always_delay_1.AlwaysDelay(options);
    }
  }
});

// node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/backoff.js
var require_backoff = __commonJS({
  "node_modules/.pnpm/exponential-backoff@3.1.3/node_modules/exponential-backoff/dist/backoff.js"(exports) {
    "use strict";
    var import_dist16 = __toESM(require_dist());
    var import_dist17 = __toESM(require_dist2());
    var import_dist18 = __toESM(require_dist3());
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports && exports.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1) throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var options_1 = require_options();
    var delay_factory_1 = require_delay_factory();
    function backOff2(request, options) {
      if (options === void 0) {
        options = {};
      }
      return __awaiter(this, void 0, void 0, function() {
        var sanitizedOptions, backOff3;
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              sanitizedOptions = options_1.getSanitizedOptions(options);
              backOff3 = new BackOff(request, sanitizedOptions);
              return [4, backOff3.execute()];
            case 1:
              return [2, _a.sent()];
          }
        });
      });
    }
    exports.backOff = backOff2;
    var BackOff = (
      /** @class */
      function() {
        function BackOff2(request, options) {
          this.request = request;
          this.options = options;
          this.attemptNumber = 0;
        }
        BackOff2.prototype.execute = function() {
          return __awaiter(this, void 0, void 0, function() {
            var e_1, shouldRetry;
            return __generator(this, function(_a) {
              switch (_a.label) {
                case 0:
                  if (!!this.attemptLimitReached) return [3, 7];
                  _a.label = 1;
                case 1:
                  _a.trys.push([1, 4, , 6]);
                  return [4, this.applyDelay()];
                case 2:
                  _a.sent();
                  return [4, this.request()];
                case 3:
                  return [2, _a.sent()];
                case 4:
                  e_1 = _a.sent();
                  this.attemptNumber++;
                  return [4, this.options.retry(e_1, this.attemptNumber)];
                case 5:
                  shouldRetry = _a.sent();
                  if (!shouldRetry || this.attemptLimitReached) {
                    throw e_1;
                  }
                  return [3, 6];
                case 6:
                  return [3, 0];
                case 7:
                  throw new Error("Something went wrong.");
              }
            });
          });
        };
        Object.defineProperty(BackOff2.prototype, "attemptLimitReached", {
          get: function() {
            return this.attemptNumber >= this.options.numOfAttempts;
          },
          enumerable: true,
          configurable: true
        });
        BackOff2.prototype.applyDelay = function() {
          return __awaiter(this, void 0, void 0, function() {
            var delay;
            return __generator(this, function(_a) {
              switch (_a.label) {
                case 0:
                  delay = delay_factory_1.DelayFactory(this.options, this.attemptNumber);
                  return [4, delay.apply()];
                case 1:
                  _a.sent();
                  return [
                    2
                    /*return*/
                  ];
              }
            });
          });
        };
        return BackOff2;
      }()
    );
  }
});

// node_modules/.pnpm/@near-js+providers@2.3.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._8beaf24dd0d5651280e031a432876619/node_modules/@near-js/providers/lib/esm/index.js
var import_dist13 = __toESM(require_dist());
var import_dist14 = __toESM(require_dist2());
var import_dist15 = __toESM(require_dist3());

// node_modules/.pnpm/@near-js+providers@2.3.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._8beaf24dd0d5651280e031a432876619/node_modules/@near-js/providers/lib/esm/exponential-backoff.js
var import_dist = __toESM(require_dist(), 1);
var import_dist2 = __toESM(require_dist2(), 1);
var import_dist3 = __toESM(require_dist3(), 1);
async function exponentialBackoff(startWaitTime, retryNumber, waitBackoff, getResult) {
  let waitTime = startWaitTime;
  for (let i = 0; i < retryNumber; i++) {
    const result = await getResult();
    if (result) {
      return result;
    }
    await sleep(waitTime);
    waitTime *= waitBackoff;
  }
  return null;
}
function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

// node_modules/.pnpm/@near-js+providers@2.3.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._8beaf24dd0d5651280e031a432876619/node_modules/@near-js/providers/lib/esm/json-rpc-provider.js
var import_dist7 = __toESM(require_dist(), 1);
var import_dist8 = __toESM(require_dist2(), 1);
var import_dist9 = __toESM(require_dist3(), 1);

// node_modules/.pnpm/@near-js+providers@2.3.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._8beaf24dd0d5651280e031a432876619/node_modules/@near-js/providers/lib/esm/fetch_json.js
var import_dist4 = __toESM(require_dist(), 1);
var import_dist5 = __toESM(require_dist2(), 1);
var import_dist6 = __toESM(require_dist3(), 1);
var import_exponential_backoff = __toESM(require_backoff(), 1);
var BACKOFF_MULTIPLIER = 1.5;
var RETRY_NUMBER = 10;
var RETRY_DELAY = 0;
function retryConfig(numOfAttempts = RETRY_NUMBER, timeMultiple = BACKOFF_MULTIPLIER, startingDelay = RETRY_DELAY) {
  return {
    numOfAttempts,
    timeMultiple,
    startingDelay,
    retry: (e) => {
      if ([503, 500, 408].includes(e.cause)) {
        return true;
      }
      if (e.toString().includes("FetchError") || e.toString().includes("Failed to fetch")) {
        return true;
      }
      return false;
    }
  };
}
var ProviderError = class extends Error {
  constructor(message, options) {
    super(message, options);
    __publicField(this, "cause");
    if (options.cause) {
      this.cause = options.cause;
    }
  }
};
async function fetchJsonRpc(url, json, headers, retryConfig2) {
  const response = await (0, import_exponential_backoff.backOff)(async () => {
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(json),
      headers: { ...headers, "Content-Type": "application/json" }
    });
    const { ok, status } = res;
    if (status === 500) {
      throw new ProviderError("Internal server error", { cause: status });
    } else if (status === 408) {
      throw new ProviderError("Timeout error", { cause: status });
    } else if (status === 400) {
      throw new ProviderError("Request validation error", { cause: status });
    } else if (status === 503) {
      throw new ProviderError(`${url} unavailable`, { cause: status });
    }
    if (!ok) {
      throw new ProviderError(await res.text(), { cause: status });
    }
    return res;
  }, retryConfig2);
  if (!response) {
    throw new TypedError(`Exceeded ${RETRY_NUMBER} attempts for ${url}.`, "RetriesExceeded");
  }
  return await response.json();
}

// node_modules/.pnpm/@near-js+providers@2.3.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._8beaf24dd0d5651280e031a432876619/node_modules/@near-js/providers/lib/esm/json-rpc-provider.js
var REQUEST_RETRY_NUMBER = 12;
var REQUEST_RETRY_WAIT = 500;
var REQUEST_RETRY_WAIT_BACKOFF = 1.5;
var _nextId = 123;
var JsonRpcProvider = class {
  /**
   * @param connectionInfo Connection info
   */
  constructor(connectionInfo, options) {
    /** @hidden */
    __publicField(this, "connection");
    /** @hidden */
    __publicField(this, "options");
    /** @hidden */
    __publicField(this, "networkId");
    this.connection = connectionInfo || { url: "" };
    const defaultOptions = {
      retries: REQUEST_RETRY_NUMBER,
      wait: REQUEST_RETRY_WAIT,
      backoff: REQUEST_RETRY_WAIT_BACKOFF
    };
    this.options = Object.assign({}, defaultOptions, options);
    this.networkId = void 0;
  }
  async getNetworkId() {
    if (this.networkId) return this.networkId;
    const { chain_id } = await this.viewNodeStatus();
    this.networkId = chain_id;
    return this.networkId;
  }
  async getCurrentEpochSeatPrice() {
    const { minimum_stake_ratio: minStakeRatio, protocol_version: protocolVersion } = await this.experimental_protocolConfig({ finality: "final" });
    const { current_validators: currentValidators } = await this.viewValidators();
    const maxNumberOfSeats = 300;
    return findSeatPrice(currentValidators, maxNumberOfSeats, minStakeRatio, protocolVersion);
  }
  async getNextEpochSeatPrice() {
    const { minimum_stake_ratio: minStakeRatio, protocol_version: protocolVersion } = await this.experimental_protocolConfig({ finality: "final" });
    const { next_validators: nextValidators } = await this.viewValidators();
    const maxNumberOfSeats = 300;
    return findSeatPrice(nextValidators, maxNumberOfSeats, minStakeRatio, protocolVersion);
  }
  async viewAccessKey(accountId, publicKey, finalityQuery = { finality: "final" }) {
    const data = await this.query({
      ...finalityQuery,
      request_type: "view_access_key",
      account_id: accountId,
      public_key: publicKey.toString()
    });
    return {
      ...data,
      nonce: BigInt(data.nonce)
    };
  }
  async viewAccessKeyList(accountId, finalityQuery = { finality: "final" }) {
    return this.query({
      ...finalityQuery,
      request_type: "view_access_key_list",
      account_id: accountId
    });
  }
  async viewAccount(accountId, blockQuery = { finality: "final" }) {
    const data = await this.query({
      ...blockQuery,
      request_type: "view_account",
      account_id: accountId
    });
    return {
      ...data,
      amount: BigInt(data.amount),
      locked: BigInt(data.locked)
    };
  }
  async viewContractCode(contractId, blockQuery = { finality: "final" }) {
    const data = await this.query({
      ...blockQuery,
      request_type: "view_code",
      account_id: contractId
    });
    return {
      ...data,
      code: new Uint8Array(Buffer.from(data.code_base64, "base64"))
    };
  }
  async viewContractState(contractId, prefix, blockQuery = { finality: "final" }) {
    const prefixBase64 = Buffer.from(prefix || "").toString("base64");
    return this.query({
      ...blockQuery,
      request_type: "view_state",
      account_id: contractId,
      prefix_base64: prefixBase64
    });
  }
  async callFunction(contractId, method, args, blockQuery = { finality: "final" }) {
    const { result } = await this.callFunctionRaw(
      contractId,
      method,
      args,
      blockQuery
    );
    if (result.length === 0) return void 0;
    const serializedResult = Buffer.from(result).toString();
    try {
      return JSON.parse(serializedResult);
    } catch {
      return serializedResult;
    }
  }
  async callFunctionRaw(contractId, method, args, blockQuery = { finality: "final" }) {
    const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64");
    return await this.query({
      ...blockQuery,
      request_type: "call_function",
      account_id: contractId,
      method_name: method,
      args_base64: argsBase64
    });
  }
  async viewBlock(blockQuery) {
    const { finality } = blockQuery;
    const { blockId } = blockQuery;
    return this.sendJsonRpc("block", { block_id: blockId, finality });
  }
  async viewChunk(chunkId) {
    return this.sendJsonRpc("chunk", [chunkId]);
  }
  async viewGasPrice(blockId) {
    return this.sendJsonRpc("gas_price", [blockId || null]);
  }
  async viewNodeStatus() {
    return this.sendJsonRpc("status", []);
  }
  async viewValidators(blockId) {
    return this.sendJsonRpc("validators", [blockId || null]);
  }
  async viewTransactionStatus(txHash, accountId, waitUntil) {
    const encodedTxHash = typeof txHash === "string" ? txHash : baseEncode(txHash);
    return this.sendJsonRpc("tx", {
      tx_hash: encodedTxHash,
      sender_account_id: accountId,
      wait_until: waitUntil
    });
  }
  async viewTransactionStatusWithReceipts(txHash, accountId, waitUntil) {
    const encodedTxHash = typeof txHash === "string" ? txHash : baseEncode(txHash);
    return this.sendJsonRpc("EXPERIMENTAL_tx_status", {
      tx_hash: encodedTxHash,
      sender_account_id: accountId,
      wait_until: waitUntil
    });
  }
  async viewTransactionReceipt(receiptId) {
    return this.sendJsonRpc("EXPERIMENTAL_receipt", {
      receipt_id: receiptId
    });
  }
  /**
   * Gets the RPC's status
   * @see [https://docs.near.org/docs/develop/front-end/rpc#general-validator-status](https://docs.near.org/docs/develop/front-end/rpc#general-validator-status)
   */
  async status() {
    return this.sendJsonRpc("status", []);
  }
  /**
   * Sends a signed transaction to the RPC
   *
   * @param signedTransaction The signed transaction being sent
   * @param waitUntil
   */
  async sendTransactionUntil(signedTransaction, waitUntil) {
    const bytes = encodeTransaction(signedTransaction);
    return this.sendJsonRpc("send_tx", { signed_tx_base64: Buffer.from(bytes).toString("base64"), wait_until: waitUntil });
  }
  /**
   * Sends a signed transaction to the RPC and waits until transaction is fully complete
   * @see [https://docs.near.org/docs/develop/front-end/rpc#send-transaction-await](https://docs.near.org/docs/develop/front-end/rpc#general-validator-status)
   *
   * @param signedTransaction The signed transaction being sent
   */
  async sendTransaction(signedTransaction) {
    return this.sendTransactionUntil(signedTransaction, "EXECUTED_OPTIMISTIC");
  }
  /**
   * Sends a signed transaction to the RPC and immediately returns transaction hash
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#send-transaction-async)
   * @param signedTransaction The signed transaction being sent
   * @returns {Promise<FinalExecutionOutcome>}
   */
  async sendTransactionAsync(signedTransaction) {
    return this.sendTransactionUntil(signedTransaction, "NONE");
  }
  /**
   * Gets a transaction's status from the RPC
   * @see [https://docs.near.org/docs/develop/front-end/rpc#transaction-status](https://docs.near.org/docs/develop/front-end/rpc#general-validator-status)
   *
   * @param txHash A transaction hash as either a Uint8Array or a base58 encoded string
   * @param accountId The NEAR account that signed the transaction
   * @param waitUntil
   */
  async txStatus(txHash, accountId, waitUntil = "EXECUTED_OPTIMISTIC") {
    if (typeof txHash === "string") {
      return this.txStatusString(txHash, accountId, waitUntil);
    } else {
      return this.txStatusUint8Array(txHash, accountId, waitUntil);
    }
  }
  async txStatusUint8Array(txHash, accountId, waitUntil) {
    return this.sendJsonRpc("tx", { tx_hash: baseEncode(txHash), sender_account_id: accountId, wait_until: waitUntil });
  }
  async txStatusString(txHash, accountId, waitUntil) {
    return this.sendJsonRpc("tx", { tx_hash: txHash, sender_account_id: accountId, wait_until: waitUntil });
  }
  /**
   * Gets a transaction's status from the RPC with receipts
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#transaction-status-with-receipts)
   * @param txHash The hash of the transaction
   * @param accountId The NEAR account that signed the transaction
   * @param waitUntil
   * @returns {Promise<FinalExecutionOutcome>}
   */
  async txStatusReceipts(txHash, accountId, waitUntil = "EXECUTED_OPTIMISTIC") {
    if (typeof txHash === "string") {
      return this.sendJsonRpc("EXPERIMENTAL_tx_status", { tx_hash: txHash, sender_account_id: accountId, wait_until: waitUntil });
    } else {
      return this.sendJsonRpc("EXPERIMENTAL_tx_status", { tx_hash: baseEncode(txHash), sender_account_id: accountId, wait_until: waitUntil });
    }
  }
  /**
   * Query the RPC by passing an {@link "@near-js/types".provider/request.RpcQueryRequest | RpcQueryRequest }
   * @see [https://docs.near.org/api/rpc/contracts](https://docs.near.org/api/rpc/contracts)
   *
   * @typeParam T the shape of the returned query response
   */
  async query(...args) {
    let result;
    if (args.length === 1) {
      const { block_id, blockId, ...otherParams } = args[0];
      result = await this.sendJsonRpc("query", { ...otherParams, block_id: block_id || blockId });
    } else {
      const [path, data] = args;
      result = await this.sendJsonRpc("query", [path, data]);
    }
    if (result && result.error) {
      throw new TypedError(
        `Querying failed: ${result.error}.
${JSON.stringify(result, null, 2)}`,
        getErrorTypeFromErrorMessage(result.error, result.error.name)
      );
    }
    return result;
  }
  /**
   * Query for block info from the RPC
   * pass block_id OR finality as blockQuery, not both
   * @see [https://docs.near.org/api/rpc/block-chunk](https://docs.near.org/api/rpc/block-chunk)
   *
   * @param blockQuery {@link BlockReference} (passing a {@link BlockId} is deprecated)
   */
  async block(blockQuery) {
    const { finality } = blockQuery;
    const { blockId } = blockQuery;
    return this.sendJsonRpc("block", { block_id: blockId, finality });
  }
  /**
   * Query changes in block from the RPC
   * pass block_id OR finality as blockQuery, not both
   * @see [https://docs.near.org/api/rpc/block-chunk](https://docs.near.org/api/rpc/block-chunk)
   */
  async blockChanges(blockQuery) {
    const { finality } = blockQuery;
    const { blockId } = blockQuery;
    return this.sendJsonRpc("EXPERIMENTAL_changes_in_block", { block_id: blockId, finality });
  }
  /**
   * Queries for details about a specific chunk appending details of receipts and transactions to the same chunk data provided by a block
   * @see [https://docs.near.org/api/rpc/block-chunk](https://docs.near.org/api/rpc/block-chunk)
   *
   * @param chunkId Hash of a chunk ID or shard ID
   */
  async chunk(chunkId) {
    return this.sendJsonRpc("chunk", [chunkId]);
  }
  /**
   * Query validators of the epoch defined by the given block id.
   * @see [https://docs.near.org/api/rpc/network#validation-status](https://docs.near.org/api/rpc/network#validation-status)
   *
   * @param blockId Block hash or height, or null for latest.
   */
  async validators(blockId) {
    return this.sendJsonRpc("validators", [blockId]);
  }
  /**
   * Gets the protocol config at a block from RPC
   *
   * @param blockReference specifies the block to get the protocol config for
   */
  async experimental_protocolConfig(blockReference) {
    const { blockId, ...otherParams } = blockReference;
    return await this.sendJsonRpc("EXPERIMENTAL_protocol_config", { ...otherParams, block_id: blockId });
  }
  /**
   * Gets a light client execution proof for verifying execution outcomes
   * @see [https://github.com/nearprotocol/NEPs/blob/master/specs/ChainSpec/LightClient.md#light-client-proof](https://github.com/nearprotocol/NEPs/blob/master/specs/ChainSpec/LightClient.md#light-client-proof)
   */
  async lightClientProof(request) {
    return await this.sendJsonRpc("EXPERIMENTAL_light_client_proof", request);
  }
  /**
   * Returns the next light client block as far in the future as possible from the last known hash
   * to still be able to validate from that hash. This will either return the last block of the
   * next epoch, or the last final known block.
   * 
   * @see [https://github.com/near/NEPs/blob/master/specs/ChainSpec/LightClient.md#light-client-block](https://github.com/near/NEPs/blob/master/specs/ChainSpec/LightClient.md#light-client-block)
   */
  async nextLightClientBlock(request) {
    return await this.sendJsonRpc("next_light_client_block", request);
  }
  /**
   * Gets access key changes for a given array of accountIds
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-access-key-changes-all)
   * @returns {Promise<ChangeResult>}
   */
  async accessKeyChanges(accountIdArray, blockQuery) {
    const { finality } = blockQuery;
    const { blockId } = blockQuery;
    return this.sendJsonRpc("EXPERIMENTAL_changes", {
      changes_type: "all_access_key_changes",
      account_ids: accountIdArray,
      block_id: blockId,
      finality
    });
  }
  /**
   * Gets single access key changes for a given array of access keys
   * pass block_id OR finality as blockQuery, not both
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-access-key-changes-single)
   * @returns {Promise<ChangeResult>}
   */
  async singleAccessKeyChanges(accessKeyArray, blockQuery) {
    const { finality } = blockQuery;
    const { blockId } = blockQuery;
    return this.sendJsonRpc("EXPERIMENTAL_changes", {
      changes_type: "single_access_key_changes",
      keys: accessKeyArray,
      block_id: blockId,
      finality
    });
  }
  /**
   * Gets account changes for a given array of accountIds
   * pass block_id OR finality as blockQuery, not both
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-account-changes)
   * @returns {Promise<ChangeResult>}
   */
  async accountChanges(accountIdArray, blockQuery) {
    const { finality } = blockQuery;
    const { blockId } = blockQuery;
    return this.sendJsonRpc("EXPERIMENTAL_changes", {
      changes_type: "account_changes",
      account_ids: accountIdArray,
      block_id: blockId,
      finality
    });
  }
  /**
   * Gets contract state changes for a given array of accountIds
   * pass block_id OR finality as blockQuery, not both
   * Note: If you pass a keyPrefix it must be base64 encoded
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-contract-state-changes)
   * @returns {Promise<ChangeResult>}
   */
  async contractStateChanges(accountIdArray, blockQuery, keyPrefix = "") {
    const { finality } = blockQuery;
    const { blockId } = blockQuery;
    return this.sendJsonRpc("EXPERIMENTAL_changes", {
      changes_type: "data_changes",
      account_ids: accountIdArray,
      key_prefix_base64: keyPrefix,
      block_id: blockId,
      finality
    });
  }
  /**
   * Gets contract code changes for a given array of accountIds
   * pass block_id OR finality as blockQuery, not both
   * Note: Change is returned in a base64 encoded WASM file
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-contract-code-changes)
   * @returns {Promise<ChangeResult>}
   */
  async contractCodeChanges(accountIdArray, blockQuery) {
    const { finality } = blockQuery;
    const { blockId } = blockQuery;
    return this.sendJsonRpc("EXPERIMENTAL_changes", {
      changes_type: "contract_code_changes",
      account_ids: accountIdArray,
      block_id: blockId,
      finality
    });
  }
  /**
   * Returns gas price for a specific block_height or block_hash.
   * @see [https://docs.near.org/api/rpc/gas](https://docs.near.org/api/rpc/gas)
   *
   * @param blockId Block hash or height, or null for latest.
   */
  async gasPrice(blockId) {
    return await this.sendJsonRpc("gas_price", [blockId]);
  }
  /**
   * Directly call the RPC specifying the method and params
   *
   * @param method RPC method
   * @param params Parameters to the method
   */
  async sendJsonRpc(method, params) {
    var _a;
    const request = {
      method,
      params,
      id: _nextId++,
      jsonrpc: "2.0"
    };
    const response = await fetchJsonRpc(this.connection.url, request, this.connection.headers || {}, retryConfig(this.options.retries, this.options.backoff, this.options.wait));
    if (response.error) {
      if (typeof response.error.data === "object") {
        if (typeof response.error.data.error_message === "string" && typeof response.error.data.error_type === "string") {
          throw new TypedError(response.error.data.error_message, response.error.data.error_type);
        }
        throw parseRpcError(response.error.data);
      } else {
        const errorMessage = `[${response.error.code}] ${response.error.message}: ${response.error.data}`;
        const errorType = getErrorTypeFromErrorMessage(response.error.data, "");
        if (errorType) {
          throw new TypedError(formatError(errorType, params), errorType);
        }
        throw new TypedError(errorMessage, response.error.name);
      }
    } else if (typeof ((_a = response.result) == null ? void 0 : _a.error) === "string") {
      const errorType = getErrorTypeFromErrorMessage(response.result.error, "");
      if (errorType) {
        throw new ServerError(formatError(errorType, params), errorType);
      }
    }
    const { result } = response;
    if (typeof result === "undefined") {
      throw new TypedError(
        `Exceeded ${this.options.retries} attempts for request to ${method}.`,
        "RetriesExceeded"
      );
    }
    return result;
  }
};

// node_modules/.pnpm/@near-js+providers@2.3.1_@near-js+crypto@2.5.1_@near-js+types@2.5.1_@near-js+utils@2.5._8beaf24dd0d5651280e031a432876619/node_modules/@near-js/providers/lib/esm/failover-rpc-provider.js
var import_dist10 = __toESM(require_dist(), 1);
var import_dist11 = __toESM(require_dist2(), 1);
var import_dist12 = __toESM(require_dist3(), 1);
var FailoverRpcProvider = class {
  /**
   * @param providers list of providers
   */
  constructor(providers) {
    /** @hidden */
    __publicField(this, "providers");
    __publicField(this, "currentProviderIndex");
    if (providers.length === 0) {
      throw new Error("At least one provider must be specified");
    }
    this.providers = providers;
    this.currentProviderIndex = 0;
  }
  switchToNextProvider() {
    if (this.providers.length === 1) return;
    if (this.providers.length - 1 <= this.currentProviderIndex) {
      this.currentProviderIndex = 0;
    } else {
      this.currentProviderIndex += 1;
    }
    Logger.debug(
      `Switched to provider at the index ${this.currentProviderIndex}`
    );
  }
  get currentProvider() {
    const provider = this.providers[this.currentProviderIndex];
    if (!provider)
      throw new Error(
        `Provider wasn't found at index ${this.currentProviderIndex}`
      );
    return provider;
  }
  async withBackoff(getResult) {
    for (let i = 0; i < this.providers.length; i++) {
      try {
        const result = await getResult(this.currentProvider);
        if (result) return result;
      } catch (e) {
        console.error(e);
        this.switchToNextProvider();
      }
    }
    throw new TypedError(
      `Exceeded ${this.providers.length} providers to execute request`,
      "RetriesExceeded"
    );
  }
  /**
   * Gets the RPC's status
   * @see [https://docs.near.org/docs/develop/front-end/rpc#general-validator-status](https://docs.near.org/docs/develop/front-end/rpc#general-validator-status)
   */
  async status() {
    return this.withBackoff((currentProvider) => currentProvider.status());
  }
  async getNetworkId() {
    return this.withBackoff((currentProvider) => currentProvider.getNetworkId());
  }
  async getCurrentEpochSeatPrice() {
    return this.withBackoff((currentProvider) => currentProvider.getCurrentEpochSeatPrice());
  }
  async getNextEpochSeatPrice() {
    return this.withBackoff((currentProvider) => currentProvider.getNextEpochSeatPrice());
  }
  async viewAccessKey(accountId, publicKey, finalityQuery) {
    return this.withBackoff((currentProvider) => currentProvider.viewAccessKey(accountId, publicKey, finalityQuery));
  }
  async viewAccessKeyList(accountId, finalityQuery) {
    return this.withBackoff((currentProvider) => currentProvider.viewAccessKeyList(accountId, finalityQuery));
  }
  async viewAccount(accountId, blockQuery) {
    return this.withBackoff((currentProvider) => currentProvider.viewAccount(accountId, blockQuery));
  }
  async viewContractCode(accountId, blockQuery) {
    return this.withBackoff((currentProvider) => currentProvider.viewContractCode(accountId, blockQuery));
  }
  async viewContractState(accountId, prefix, blockQuery) {
    return this.withBackoff((currentProvider) => currentProvider.viewContractState(accountId, prefix, blockQuery));
  }
  async callFunction(accountId, method, args, blockQuery) {
    return this.withBackoff((currentProvider) => currentProvider.callFunction(accountId, method, args, blockQuery));
  }
  async callFunctionRaw(accountId, method, args, blockQuery) {
    return this.withBackoff((currentProvider) => currentProvider.callFunctionRaw(accountId, method, args, blockQuery));
  }
  async viewBlock(blockQuery) {
    return this.withBackoff((currentProvider) => currentProvider.viewBlock(blockQuery));
  }
  async viewChunk(chunkId) {
    return this.withBackoff((currentProvider) => currentProvider.viewChunk(chunkId));
  }
  async viewGasPrice(blockId) {
    return this.withBackoff((currentProvider) => currentProvider.viewGasPrice(blockId));
  }
  async viewNodeStatus() {
    return this.withBackoff((currentProvider) => currentProvider.viewNodeStatus());
  }
  async viewValidators(blockId) {
    return this.withBackoff((currentProvider) => currentProvider.viewValidators(blockId));
  }
  async viewTransactionStatus(txHash, accountId, waitUntil) {
    return this.withBackoff((currentProvider) => currentProvider.viewTransactionStatus(txHash, accountId, waitUntil));
  }
  async viewTransactionStatusWithReceipts(txHash, accountId, waitUntil) {
    return this.withBackoff((currentProvider) => currentProvider.viewTransactionStatusWithReceipts(txHash, accountId, waitUntil));
  }
  async viewTransactionReceipt(receiptId) {
    return this.withBackoff((currentProvider) => currentProvider.viewTransactionReceipt(receiptId));
  }
  async sendTransactionUntil(signedTransaction, waitUntil) {
    return this.withBackoff((currentProvider) => currentProvider.sendTransactionUntil(signedTransaction, waitUntil));
  }
  /**
   * Sends a signed transaction to the RPC and waits until transaction is fully complete
   * @see [https://docs.near.org/docs/develop/front-end/rpc#send-transaction-await](https://docs.near.org/docs/develop/front-end/rpc#general-validator-status)
   *
   * @param signedTransaction The signed transaction being sent
   */
  async sendTransaction(signedTransaction) {
    return this.withBackoff(
      (currentProvider) => currentProvider.sendTransaction(signedTransaction)
    );
  }
  /**
   * Sends a signed transaction to the RPC and immediately returns transaction hash
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#send-transaction-async)
   * @param signedTransaction The signed transaction being sent
   * @returns {Promise<FinalExecutionOutcome>}
   */
  async sendTransactionAsync(signedTransaction) {
    return this.withBackoff(
      (currentProvider) => currentProvider.sendTransactionAsync(signedTransaction)
    );
  }
  /**
   * Gets a transaction's status from the RPC
   * @see [https://docs.near.org/docs/develop/front-end/rpc#transaction-status](https://docs.near.org/docs/develop/front-end/rpc#general-validator-status)
   *
   * @param txHash A transaction hash as either a Uint8Array or a base58 encoded string
   * @param accountId The NEAR account that signed the transaction
   */
  async txStatus(txHash, accountId, waitUntil) {
    return this.withBackoff(
      (currentProvider) => currentProvider.txStatus(txHash, accountId, waitUntil)
    );
  }
  /**
   * Gets a transaction's status from the RPC with receipts
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#transaction-status-with-receipts)
   * @param txHash The hash of the transaction
   * @param accountId The NEAR account that signed the transaction
   * @returns {Promise<FinalExecutionOutcome>}
   */
  async txStatusReceipts(txHash, accountId, waitUntil) {
    return this.withBackoff(
      (currentProvider) => currentProvider.txStatusReceipts(txHash, accountId, waitUntil)
    );
  }
  async query(paramsOrPath, data) {
    if (data) {
      return this.withBackoff(
        (currentProvider) => currentProvider.query(paramsOrPath, data)
      );
    }
    return this.withBackoff(
      (currentProvider) => currentProvider.query(paramsOrPath)
    );
  }
  /**
   * Query for block info from the RPC
   * pass block_id OR finality as blockQuery, not both
   * @see [https://docs.near.org/api/rpc/block-chunk](https://docs.near.org/api/rpc/block-chunk)
   *
   * @param blockQuery {@link BlockReference} (passing a {@link BlockId} is deprecated)
   */
  async block(blockQuery) {
    return this.withBackoff((currentProvider) => currentProvider.block(blockQuery));
  }
  /**
   * Query changes in block from the RPC
   * pass block_id OR finality as blockQuery, not both
   * @see [https://docs.near.org/api/rpc/block-chunk](https://docs.near.org/api/rpc/block-chunk)
   */
  async blockChanges(blockQuery) {
    return this.withBackoff(
      (currentProvider) => currentProvider.blockChanges(blockQuery)
    );
  }
  /**
   * Queries for details about a specific chunk appending details of receipts and transactions to the same chunk data provided by a block
   * @see [https://docs.near.org/api/rpc/block-chunk](https://docs.near.org/api/rpc/block-chunk)
   *
   * @param chunkId Hash of a chunk ID or shard ID
   */
  async chunk(chunkId) {
    return this.withBackoff((currentProvider) => currentProvider.chunk(chunkId));
  }
  /**
   * Query validators of the epoch defined by the given block id.
   * @see [https://docs.near.org/api/rpc/network#validation-status](https://docs.near.org/api/rpc/network#validation-status)
   *
   * @param blockId Block hash or height, or null for latest.
   */
  async validators(blockId) {
    return this.withBackoff((currentProvider) => currentProvider.validators(blockId));
  }
  /**
   * Gets the protocol config at a block from RPC
   *
   * @param blockReference specifies the block to get the protocol config for
   */
  async experimental_protocolConfig(blockReference) {
    return this.withBackoff(
      (currentProvider) => currentProvider.experimental_protocolConfig(blockReference)
    );
  }
  /**
   * Gets a light client execution proof for verifying execution outcomes
   * @see [https://github.com/nearprotocol/NEPs/blob/master/specs/ChainSpec/LightClient.md#light-client-proof](https://github.com/nearprotocol/NEPs/blob/master/specs/ChainSpec/LightClient.md#light-client-proof)
   */
  async lightClientProof(request) {
    return this.withBackoff(
      (currentProvider) => currentProvider.lightClientProof(request)
    );
  }
  /**
   * Returns the next light client block as far in the future as possible from the last known hash
   * to still be able to validate from that hash. This will either return the last block of the
   * next epoch, or the last final known block.
   *
   * @see [https://github.com/near/NEPs/blob/master/specs/ChainSpec/LightClient.md#light-client-block](https://github.com/near/NEPs/blob/master/specs/ChainSpec/LightClient.md#light-client-block)
   */
  async nextLightClientBlock(request) {
    return this.withBackoff(
      (currentProvider) => currentProvider.nextLightClientBlock(request)
    );
  }
  /**
   * Gets access key changes for a given array of accountIds
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-access-key-changes-all)
   * @returns {Promise<ChangeResult>}
   */
  async accessKeyChanges(accountIdArray, blockQuery) {
    return this.withBackoff(
      (currentProvider) => currentProvider.accessKeyChanges(accountIdArray, blockQuery)
    );
  }
  /**
   * Gets single access key changes for a given array of access keys
   * pass block_id OR finality as blockQuery, not both
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-access-key-changes-single)
   * @returns {Promise<ChangeResult>}
   */
  async singleAccessKeyChanges(accessKeyArray, blockQuery) {
    return this.withBackoff(
      (currentProvider) => currentProvider.singleAccessKeyChanges(
        accessKeyArray,
        blockQuery
      )
    );
  }
  /**
   * Gets account changes for a given array of accountIds
   * pass block_id OR finality as blockQuery, not both
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-account-changes)
   * @returns {Promise<ChangeResult>}
   */
  async accountChanges(accountIdArray, blockQuery) {
    return this.withBackoff(
      (currentProvider) => currentProvider.accountChanges(accountIdArray, blockQuery)
    );
  }
  /**
   * Gets contract state changes for a given array of accountIds
   * pass block_id OR finality as blockQuery, not both
   * Note: If you pass a keyPrefix it must be base64 encoded
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-contract-state-changes)
   * @returns {Promise<ChangeResult>}
   */
  async contractStateChanges(accountIdArray, blockQuery, keyPrefix = "") {
    return this.withBackoff(
      (currentProvider) => currentProvider.contractStateChanges(
        accountIdArray,
        blockQuery,
        keyPrefix
      )
    );
  }
  /**
   * Gets contract code changes for a given array of accountIds
   * pass block_id OR finality as blockQuery, not both
   * Note: Change is returned in a base64 encoded WASM file
   * See [docs for more info](https://docs.near.org/docs/develop/front-end/rpc#view-contract-code-changes)
   * @returns {Promise<ChangeResult>}
   */
  async contractCodeChanges(accountIdArray, blockQuery) {
    return this.withBackoff(
      (currentProvider) => currentProvider.contractCodeChanges(accountIdArray, blockQuery)
    );
  }
  /**
   * Returns gas price for a specific block_height or block_hash.
   * @see [https://docs.near.org/api/rpc/gas](https://docs.near.org/api/rpc/gas)
   *
   * @param blockId Block hash or height, or null for latest.
   */
  async gasPrice(blockId) {
    return this.withBackoff((currentProvider) => currentProvider.gasPrice(blockId));
  }
};

export {
  exponentialBackoff,
  JsonRpcProvider,
  FailoverRpcProvider
};
//# sourceMappingURL=chunk-KCNXEWPD.js.map
