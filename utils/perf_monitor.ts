import { AppState } from "react-native";
import * as Sentry from "@sentry/react-native";
import * as Battery from "expo-battery";

const SAMPLE_INTERVAL_MS = 2000;
// Firing this much later than scheduled implies roughly this many ms of blocked JS.
const LAG_THRESHOLD_MS = 1500;
// Larger than this is a background suspend / debugger pause, not real saturation.
const BACKGROUND_GAP_MS = 30000;
// Require several bad samples in a row so a one-off GC / nav spike doesn't report.
const CONSECUTIVE_BAD_SAMPLES = 3;
// Don't report more than once per this window.
const REPORT_COOLDOWN_MS = 5 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;
let last_tick = 0;
let consecutive_bad = 0;
let worst_lag = 0;
let last_report = 0;
let context_provider: (() => Record<string, unknown>) | null = null;

function reset_streak() {
	consecutive_bad = 0;
	worst_lag = 0;
}

// Lets callers attach live app context (route, what's playing, etc.) to a report.
export function set_perf_context_provider(provider: () => Record<string, unknown>) {
	context_provider = provider;
}

export function start_perf_monitor() {
	if (timer !== null) return;
	last_tick = Date.now();
	timer = setInterval(() => {
		const now = Date.now();
		const lag = now - last_tick - SAMPLE_INTERVAL_MS;
		last_tick = now;

		// Ignore samples taken across a suspend/resume — the timer is throttled while
		// backgrounded and the catch-up tick would look like a huge fake stall.
		if (AppState.currentState !== "active" || lag > BACKGROUND_GAP_MS) {
			reset_streak();
			return;
		}

		if (lag < LAG_THRESHOLD_MS) {
			reset_streak();
			return;
		}

		consecutive_bad++;
		worst_lag = Math.max(worst_lag, lag);
		if (consecutive_bad < CONSECUTIVE_BAD_SAMPLES || now - last_report < REPORT_COOLDOWN_MS) return;

		last_report = now;
		const extra = {
			worst_lag_ms: Math.round(worst_lag),
			sample_interval_ms: SAMPLE_INTERVAL_MS,
			consecutive_bad,
			js_heap_used_mb: js_heap_used_mb(),
			...(context_provider?.() ?? {})
		};
		if (__DEV__) {
			console.warn(`[perf] sustained JS-thread saturation (worst ${Math.round(worst_lag)}ms over ${SAMPLE_INTERVAL_MS}ms)`, extra);
		} else {
			Sentry.captureMessage("Sustained JS thread saturation", { level: "warning", tags: { perf: "js_thread_lag" }, extra });
		}
		reset_streak();
	}, SAMPLE_INTERVAL_MS);
}

export function stop_perf_monitor() {
	if (timer !== null) {
		clearInterval(timer);
		timer = null;
	}
	reset_streak();
	last_report = 0;
}

// Hermes exposes performance.memory with usedJSHeapSize (bytes). Absent on other
// engines — returns null so callers can omit the field rather than report 0.
function js_heap_used_mb(): number | null {
	const mem = (performance as { memory?: { usedJSHeapSize?: number } }).memory;
	if (!mem?.usedJSHeapSize) return null;
	return Math.round((mem.usedJSHeapSize / 1024 / 1024) * 10) / 10;
}

// Samples the JS heap periodically and keeps the latest reading on the Sentry
// scope so any crash or perf event carries the approximate heap size at the time.
const HEAP_SAMPLE_INTERVAL_MS = 15000;
let heap_timer: ReturnType<typeof setInterval> | null = null;
let last_heap_mb: number | null = null;
const HEAP_WARN_MB = 350; // alert if the JS heap alone exceeds this
const HEAP_COOLDOWN_MS = 10 * 60 * 1000;
let heap_last_warn = 0;

