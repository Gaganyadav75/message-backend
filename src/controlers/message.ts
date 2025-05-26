
import { TryCatchError } from "../middlewares/error.js"
import { unacceptable } from "../utils/error-codes.js"
import ErrorHandler from "../utils/utils-class.js"
import {  MessageModel } from "../models/chatModel.js"

/**
 * Get messages of the authenticated user for a specific chat.
 * 
 * Validates the presence of required fields (`tokenData` and `contact.chatId`).
 * Supports pagination using `last` and `limit` query parameters.
 * Fetches the latest messages before a given timestamp and returns them in chronological order.
 *
 * @param {import('express').Request} req - Express request, expects `tokenData` and `contact` in body, and `last`, `limit` in query.
 * @param {import('express').Response} res - Express response.
 *
 * @throws {ErrorHandler} If required fields are missing or invalid.
 * @returns {Promise<void>} JSON response containing messages, contact, and scroll status.
 */


export const getMessages = TryCatchError(async(req,res) =>{

    
    const tokenData = req.body.tokenData
    const contact = req.body.contact

    if (!tokenData || !tokenData._id || !contact || !contact.chatId) {
        throw new ErrorHandler("Required Feilds Not Entered",unacceptable)
    }
 
    let last = parseInt(req.query.last as string) || 0;
    const limit = parseInt(req.query.limit as string) || 30;
    let scroll = false
    if (last==0) {
        last = Number(Date.now())
        scroll = true
    }


    const messages = (await MessageModel.find({chatId:contact.chatId,time:{$lt:last}},{chatId:0}).sort({ time: -1 }).limit(limit)).reverse()

    return res.json({success:true,message:"got all chats list ",messages,contact,scroll})
   
})

