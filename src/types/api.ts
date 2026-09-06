/** Backend response envelope */
export interface ApiResponse<T = unknown> {
  message: string;
  status: number;
  data: T;
}

/** Normalized API error */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}
