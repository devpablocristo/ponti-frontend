import { AsyncLocalStorage } from "async_hooks";

type RequestContextData = {
  authorization?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContextData>();

export const requestContext = {
  run<T>(data: RequestContextData, callback: () => T): T {
    return requestContextStorage.run(data, callback);
  },
  getAuthorization(): string | undefined {
    return requestContextStorage.getStore()?.authorization;
  },
};
