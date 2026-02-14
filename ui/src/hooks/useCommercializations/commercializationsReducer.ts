import React from "react";
import { CommercializationInfoData } from "./types";
import * as actions from "./actions";

interface CommercializationState {
  result: string;
  commercializations: CommercializationInfoData[];
}

const initialState: CommercializationState = {
  result: "",
  commercializations: [],
};

type Action =
  | { type: typeof actions.SET_RESULT; payload: string }
  | {
      type: typeof actions.SET_COMMERCIALIZATIONS;
      payload: CommercializationInfoData[];
    };

const commercializationsReducer = (state: typeof initialState, action: Action) => {
  switch (action.type) {
    case actions.SET_RESULT:
      return {
        ...state,
        result: action.payload,
      };
    case actions.SET_COMMERCIALIZATIONS:
      return {
        ...state,
        commercializations: action.payload,
      };
    default:
      return state;
  }
};

const useCommercializationsReducer = () =>
  React.useReducer(commercializationsReducer, initialState);

export default useCommercializationsReducer;
