import { NextFunction, Request, Response } from "express";

export type RouteHandlersType = (
    req:Request,
    res:Response,
    next:NextFunction
)=> Promise<void | Response<any, Record<string, any>>>


export interface EmailSendingOption {to:string,subject:string,html:string| undefined,text:string|undefined}
