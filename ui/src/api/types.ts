export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  error: {
    status: number;
    type?: string;
    message?: string;
    details: string;
    context?: Record<string, unknown>;
  };
}

export interface PageInfo {
  per_page: number;
  page: number;
  max_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data?: T[];
  items?: T[];
  page_info: PageInfo;
}

export class RequestError extends Error {
  private status: number | undefined;

  constructor(status: number | undefined, msg: string) {
    super(msg);
    this.status = status;
    Object.setPrototypeOf(this, RequestError.prototype);
  }

  getStatus(): number | undefined {
    return this.status;
  }
}

export interface Provider {
  id: number;
  name: string;
}

export interface Summary {
  total_kg: number;
  total_lt: number;
  total_usd: number;
}

export interface WorkspaceFilter {
  customer_id?: number;
  project_id?: number;
  campaign_id?: number;
  field_id?: number;
}
