import { UsersModel } from "../models/userModel.js";
import { conflict, unacceptable, unauthorised } from "../utils/error-codes.js";
import { verifyToken } from "../utils/jwt-functions.js";
import ErrorHandler from "../utils/utils-class.js";
import { TryCatchError } from "./error.js";

/**
 * Middleware to verify JWT token from cookies.
 * - Extracts token from `req.cookies.token`.
 * - Verifies the token's validity and expiration.
 * - Attaches decoded token data to `req.body.tokenData`.
 * - Throws an error if token is missing or invalid.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export const VerifyTokenMiddleware = TryCatchError(async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    throw new ErrorHandler("token not provided", unacceptable);
  }

  const data = verifyToken(token);

  if (!data) {
    throw new ErrorHandler("token is expired", unacceptable);
  }

  const tokenData = { ...data, token };
  req.body = { ...req.body, tokenData };
  next();
});

/**
 * Middleware to check if the user associated with token is verified.
 * - Expects `req.body.tokenData` from previous middleware.
 * - Fetches user from DB excluding sensitive fields.
 * - Throws errors if user doesn't exist or email verification is pending.
 * - Attaches the user object to `req.body.user` on success.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export const userVerifiedMiddleware = TryCatchError(async (req, res, next) => {
  const tokenData = req.body.tokenData;

  if (!tokenData) {
    throw new ErrorHandler("token data not found", conflict, true);
  }

  const user = await UsersModel.findById(tokenData._id, {
    password: 0,
    role: 0,
    attempt: 0,
    token: 0,
    deletehash: 0,
  });

  if (!user) {
    throw new ErrorHandler("User not Exists", conflict, true);
  }

  if (!user.verified) {
    throw new ErrorHandler("Email verification pending", unauthorised, true);
  }

  req.body = { ...req.body, user };
  next();
});
