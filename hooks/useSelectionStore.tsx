import { selection_store, type SelectionStoreState } from "@illusive/stores/selection_store";
import { useStore } from "zustand";

export default function useSelectionStore<T>(selector: (state: SelectionStoreState) => T): T {
	return useStore(selection_store, selector);
}
