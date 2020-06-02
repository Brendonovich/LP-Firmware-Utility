import { useContext } from "react";

import { RootStore, StoreContext } from "../store";
import konami from "./useKonami";

export const useKonami = konami;

export const useStore = <T extends unknown>(
  selector: (store: RootStore) => T
): T => selector(useContext(StoreContext));
