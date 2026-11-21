import { JSDOM, VirtualConsole } from "jsdom";
import { BotGuardClient } from "bgutils-js/botguard";
import { USER_AGENT } from "bgutils-js/utils";

{
	const wasmUnsupported = async () =>
		Promise.reject(new Error("WebAssembly not available"));
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
		Exception: wasmUnsupportedSync,
	};
}

const WEB_RESPONSE_CHANNEL = "BOTGUARD_WEB_RESPONSE";
const WEB_PO_SIGNAL_OUTPUT_CHANNEL = "BOTGUARD_WEB_PO_SIGNAL_OUTPUT";
const WEB_PO_MINT_CHANNEL = "BOTGUARD_WEB_PO_MINT";
const SNAPSHOT_TIMEOUT_MS = 10_000;

const handles = new Map();
let handle_counter = 0;

function store_handle(fn) {
	const handle = ++handle_counter;
	handles.set(handle, fn);
	return handle;
}

function get_handle(handle) {
	const fn = handles.get(handle);
	if (typeof fn !== "function")
		throw new Error(`BotGuard handle ${handle} is not available`);
	return fn;
}

async function setup_environment(ytcfg) {
	const dom = new JSDOM(
		'<!DOCTYPE html><html lang="en"><head><title></title></head><body></body></html>',
		{
			url: "https://www.youtube.com",
			referrer: "https://www.youtube.com/",
			userAgent: USER_AGENT,
			resources: "usable",
			runScripts: "dangerously",
			virtualConsole: new VirtualConsole(),
		},
	);

	if (ytcfg) dom.window.yt = { config_: ytcfg };

	Object.assign(globalThis, {
		...(ytcfg ? { yt: dom.window.yt } : {}),
		window: dom.window,
		document: dom.window.document,
		location: dom.window.location,
		origin: dom.window.origin,
	});

	if (!("navigator" in globalThis)) {
		Object.defineProperty(globalThis, "navigator", {
			value: dom.window.navigator,
		});
	}

	Object.defineProperty(
		dom.window.HTMLCanvasElement.prototype,
		"getContext",
		{ value: () => null, writable: true },
	);

	if (dom.window.document.readyState !== "complete") {
		await new Promise((resolve) =>
			dom.window.addEventListener("load", resolve, { once: true }),
		);
	}
}

async function web_response({
	interpreter_javascript,
	program,
	global_name,
	ytcfg,
	content_binding,
	web_po,
}) {
	await setup_environment(ytcfg);

	new Function(interpreter_javascript)();

	const botguard = await BotGuardClient.create({
		program,
		globalName: global_name,
		globalObject: globalThis,
	});

	if (!web_po) {
		return {
			botguard_response: await botguard.snapshot(
				{ contentBinding: content_binding },
				SNAPSHOT_TIMEOUT_MS,
			),
		};
	}

	const web_po_signal_output = [];
	const botguard_response = await botguard.snapshot(
		{ webPoSignalOutput: web_po_signal_output },
		SNAPSHOT_TIMEOUT_MS,
	);

	handles.clear();
	const get_minter = web_po_signal_output[0];
	return {
		botguard_response,
		minter_handle: get_minter ? store_handle(get_minter) : undefined,
	};
}

async function web_po_signal_output({ minter_handle, integrity_token }) {
	const mint_callback = await get_handle(minter_handle)(
		new Uint8Array(integrity_token),
	);
	if (typeof mint_callback !== "function") throw new Error("APF:Failed");
	return store_handle(mint_callback);
}

async function web_po_mint({ mint_handle, content_binding }) {
	const minted = await get_handle(mint_handle)(
		new Uint8Array(content_binding),
	);
	return minted instanceof Uint8Array ? Array.from(minted) : null;
}

function respond(rn_bridge, channel, handler) {
	rn_bridge.channel.on(channel, async ({ request_id, ...payload }) => {
		try {
			rn_bridge.channel.post(channel, {
				request_id,
				result: await handler(payload),
			});
		} catch (error) {
			rn_bridge.channel.post(channel, {
				request_id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});
}

export function register_botguard_solver(rn_bridge) {
	respond(rn_bridge, WEB_RESPONSE_CHANNEL, web_response);
	respond(rn_bridge, WEB_PO_SIGNAL_OUTPUT_CHANNEL, web_po_signal_output);
	respond(rn_bridge, WEB_PO_MINT_CHANNEL, web_po_mint);
}
