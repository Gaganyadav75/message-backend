import { Socket } from "socket.io";
import {  CandidateMapList, OfferMapList, OfferSenderToDataMapList } from "./app.js";
import {  deleteRedisKey, getRedisValue } from "./redis.js";
import { deleteOffer, SocketErrorHander, storeCandidate, storeOffer } from "./helpers.js";
import { MessageModel } from "../models/chatModel.js";
import { io } from "../index.js";
import { notifyUsers } from "./chats.js";
import { ContactType } from "../types/chats.js";
import { onAnswerType, onCallType, onCandidateType, onEndCallType } from "../types/calls.js";





/**
 * @async
 * @function updateMessageAndInform
 * @description Updates message statuses to "unread" for a user's chats and informs online contacts about their status.
 * 
 * For each chat participant, if they are online and the chat is not blocked:
 * - Emits WebRTC signaling events (`offer`, `ice-candidate`) if ongoing call info is present.
 * - Emits `"contact-status"` event to notify the contact that the user is online.
 * - Updates unread message statuses in the database.
 * 
 * Handles errors by notifying the user's socket of any issues during message status update.
 * 
 * @param {ContactType[]} chatList - List of chat participant objects related to the user.
 * @param {string} _id - The user ID for whom the chat statuses are updated.
 */


export const updateMessageAndInform = async (chatList:ContactType[]|null,_id:string)=>{

  const Id = await getRedisValue("active:"+_id);

  chatList?.forEach(async (ele)=>{
 
      if (!ele?.isBlocked) {
        const contactId = await getRedisValue("active:"+ele._id);
        if(contactId && Id){
        const val = OfferMapList.get(ele.chatId);
        if(val && val.sender._id==ele._id){
          const candidate = CandidateMapList.get(ele.chatId);
          candidate?.forEach((element) => {
            io.to(Id).emit('ice-candidate',{candidate:element});
          });
          io.to(Id).emit('offer',{from:val.sender,to:val.receiver,offer:val.offer,video:val.video});
         
        }

          io.to(contactId).emit("contact-status", {
            chatId:ele.chatId ,
            isOnline:true,
          });
        }
       
      }
      try {
        MessageModel.updateMany({chatId:ele.chatId,sender:ele._id,status:{$nin:'read'}},{status:'unread'}).exec();
      } catch (error) {
        SocketErrorHander(Id,'update',"error in updating message status");
        console.log("error in updating messages and informing about "+ele.chatId + " by someone other than "+ele._id,error);
      }

   });
};





/**
 * @function onOffer
 * @description Returns an event handler function for handling WebRTC call offers.
 * 
 * This handler processes an incoming call offer by:
 * - Validating required data fields.
 * - Creating a call-type message in the database.
 * - Storing the offer details for signaling.
 * - Emitting the offer and the call message to the recipient's socket.
 * - Emitting the call message to the caller's socket.
 * 
 * On error or missing data, sends a socket error event.
 * 
 * @param {Socket} socket - The Socket.IO socket instance for the connected user.
 * 
 * @returns {Function} An async event handler function that accepts call offer details.
 */


export const onOffer = (socket:Socket)=>{
    return async ({chatId,from,to,offer,video}:onCallType) => {
      if(!to || !from || !offer|| !to?.chatId || !to?._id){
        SocketErrorHander(socket.id,'call',"data not provided properly");
        return
      }
        from.chatId = to.chatId;
        const Id = await getRedisValue("active:"+to._id);
        try {
          const mess = await MessageModel.create({chatId,type:'call',sender:from._id,text:"calling",time:Date.now()});
          storeOffer(chatId,from,to,offer,video?true:false,String(mess._id));
          if(Id) socket.to(Id).emit('offer',{chatId,from,to,offer,video});
          if(Id && mess) socket.to(Id).emit('receive-message', {chatId,sender:from._id,info:[JSON.parse(JSON.stringify(mess))]});
          if(mess) socket.emit('receive-message',{chatId,sender:from._id,info:[JSON.parse(JSON.stringify(mess))]});
        } catch {
          SocketErrorHander(socket.id,'call',"error in sending offer");
        }
       
    };
};





/**
 * @function onAnswer
 * @description Returns an event handler for handling WebRTC call answers.
 * 
 * This handler processes an answer to a call offer by:
 * - Validating required fields.
 * - Updating the corresponding call message status to 'read' with text 'answered'.
 * - Emitting an update message event to both the caller and recipient sockets.
 * - Emitting the 'answer' event to the original caller.
 * - Cleaning up stored offer data.
 * 
 * On error or missing data, it sends a socket error event.
 * 
 * @param {Socket} socket - The Socket.IO socket instance for the connected user.
 * 
 * @returns {Function} An async event handler function accepting call answer details.
 */


