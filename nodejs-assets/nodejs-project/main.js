import { createRequire } from "module";
import { BG, GOOG_API_KEY, USER_AGENT, buildURL } from "bgutils-js";
import { JSDOM } from "jsdom";
import nodeFetch from "node-fetch";

const require = createRequire(import.meta.url);
const rn_bridge = require("rn-bridge");

const requestKey = "O43z0dpjhgX20SCx4KAo";

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

function setup_botguard_environment() {
	if (typeof globalThis.document !== "undefined") return;

	const dom = new JSDOM('<!DOCTYPE html><html lang="en"><head><title></title></head><body></body></html>', {
		url: "https://www.youtube.com/",
		referrer: "https://www.youtube.com/",
		userAgent: USER_AGENT
	});

	Object.assign(globalThis, {
		window: dom.window,
		document: dom.window.document,
		location: dom.window.location,
		origin: dom.window.origin,
		addEventListener: dom.window.addEventListener.bind(dom.window),
		removeEventListener: dom.window.removeEventListener.bind(dom.window),
		dispatchEvent: dom.window.dispatchEvent.bind(dom.window)
	});

	if (!Reflect.has(globalThis, "navigator")) {
		Object.defineProperty(globalThis, "navigator", {
			value: dom.window.navigator
		});
	}

	Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", {
		value: () => null,
		writable: true
	});
}

rn_bridge.channel.on("potoken", async (message) => {
	try {
		const { content_binding, challenge_data } = JSON.parse(message);
		setup_botguard_environment();

		if (!content_binding) throw new Error("No content_binding provided");
		if (!challenge_data) throw new Error("No challenge_data provided");

		const { interpreter_javascript, program, global_name } = challenge_data;

		if (!interpreter_javascript) throw new Error("Could not load VM: no interpreter_javascript");

		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		new Function(interpreter_javascript)();

		const botguard = await BG.BotGuardClient.create({
			program,
			globalName: global_name,
			globalObj: globalThis
		});

		const web_po_signal_output = [];
		const botguard_response = await botguard.snapshot({ webPoSignalOutput: web_po_signal_output });

		const integrity_token_response = await nodeFetch(buildURL("GenerateIT", true), {
			method: "POST",
			headers: {
				"content-type": "application/json+protobuf",
				"x-goog-api-key": GOOG_API_KEY,
				"x-user-agent": "grpc-web-javascript/0.1",
				"user-agent": USER_AGENT
			},
			body: JSON.stringify([requestKey, botguard_response])
		});

		const integrity_token_data = await integrity_token_response.json();

		if (typeof integrity_token_data[0] !== "string") {
			throw new Error("Could not get integrity token");
		}

		const web_po_minter = await BG.WebPoMinter.create({ integrityToken: integrity_token_data[0] }, web_po_signal_output);
		const po_token = await web_po_minter.mintAsWebsafeString(content_binding);

		rn_bridge.channel.post("potoken", JSON.stringify({ poToken: po_token, identifier: content_binding }));
	} catch (e) {
		console.error("[potoken error]", e.message, e.stack);
		rn_bridge.channel.post("potoken", JSON.stringify({ error: e.message, identifier: JSON.parse(message ?? "{}").content_binding }));
	}
});

rn_bridge.channel.send(`Node was initialized with v${process.version}.`);
