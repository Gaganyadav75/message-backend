import { NextFunction, Request, Response } from "express";
import {RouteHandlersType } from "../types/types.js"
import ErrorHandler from "../utils/utils-class.js";
import { imagekit } from "../db/db-config.js";


/**
 * Express error-handling middleware.
 * Handles errors thrown in routes or other middlewares,
 * optionally deletes an Imgur image if `deletehash` is present in the request body,
 * and sends a JSON error response.
 * 
 * @param {ErrorHandler} err - The error object caught by Express.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Response} JSON response with error details.
 */
export const errorMiddleware = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next:NextFunction
) => {
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  const body = req.body;
  if (body) {
    if (body.fileId) {
    imagekit.deleteFile(body.fileId);
    }
  }
  
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
    custom: err.custom || false,
  });
};


/**
 * A utility function to wrap async route handlers,
 * automatically catching any rejected promises and forwarding errors to the Express error handler.
 * 
 * @param {RouteHandlersType} func - The async route handler function.
 * @returns {Function} A function that executes the route handler and catches errors.
 */
export const TryCatchError = (func: RouteHandlersType) =>
  (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(func(req, res, next)).catch(next);
  }
