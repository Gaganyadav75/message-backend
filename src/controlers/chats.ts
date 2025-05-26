
import { TryCatchError } from "../middlewares/error.js"
import { unacceptable } from "../utils/error-codes.js"
import ErrorHandler from "../utils/utils-class.js"
import { ChatModel, MessageModel } from "../models/chatModel.js"
import {  findChatBetweenUsers } from "../db/functions.js"
import {  DefaultUserProfile, getUsersChats } from "../db/getChats.js"
import { io } from "../index.js"
import { getRedisValue } from "../sockets/redis.js"




/**
 * Controller to fetch all chats for the authenticated user.
 * 
 * Expects a `tokenData` object in the request body containing the user ID.
 * Validates the presence of `tokenData` and its `_id` property.
 * Calls `getUsersChats` with the user ID to retrieve chat list.
 * 
 * On success, responds with JSON containing the chats.
 * On failure, throws an `ErrorHandler` with an appropriate message.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * 
 * @throws {ErrorHandler} If required fields are missing or fetching chats fails
 * 
 * @returns {Promise<void>} Sends JSON response with chats on success
 */

export const getChats = TryCatchError(async(req,res) =>{
    
    const tokenData = req.body.tokenData

    if (!tokenData || !tokenData._id) {
        throw new ErrorHandler("Required Feilds Not Entered",unacceptable)
    }
 

    const chats = await getUsersChats(tokenData._id,true)

    if (!chats) {
      throw new ErrorHandler("something went wrong",unacceptable)
    }

    return res.json({success:true,message:"got all chats list ",chats})
   
})








/**
 * Creates a new chat between the authenticated user and a contact.
 * Validates required fields and checks if a chat already exists.
 * Creates a chat and an initial info message.
 * Emits a socket event if the contact is online.
 *
 * @param {import('express').Request} req - Express request, expects `tokenData`, `contact`, and `user` in body.
 * @param {import('express').Response} res - Express response.
 *
 * @throws {ErrorHandler} If required fields are missing or chat already exists.
 * @returns {Promise<void>} JSON response with success message and contact info.
 */

export const addChats = TryCatchError(async (req, res) => {
    const { _id } = req.body.tokenData;
    const contact = req.body.contact;
    const user = req.body.user;

      if (!contact || !_id||!user) {
        throw new ErrorHandler("required fields not provided", unacceptable);
      }

      if((await findChatBetweenUsers(String(_id),String(contact._id))==true)){
        throw new ErrorHandler("chat already exists with this user ", unacceptable);
      }


    const createdChat = await ChatModel.create({participants:[_id,String(contact._id)]})
    await MessageModel.create({chatId:createdChat._id,type:"info",sender:_id,text:`enjoy the chat `});


      const contactOnline = await getRedisValue("active:"+contact._id)
      contact.chatId = createdChat._id;
      if (contactOnline) {
        contact.isOnline = true;

        io.to(contactOnline).emit('added-contact',{...user._doc,chatId:createdChat._id,isOnline:await getRedisValue("active:"+_id)})
      }
  

    return res.json({ success: true, message: "chat created successfully",contact});
  });








  /**
 * Deletes a chat for the authenticated user.
 * Validates required fields and chat existence.
 * Soft-deletes chat or permanently deletes if both users deleted.
 * Creates an info message about deletion.
 * Emits a socket event to the contact if online.
 *
 * @param {import('express').Request} req - Express request, expects `tokenData`, `contact`, and `user` in body.
 * @param {import('express').Response} res - Express response.
 *
 * @throws {ErrorHandler} If required fields are missing or chat doesn't exist or already deleted.
 * @returns {Promise<void>} JSON response confirming deletion.
 */