export function start_heap_monitor() {
	if (heap_timer !== null) return;
	heap_timer = setInterval(() => {
		if (AppState.currentState !== "active") return;
		const mb = js_heap_used_mb();
		if (mb === null) return;
		last_heap_mb = mb;
		Sentry.setTag("js_heap_mb", String(Math.round(mb)));
		const now = Date.now();
		if (!__DEV__ && mb > HEAP_WARN_MB && now - heap_last_warn > HEAP_COOLDOWN_MS) {
			heap_last_warn = now;
			Sentry.captureMessage("JS heap unusually large", {
				level: "warning",
				tags: { perf: "js_heap" },
				extra: { heap_used_mb: mb, ...(context_provider?.() ?? {}) }
			});
		}
	}, HEAP_SAMPLE_INTERVAL_MS);
}

export function stop_heap_monitor() {
	if (heap_timer !== null) {
		clearInterval(heap_timer);
		heap_timer = null;
	}
}

export function current_heap_mb(): number | null { return last_heap_mb; }

let low_power_sub: { remove: () => void } | null = null;
let battery_level_sub: { remove: () => void } | null = null;
let battery_sample_ts = 0;
let battery_sample_level = -1;

export function start_thermal_monitor() {
	low_power_sub?.remove();
	battery_level_sub?.remove();

	low_power_sub = Battery.addLowPowerModeListener(({ lowPowerMode }) => {
		Sentry.setTag("low_power_mode", String(lowPowerMode));
		if (!lowPowerMode) return;
		const extra = { ...(context_provider?.() ?? {}), js_heap_mb: js_heap_used_mb() };
		Sentry.addBreadcrumb({ message: "Low Power Mode activated", category: "perf", level: "warning", data: extra });
		if (!__DEV__) {
			Sentry.captureMessage("Low Power Mode activated during playback", {
				level: "warning",
				tags: { perf: "low_power_mode" },
				extra
			});
		} else {
			console.warn("[perf] Low Power Mode activated", extra);
		}
	});

	// Track battery drain rate — > 2% / min during active use suggests heavy CPU/GPU load.
	battery_sample_ts = 0;
	battery_sample_level = -1;
	battery_level_sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
		if (AppState.currentState !== "active") return;
		const now = Date.now();
		if (battery_sample_ts > 0 && battery_sample_level > 0) {
			const elapsed_min = (now - battery_sample_ts) / 60000;
			const drain_pct_per_min = ((battery_sample_level - batteryLevel) * 100) / elapsed_min;
			if (drain_pct_per_min > 2 && elapsed_min > 2) {
				const extra = { drain_pct_per_min: Math.round(drain_pct_per_min * 10) / 10, elapsed_min: Math.round(elapsed_min), ...(context_provider?.() ?? {}) };
				Sentry.addBreadcrumb({ message: "High battery drain rate", category: "perf", level: "warning", data: extra });
				if (!__DEV__) {
					Sentry.captureMessage("High battery drain rate during playback", {
						level: "warning",
						tags: { perf: "battery_drain" },
						extra
					});
				} else {
					console.warn("[perf] high battery drain", extra);
				}
			}
		}
		battery_sample_ts = now;
		battery_sample_level = batteryLevel;
	});
}

export function stop_thermal_monitor() {
	low_power_sub?.remove();
	low_power_sub = null;
	battery_level_sub?.remove();
	battery_level_sub = null;
}

let memory_warning_count = 0;

export function report_memory_warning() {
	memory_warning_count++;
	const extra = { warning_count: memory_warning_count, ...(context_provider?.() ?? {}) };
	Sentry.addBreadcrumb({ message: "iOS memory warning", category: "perf", level: "warning", data: extra });
	if (!__DEV__ && memory_warning_count >= 2) {
		Sentry.captureMessage("Repeated iOS memory warnings — OOM kill likely", {
			level: "warning",
			tags: { perf: "memory" },
			extra
		});
	} else if (__DEV__) {
		console.warn("[perf] memory warning", extra);
	}
}
