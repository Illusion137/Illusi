/**
 * Desktop stub for nodejs-mobile-react-native
 * Provides a no-op implementation for desktop builds
 * On desktop, Node.js worker functionality will be replaced with a real subprocess
 */

class NodejsMobileStub {
	channel = {
		addListener: (event: string, callback: (msg: string) => void) => {
			return () => { }; // return unsubscribe function
		},
		post: (message: string) => {
			console.log("[Node.js Mobile Stub] post called with message:", message);
		},
		send: (message: string) => {
			console.log("[Node.js Mobile Stub] send called with message:", message);
		}
	};

	start(scriptName: string, options?: any) {
		console.log(`[Node.js Mobile Stub] start called with script: ${scriptName} (no-op on desktop)`);
	}

	startEngaged(scriptName: string, options?: any) {
		console.log(`[Node.js Mobile Stub] startEngaged called with script: ${scriptName} (no-op on desktop)`);
	}

	stop() {
		console.log("[Node.js Mobile Stub] stop called (no-op on desktop)");
	}
}

export default new NodejsMobileStub();
