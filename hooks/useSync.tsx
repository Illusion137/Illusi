// app/sync-provider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { NetworkMonitor } from "@illusive/db/sync/network_monitor";
import { supabase } from "@illusive/db/supabase";
import { SyncEngine } from "@illusive/db/sync/sync_engine";

const SyncContext = createContext<{
	sync_engine: SyncEngine | null;
	is_initialized: boolean;
	sync: () => Promise<void>;
}>({
	sync_engine: null,
	is_initialized: false,
	sync: async () => {
		return;
	}
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [sync_engine, setSyncEngine] = useState<SyncEngine | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		const network_monitor = NetworkMonitor.get_instance();
		const engine = new SyncEngine(supabase, network_monitor);

		engine.initialize().then(() => {
			setSyncEngine(engine);
			setIsInitialized(true);
		});

		return () => engine.destroy();
	}, []);

	const sync = async () => {
		if (sync_engine) {
			await sync_engine.sync();
		}
	};

	return <SyncContext.Provider value={{ sync_engine: sync_engine, is_initialized: isInitialized, sync }}>{children}</SyncContext.Provider>;
};

export const useSync = () => useContext(SyncContext);
