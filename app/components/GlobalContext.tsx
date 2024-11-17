import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import { Track } from "../../../lib-origin/Illusive/src/types";


export interface GlobalStateInterface {
    sql_tracks: Track[]
}
const GlobalStateContext = createContext({
    state: {} as Partial<GlobalStateInterface>,
    set_state: {} as Dispatch<SetStateAction<Partial<GlobalStateInterface>>>,
});

export default function GlobalStateProvider({children, value = {} as GlobalStateInterface}: {children: React.ReactNode, value?: Partial<GlobalStateInterface>}) {
    const [state, set_state] = useState(value);
    return (
        <GlobalStateContext.Provider value={{ state, set_state }}>
            {children}
        </GlobalStateContext.Provider>
    );
};

export const useGlobalState = () => {
    const context = useContext(GlobalStateContext);
    if (!context) {
      throw new Error("useGlobalState must be used within a GlobalStateContext");
    }
    return context;
};