import { Request, Response, NextFunction, RequestHandler } from 'express';
import Joi from 'joi';
import ApiError from '../utils/ApiError';

type ValidationTarget = 'body' | 'params' | 'query';

interface ValidationSchemas {
  body?:   Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?:  Joi.ObjectSchema;
}

const VALIDATION_TARGETS: ValidationTarget[] = ['body', 'params', 'query'];

const validate = (schemas: ValidationSchemas): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    for (const target of VALIDATION_TARGETS) {
      const schema = schemas[target];
      if (!schema) continue;

      const { error } = schema.validate(req[target], {
        abortEarly:   true,
        stripUnknown: true,
        convert:      true,
      });

      if (error) {
        const [detail]   = error.details;
        const field      = detail.path.join('.');
        const message    = detail.message.replace(/['"]/g, '');
        const fieldError = { field, message };
        const apiErr     = ApiError.badRequest(message, [fieldError]);
        apiErr.field     = field;
        return next(apiErr);
      }
    }
    next();
  };

export default validate;
