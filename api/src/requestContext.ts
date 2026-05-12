import { AsyncLocalStorage } from "async_hooks";

type RequestContextData = {
  authorization?: string;
  tenantId?: string;
  userId?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContextData>();

export const requestContext = {
  run<T>(data: RequestContextData, callback: () => T): T {
    return requestContextStorage.run(data, callback);
  },
  getAuthorization(): string | undefined {
    return requestContextStorage.getStore()?.authorization;
  },
  getTenantId(): string | undefined {
    return requestContextStorage.getStore()?.tenantId;
  },
  setUserId(userId: string): void {
    const store = requestContextStorage.getStore();
    if (store) {
      store.userId = userId;
    }
  },
  getUserId(): string | undefined {
    return requestContextStorage.getStore()?.userId;
  },
};
