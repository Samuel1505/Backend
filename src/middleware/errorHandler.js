import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'DB_CONNECTION_ERROR') {
    const message = err.details || 'Database connection failed. Please ensure PostgreSQL is running and configured.';
    error = new AppError(message, 503);
    error.statusCode = 503;
  }

  // PostgreSQL errors
  if (err.code && err.code.startsWith('28') || err.code === '3D000') {
    const message = 'Database authentication or connection error. Please check your database credentials.';
    error = new AppError(message, 503);
    error.statusCode = 503;
  }

  // Send response
  const response = {
    success: false,
    error: error.message || 'Server Error',
    timestamp: new Date().toISOString(),
  };

  // Add details in development mode
  if (config.server.isDevelopment) {
    if (err.details) {
      response.details = err.details;
    }
    if (err.stack) {
      response.stack = err.stack;
    }
  }

  res.status(error.statusCode || 500).json(response);
};

export default errorHandler;