export const deleteChat = TryCatchError(async (req, res) => {
    const { username,_id } = req.body.tokenData;
    const contact = req.body.contact;
    const user = req.body.user;

      if (!user ||!contact||!contact.chatId || !_id) {
        throw new ErrorHandler("required fields not provided", unacceptable);
      }

      const chat = await ChatModel.findById(contact.chatId)

      if (!chat || !chat.participants.includes(_id)) {
        throw new ErrorHandler("chat doesn't exist!", unacceptable);
      }
      if (chat.deletedBy && chat.deletedBy.includes(_id)) {
        throw new ErrorHandler("chat already deleted!", unacceptable);
      }

      let emitString = "deletedBy-contact";
      if (chat.deletedBy.includes(contact._id)) {
        await chat.deleteOne();
        await MessageModel.deleteMany({chatId:contact.chatId})
        emitString = "deleted-contact";
      }else{
        await chat.updateOne({ $addToSet: { deletedBy:_id } })
      }

      await MessageModel.create({chatId:contact.chatId,type:"info",sender:_id,text:`deleted by ${username||"user"}`});

      const contactOnline = await getRedisValue("active:"+contact._id)
      if (contactOnline) {
        contact.isOnline = true;
        io.to(contactOnline).emit(emitString,{...DefaultUserProfile,chatId:contact.chatId})
      }
    // contact.chatId = createdChat._id;
  
    return res.json({ success: true, message: "contact deleted successfully",contact});
  });







/**
 * Blocks a chat for the authenticated user.
 * Validates required fields and chat existence.
 * Updates chat as blocked by the user.
 * Creates an info message about blocking.
 * Emits a socket event to the contact if online.
 *
 * @param {import('express').Request} req - Express request, expects `tokenData` and `contact` in body.
 * @param {import('express').Response} res - Express response.
 *
 * @throws {ErrorHandler} If required fields are missing, chat not found, or already blocked.
 * @returns {Promise<void>} JSON response confirming blocking.
 */

export const blockChat = TryCatchError(async (req, res) => {

  const { _id } = req.body.tokenData;
  const contact = req.body.contact;
  

  if (!contact||!contact.chatId || !_id) {
    throw new ErrorHandler("required fields not provided", unacceptable);
  }

  const chat = await ChatModel.findById(contact.chatId)

  if (!chat) {
    throw new ErrorHandler("something went wrong",unacceptable)
  }
  if (chat?.isBlocked) {
    throw new ErrorHandler("already blocked",unacceptable)
  }

  await chat?.updateOne({isBlocked:true,blockedBy:_id},)
  
  await MessageModel.create({chatId:contact.chatId,type:"info",sender:_id,text:"Blocked",time:Date.now()})

  contact.blockedBy = _id
  contact.isBlocked = true
  contact.isOnline = false

  const contactOnline = await getRedisValue("active:"+contact._id)
  if (contactOnline) {
    contact.isOnline = true;
    io.to(contactOnline).emit('block-update',{chatId:contact.chatId,isBlocked:true,isOnline:false,blockedBy:_id})
  }
  
    return res.json({ success: true, message: "blocked successfully",contact});
  });
  







/**
 * Unblocks a previously blocked chat for the authenticated user.
 * Validates required fields and chat status.
 * Updates chat as unblocked.
 * Creates an info message about unblocking.
 * Emits a socket event to the contact if online.
 *
 * @param {import('express').Request} req - Express request, expects `tokenData` and `contact` in body.
 * @param {import('express').Response} res - Express response.
 *
 * @throws {ErrorHandler} If required fields are missing, chat not found, or user hasn't blocked.
 * @returns {Promise<void>} JSON response confirming unblocking.
 */

export const unBlockChat = TryCatchError(async (req, res) => {

  const { _id } = req.body.tokenData;
  const contact = req.body.contact;
  

  if (!contact||!contact.chatId || !_id) {
    throw new ErrorHandler("required fields not provided", unacceptable);
  }

  const unblockchat = await ChatModel.findOne({_id:contact.chatId});

   if (!unblockchat || !unblockchat.isBlocked || unblockchat.blockedBy!=_id) {
    throw new ErrorHandler("you havn't blocked.", unacceptable);
   }
      await unblockchat.updateOne({blockedBy:null,isBlocked:false})
      const info ={chatId:contact.chatId,type:"info",sender:_id,text:"unblocked",time:Date.now()}
      await MessageModel.create(info)

      
      const contactOnline = await getRedisValue("active:"+contact._id)
  if (contactOnline) {
    contact.isOnline = true;
    io.to(contactOnline).emit('block-update',{chatId:contact.chatId,isBlocked:false,blockedBy:''})
  }

    return res.json({ success: true, message: "unblocked",contact});
  });
  






