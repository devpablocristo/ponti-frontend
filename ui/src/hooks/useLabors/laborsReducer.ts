import React from "react";

import * as actions from "./actions";
import { LaborGroupData, LaborInfo, Metrics } from "./types";
import { PageInfo } from "../useDatabase/projects/types";

interface LaborState {
  laborGroups: LaborGroupData[];
  labors: LaborInfo[];
  metrics: Metrics;
  processing: boolean;
  error: string;
  result: string;
  resultInvoice: string;
  pageInfo: PageInfo | null;
}

const initialState: LaborState = {
  laborGroups: [],
  labors: [],
  metrics: {
    surface_ha: 0,
    avg_cost_per_ha: 0,
    net_total_cost: 0,
  },
  processing: false,
  error: "",
  result: "",
  resultInvoice: "",
  pageInfo: null,
};

type Action =
  | { type: typeof actions.SET_LABOR_GROUPS; payload: LaborGroupData[] }
  | { type: typeof actions.SET_PAGE_INFO; payload: PageInfo }
  | { type: typeof actions.SET_RESULT; payload: string }
  | { type: typeof actions.SET_LABORS; payload: LaborInfo[] }
  | { type: typeof actions.SET_RESULT_INVOICE; payload: string }
  | { type: typeof actions.SET_METRICS; payload: Metrics };

const laborsReducer = (state: typeof initialState, action: Action) => {
  switch (action.type) {
    case actions.SET_PAGE_INFO:
      return {
        ...state,
        pageInfo: action.payload,
      };
    case actions.SET_LABOR_GROUPS:
      return {
        ...state,
        laborGroups: action.payload,
      };
    case actions.SET_LABORS:
      return {
        ...state,
        labors: action.payload,
      };
    case actions.SET_RESULT:
      return {
        ...state,
        result: action.payload,
      };
    case actions.SET_RESULT_INVOICE:
      return {
        ...state,
        resultInvoice: action.payload,
      };
    case actions.SET_METRICS:
      return {
        ...state,
        metrics: action.payload,
      };
    default:
      return state;
  }
};

const useLaborReducer = () => React.useReducer(laborsReducer, initialState);

export default useLaborReducer;
