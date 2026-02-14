import React from "react";

import * as actions from "./actions";
import { SupplyData, Supply } from "./types";
import { PageInfo } from "../useDatabase/projects/types";

interface SupplyState {
  supplies: Supply[];
  processing: boolean;
  error: string;
  pageInfo: PageInfo | null;
  result: string;
}

const initialState: SupplyState = {
  supplies: [],
  processing: false,
  error: "",
  pageInfo: null,
  result: "",
};

type Action =
  | { type: typeof actions.SET_PAGE_INFO; payload: PageInfo }
  | { type: typeof actions.SET_RESULT; payload: string }
  | { type: typeof actions.SET_SUPPLIES; payload: Supply[] };

const suppliesReducer = (state: typeof initialState, action: Action) => {
  switch (action.type) {
    case actions.SET_PAGE_INFO:
      return {
        ...state,
        pageInfo: action.payload,
      };
    case actions.SET_RESULT:
      return {
        ...state,
        result: action.payload,
      };
    case actions.SET_SUPPLIES:
      return {
        ...state,
        supplies: action.payload,
      };
    default:
      return state;
  }
};

const useSupplyReducer = () => React.useReducer(suppliesReducer, initialState);

export default useSupplyReducer;
