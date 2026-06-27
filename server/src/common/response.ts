export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: any[];
}

export const sendSuccess = <T = any>(res: any, data: T, message = 'Operation successful') => {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(200).json(payload);
};

export const sendError = (res: any, message = 'An error occurred', statusCode = 500, errors: any[] = []) => {
  const payload: ApiErrorResponse = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(payload);
};
