// Backward-compatibility shim. The MuAPI client now lives behind the provider
// abstraction as an adapter. New code should import the normalized client:
//   import { ai } from './providers/index.js';
// `muapi` and `MuapiClient` remain exported here so any older importers keep
// working unchanged.
export { muapiAdapter as muapi, MuapiAdapter, MuapiAdapter as MuapiClient } from './providers/muapiAdapter.js';
