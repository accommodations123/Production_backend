/**
 * Validator middleware for Stay Request endpoints
 */

export const validateCreateStayRequest = (req, res, next) => {
  const { title, country, city, budget, description } = req.body || {};
  const errors = [];

  if (!title || typeof title !== "string" || !title.trim()) {
    errors.push("Title is required and must be a valid text string.");
  }
  if (!country || typeof country !== "string" || !country.trim()) {
    errors.push("Target country is required.");
  }
  if (!city || typeof city !== "string" || !city.trim()) {
    errors.push("Target city is required.");
  }
  if (budget === undefined || budget === null || isNaN(Number(budget)) || Number(budget) <= 0) {
    errors.push("Valid monthly budget greater than 0 is required.");
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    errors.push("Description is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};

export const validateUpdateStayRequest = (req, res, next) => {
  const { budget } = req.body || {};
  const errors = [];

  if (budget !== undefined && (isNaN(Number(budget)) || Number(budget) < 0)) {
    errors.push("Budget must be a non-negative number.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};

export const validateStayRequestOffer = (req, res, next) => {
  const { message, offered_price } = req.body || {};
  const errors = [];

  if (!message || typeof message !== "string" || !message.trim()) {
    errors.push("Offer message is required.");
  }
  if (offered_price !== undefined && (isNaN(Number(offered_price)) || Number(offered_price) < 0)) {
    errors.push("Offered price must be a non-negative number.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};

export const validateReportStayRequest = (req, res, next) => {
  const { reason, reported_request_id } = req.body || {};
  const errors = [];

  if (!reported_request_id || typeof reported_request_id !== "string") {
    errors.push("Reported stay request ID is required.");
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    errors.push("Report reason is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};

export default {
  validateCreateStayRequest,
  validateUpdateStayRequest,
  validateStayRequestOffer,
  validateReportStayRequest
};
