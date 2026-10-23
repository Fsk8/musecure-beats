import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'
globalThis.Buffer = globalThis.Buffer || __buffer_polyfill
import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'
globalThis.global = globalThis.global || __global_polyfill
import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'
globalThis.process = globalThis.process || __process_polyfill

import {
  AccessKey,
  AccessKeyPermission,
  Action,
  AddKey,
  CreateAccount,
  DelegateAction,
  DeleteAccount,
  DeleteKey,
  DeployContract,
  DeployGlobalContract,
  FullAccessPermission,
  FunctionCall,
  FunctionCallPermission,
  GlobalContractDeployMode,
  GlobalContractIdentifier,
  SCHEMA,
  Signature,
  SignedDelegate,
  SignedTransaction,
  Stake,
  Transaction,
  Transfer,
  UseGlobalContract,
  actionCreators,
  buildDelegateAction,
  createTransaction,
  decodeSignedTransaction,
  decodeTransaction,
  encodeDelegateAction,
  encodeSignedDelegate,
  encodeTransaction,
  stringifyJsonOrBytes
} from "./chunk-DC45WWGP.js";
import "./chunk-JSGJPOMW.js";
import "./chunk-LC5MBEXJ.js";
import "./chunk-T4WI34ID.js";
import "./chunk-2QPDYX4J.js";
import "./chunk-ZOOKFV4F.js";
import "./chunk-I4FVBOHE.js";
import "./chunk-J4YCHPKN.js";
import "./chunk-ZJQU6JCY.js";
export {
  AccessKey,
  AccessKeyPermission,
  Action,
  AddKey,
  CreateAccount,
  DelegateAction,
  DeleteAccount,
  DeleteKey,
  DeployContract,
  DeployGlobalContract,
  FullAccessPermission,
  FunctionCall,
  FunctionCallPermission,
  GlobalContractDeployMode,
  GlobalContractIdentifier,
  SCHEMA,
  Signature,
  SignedDelegate,
  SignedTransaction,
  Stake,
  Transaction,
  Transfer,
  UseGlobalContract,
  actionCreators,
  buildDelegateAction,
  createTransaction,
  decodeSignedTransaction,
  decodeTransaction,
  encodeDelegateAction,
  encodeSignedDelegate,
  encodeTransaction,
  stringifyJsonOrBytes
};
//# sourceMappingURL=@near-js_transactions.js.map
