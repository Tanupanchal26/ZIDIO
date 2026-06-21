// @ts-nocheck
const ApiError = require('../utils/ApiError');

/**
 * Validates req.body / req.params / req.query against a Joi schema object.
 *
 * Usage:
 *   router.post('/login', validate({ body: loginSchema }), controller)
 *   router.get('/:id',    validate({ params: idSchema }),  controller)
 */
const validate = (schemas) => (req, res, next) => {
  const parts = ['body', 'params', 'query'];
  const allErrors = [];

  for (const part of parts) {
    if (!schemas[part]) continue;

    const { error } = schemas[part].validate(req[part], {
      abortEarly:   true,     // fail fast to avoid multiple noisy “Validation failed” entries
      stripUnknown: true,     // silently drop unknown keys
      convert:      true,     // coerce types (string → number, etc.)
    });

    if (error) {
      const fieldErrors = error.details.map(d => ({
        field:   d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      allErrors.push(...fieldErrors);
    }
  }

  if (allErrors.length > 0) {
    const first = allErrors[0];
    // Keep only the first validation issue to prevent duplicate noisy “Validation failed” payloads.
    const err = ApiError.badRequest(first.message, [first]);
    err.field = first.field;
    return next(err);
  }


  next();
};

module.exports = validate;

export {};
