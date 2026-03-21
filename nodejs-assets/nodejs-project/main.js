import { createRequire } from "module";
import { generateContentBoundPoToken } from "./generate_potoken.js";

const require = createRequire(import.meta.url);
const rn_bridge = require("rn-bridge");

// Always stub WebAssembly — Node-mobile's WebAssembly.instantiate hangs
// indefinitely (never resolves/rejects). Throwing lets bgutils-js catch it.
{
	const wasmUnsupported = async () => Promise.reject(new Error("WebAssembly not available"));
	const wasmUnsupportedSync = () => {
		throw new Error("WebAssembly not available");
	};
	globalThis.WebAssembly = {
		instantiate: wasmUnsupported,
		instantiateStreaming: wasmUnsupported,
		compile: wasmUnsupported,
		compileStreaming: wasmUnsupported,
		validate: () => false,
		Module: wasmUnsupportedSync,
		Instance: wasmUnsupportedSync,
		Memory: wasmUnsupportedSync,
		Table: wasmUnsupportedSync,
		Global: wasmUnsupportedSync,
		Tag: wasmUnsupportedSync,
		Exception: wasmUnsupportedSync
	};
}

process.on("uncaughtException", (e) => {
	try {
		rn_bridge.channel.post("potoken", JSON.stringify({ error: `[uncaught] ${e.message}` }));
	} catch (_) {}
});
process.on("unhandledRejection", (reason) => {
	console.error("[unhandled rejection]", String(reason));
});

rn_bridge.channel.on("potoken", async (message) => {
	try {
		const { content_binding, context } = JSON.parse(message);
		if (!content_binding) throw new Error("No content_binding provided");
		if (!context) throw new Error("No context provided");
		const po_token = await generateContentBoundPoToken(content_binding, context);
		rn_bridge.channel.post("potoken", JSON.stringify({ poToken: po_token, identifier: content_binding }));
	} catch (e) {
		console.error("[potoken error]", e.message, e.stack);
		rn_bridge.channel.post("potoken", JSON.stringify({ error: e.message, identifier: JSON.parse(message ?? "{}").content_binding }));
	}
});

rn_bridge.channel.send(`Node was initialized with v${process.version}.`);
