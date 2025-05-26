import jwt, { JwtPayload } from "jsonwebtoken";
import ErrorHandler from "./utils-class.js";
import { unacceptable } from "./error-codes.js";
import { Response } from "express";

const secretTokenKey = process.env.SECURITYKEYOFJWTTOKENS! || "SECURITYKEYOFJWTTOKENS";
const FrontendDomain = process.env.FRONTEND_DOMAIN;

interface JWTPAYLOAD extends JwtPayload{
  _id:string,
  username:string,
}
interface ValuesType{_id:string,username:string}
/**
 * Generates a JWT token signed with the secret key.
 * 
 * @param {ValuesType} values - The payload data to include in the token.
 * @param {string | number} expiry - Optional expiration time (e.g. '1h', 3600).
 * @returns {string} Signed JWT token.
 */
export const generateToken = (values: ValuesType, expiry:any) => {
  return jwt.sign(values, secretTokenKey, expiry ? { expiresIn: expiry } : {});
};

/**
 * Verifies a JWT token and returns decoded payload.
 * Throws an error if token verification fails.
 * 
 * @param {string} token - JWT token string.
 * @returns {{username:string, _id:string, exp:number, iat:number}} Decoded token payload.
 * @throws {ErrorHandler} Throws if token verification fails.
 */
export const verifyToken = (token: string) => {
  const tokendata = jwt.verify(token, secretTokenKey, { complete: false });
  if (!tokendata) {
    throw new ErrorHandler("token not verified", unacceptable, true);
  }
  const { _id, username, iat, exp } = tokendata as JWTPAYLOAD;

  return { username, _id, exp, iat };
};

/**
 * Sets a cookie on the frontend with specific options for security.
 * 
 * @param {Response} res - Express response object.
 * @param {string} key - Name of the cookie.
 * @param {string} token - Value to store in the cookie.
 * @param {number} expiry - Expiration time in milliseconds.
 * @param {boolean} [httpOnly=false] - Whether cookie is HTTP only (default false).
 */
export const setCookieToFrontend = (
  res: Response,
  key: string,
  token: string,
  expiry: number,
  httpOnly = false
) => {
  res.cookie(key, token, {
    httpOnly: httpOnly,
    maxAge: expiry,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
};
