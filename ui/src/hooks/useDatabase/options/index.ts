import React, { useState } from "react";
import { AxiosError } from "axios";

import * as actions from "./actions";
import { apiClient } from "@/api/client";
import { ErrorResponse, SuccessResponse } from "@/api/types";
import { FormOptions } from "./types";
import useOptionsReducer from "./reducer";

const useOptions = () => {
  const [{ options }, dispatch] = useOptionsReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOptions = React.useCallback(async () => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.get<SuccessResponse<FormOptions>>(
        "/form-options"
      );

      if (response.success) {
        dispatch({ type: actions.SET_OPTIONS, payload: response.data });
      } else {
        setError("Failed to load form options.");
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      const message =
        (axiosError.response?.data as ErrorResponse)?.error?.details ||
        "Unexpected error loading form options.";

      setError(message);
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  return {
    options,
    getOptions,
    processing,
    error,
  };
};

export default useOptions;