export const onAnswer = (socket:Socket)=>{
    return async ({chatId,from,to,answer}:onAnswerType) => {
      if(!to || !from || !answer|| !to?.chatId || !to?._id){
        SocketErrorHander(socket.id,'call',"data not provided properly");
        return
      }
        const Id = await getRedisValue("active:"+to._id);

          
          try {
            const message = await MessageModel.findById(OfferMapList.get(chatId)?.messageId);
            await message?.updateOne({status:'read',text:"answered"});
            if(Id && message) socket.to(Id).emit('update-message', {chatId,messageId:message._id,status:'read',text:"answered"});
            if(message) socket.emit('update-message',{chatId,messageId:message._id,status:'read',text:"answered"});
            from.chatId = chatId;
            if(Id )socket.to(Id).emit('answer',{chatId,from:{...from},to,answer});
            deleteOffer(chatId,to._id);
          }catch {
            SocketErrorHander(socket.id,'call',"error while sending answer");
          }
         
        
      };
};







/**
 * @function onCandidate
 * @description Returns an event handler for forwarding ICE candidates during WebRTC signaling.
 * 
 * This handler processes ICE candidates by:
 * - Validating required data fields.
 * - Emitting the ICE candidate to the target user's socket if connected.
 * - Storing the candidate for the ongoing call session.
 * 
 * On missing data, it sends a socket error event.
 * 
 * @param {Socket} socket - The Socket.IO socket instance for the connected user.
 * 
 * @returns {Function} An async event handler function accepting ICE candidate details.
 */


export const onCandidate = (socket:Socket)=>{
    return async ({from,to,candidate}:onCandidateType) => {
      if(!to || !from || !candidate|| !to?.chatId || !to?._id){
        SocketErrorHander(socket.id,'call',"data not provided properly");
        return;
      }
          const Id = await getRedisValue("active:"+to._id);
                    
          if (Id && candidate) {
            socket.to(Id).emit('ice-candidate',{from,to,candidate});
          }
          if(to.chatId){
            storeCandidate(to.chatId,candidate);
          }

        
      };
};








/**
 * @function onEndCall
 * @description Returns an event handler to manage the termination of a WebRTC call.
 * 
 * This handler performs the following steps when a call ends:
 * - Validates the required call data.
 * - Retrieves the caller's user ID and the stored offer data.
 * - Updates the call message status to 'unread' with the text "missed call".
 * - Emits an 'update-message' event to both the caller and the recipient to reflect the missed call.
 * - Emits an 'end-call' event to the recipient to notify call termination.
 * - Cleans up stored offer data for the call.
 * - Handles errors during message updates gracefully.
 * 
 * On missing data, it sends a socket error event.
 * 
 * @param {Socket} socket - The Socket.IO socket instance for the user ending the call.
 * 
 * @returns {Function} An async event handler function accepting call end details.
 */


export const onEndCall = (socket:Socket)=>{
    return async({chatId,to}:onEndCallType) => {
      
      if(!to || !chatId || !to?._id){
        SocketErrorHander(socket.id,'call',"data not provided properly");
        return;
      }
          const userId = await getRedisValue("active:"+socket.id);
          const offerobj = OfferMapList.get(chatId);
        
          const message = await MessageModel.findById(offerobj?.messageId);
          try {
            await message?.updateOne({status:'unread',text:"missed call"});
          }catch {
            console.log("error in message update in end call");
          }
          const Id = await getRedisValue("active:"+to?._id);
          
          if(Id && message)  io.to(Id).emit('update-message', {chatId,messageId:message._id,status:'unread',text:"missed call"});
          if(message ) io.to(socket.id).emit('update-message', {chatId,messageId:message._id,status:'unread',text:"missed call"});

          if(Id) io.to(Id).emit('end-call',{chatId});

          deleteOffer(chatId,userId||undefined);
         
      };
};





/**
 * @function OnDisconnet
 * @description Returns an async handler for the socket 'disconnect' event.
 * 
 * When a user disconnects, this handler:
 * - Retrieves the user ID linked to the socket from Redis.
 * - Checks if there is an ongoing call offer from the user and marks it as missed.
 * - Updates the call message status to 'unread' with "missed call" text.
 * - Emits an 'update-message' event to notify the receiver about the missed call.
 * - Emits an 'end-call' event to the receiver to indicate the call has ended.
 * - Deletes the offer data related to the call.
 * - Notifies other users about the user's offline status.
 * - Cleans up Redis keys associated with the socket and user ID.
 * 
 * Errors during message updates are logged but do not interrupt the flow.
 * 
 * @param {Socket} socket - The Socket.IO socket instance that got disconnected.
 * 
 * @returns {Function} An async function to be used as the disconnect event handler.
 */

export const OnDisconnet = (socket:Socket)=>{
  return async ()=>{
    const _id = await getRedisValue("active:"+socket.id);
    const shadowoffer = _id?OfferSenderToDataMapList.get(_id):null;
  
    if(_id && shadowoffer){
      const {chatId,receiver,messageId} = shadowoffer;
      const message = await MessageModel.findById(messageId);
      try {
        await message?.updateOne({status:'unread',text:"missed call"});
      }catch {
        console.log("error in message update in end call of ",_id);
      }
      if(receiver && message ) io.to(receiver).emit('update-message',{messageId,status:'unread',text:"missed call"});
      deleteOffer(chatId,_id);
      const recid = await getRedisValue("active:"+receiver);
      if(recid ) io.to(recid).emit('end-call',{chatId});
    }
    await notifyUsers(socket.id, false,null); 
  
    deleteRedisKey("active:"+socket.id);
    if(_id) deleteRedisKey("active:"+_id);
  };
};