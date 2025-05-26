import { io } from "../index.js";
import { MessageModel } from "../models/chatModel.js";
import { candidatetype, offertype } from "../types/calls.js";
import { ContactType } from "../types/chats.js";
import {  CandidateMapList,  OfferMapList, OfferSenderToDataMapList,  timeOutList, UserSocketMap } from "./app.js";
import {   getRedisValue,  } from "./redis.js";




/**
 * @function getUserId_SocketId
 * @description Finds and returns the user ID and socket ID pair from the active users map,
 *               based on a provided ID that can be either a user ID or a socket ID.
 *
 * @param {string} providedId - The ID to search for, which can be a user ID or a socket ID.
 * @param {UserSocketMap} activeUsers - A Map where keys are user IDs and values are socket IDs.
 *
 * @returns {getId | null} - An object containing `{ userId, socketId }` if a match is found; otherwise, `null`.
 */

interface getId {socketId:string,userId:string}

export const getUserId_SocketId = (providedId: string,activeUsers:UserSocketMap): getId | null => {
    for (const [userId,socketId ] of activeUsers.entries()) {
      if (socketId === providedId || userId === providedId) return {userId,socketId};
    }
    return null;
};




/**
 * @function getIsOnCall
 * @description Checks if a provided ID (either sender or receiver) is currently involved in a call.
 *              Searches through the activeUsers map where each entry represents a sender-receiver pair.
 *
 * @param {string} providedId - The ID to check, can be either a sender ID or a receiver ID.
 * @param {UserSocketMap} activeUsers - A Map where keys are sender IDs and values are receiver IDs.
 *
 * @returns {{ sender: string, receiver: string } | null} - Returns an object containing the sender and receiver IDs
 *          if the provided ID is involved in a call; otherwise returns null.
 */

export const getIsOnCall = (providedId: string,activeUsers:UserSocketMap): {sender:string,receiver:string} | null => {
    for (const [sender,receiver ] of activeUsers.entries()) {
      if (sender === providedId || receiver === providedId) return {sender,receiver};
    }
    return null;
  };





/**
 * @function getIsOnCallWithMe
 * @description Checks if two users are currently in a call with each other.
 *              It searches the activeUsers map for a sender-receiver pair matching both IDs in either order.
 *
 * @param {string} userId - The ID of the first user.
 * @param {string} otherId - The ID of the other user.
 * @param {UserSocketMap} activeUsers - A Map where keys are sender IDs and values are receiver IDs.
 *
 * @returns {boolean} - Returns `true` if the two users are currently on a call with each other, otherwise `false`.
 */

export const getIsOnCallWithMe = (userId: string,otherId:string,activeUsers:UserSocketMap):boolean => {
    for (const [sender,receiver ] of activeUsers.entries()) {
      if (sender === userId && receiver === otherId) return true;
      if (receiver === userId && sender === otherId) return true;
    }
    return false;
  };






/**
 * @function SocketErrorHander
 * @description Sends an error message to a specific socket client using Socket.IO.
 *
 * @param {string} id - The socket ID to send the error message to.
 * @param {string} type - A string indicating the type or category of the error.
 * @param {string} message - The error message content to be sent.
 */

export const SocketErrorHander = (id:string|null,type:string,message:string) =>{
  if(id)
    io.to(id).emit("error",{
        message,
        type
    });
};





/**
 * Stores a call offer in memory maps and sets a timeout to handle missed calls.
 *
 * @param {string} chatId - The unique identifier for the chat session.
 * @param {object} sender - The user object representing the sender.
 * @param {object} receiver - The user object representing the receiver.
 * @param {string} data - The offer data (typically an SDP string).
 * @param {boolean} video - Indicates if the call includes video.
 * @param {string} messageId - The ID of the related message document.
 *
 * @returns {boolean} Always returns true after storing the offer.
 *
 * @description
 * Stores the offer details in two maps:
 * - `OfferMapList` keyed by chatId
 * - `OfferSenderToDataMapList` keyed by sender._id
 * 
 * Also sets a 30-second timeout to automatically end the call if unanswered:
 * - Emits 'end-call' event to both sender and receiver if still pending.
 * - Updates the message status to 'missed call'.
 * - Cleans up the stored offer and timeout data.
 */

export function storeOffer(chatId:string,sender:ContactType,receiver:ContactType,data:offertype,video:boolean,messageId:string) {
  OfferMapList.set(chatId,{offer:data,sender,receiver,video,messageId});
  OfferSenderToDataMapList.set(String(sender._id),{chatId,receiver:String(receiver._id),messageId});

  

  const tmid = setTimeout(async() => {
    const offerobj =  OfferMapList.get(chatId);
    if(offerobj){

        const sender = await getRedisValue("active:"+offerobj.sender._id);
        const receiver = await getRedisValue("active:"+offerobj.receiver._id);
        if(sender) io.to(sender).emit('end-call',{chatId});
        if(receiver) io.to(receiver).emit('end-call',{chatId});
        const message = await MessageModel.findById(messageId);
        try {
          message?.updateOne({status:'unread',text:"missed call"});
        }catch {
          console.log("error in message update in end call");
        }
        if(sender  && message ) io.to(sender).emit('update-message', {chatId,messageId:message._id,status:'unread',text:"missed call"});
        if(receiver && message ) io.to(receiver).emit('update-message',{chatId,messageId:message._id,status:'unread',text:"missed call"});
        OfferMapList.delete(chatId);
        OfferSenderToDataMapList.delete(String(offerobj.sender._id));
        timeOutList.delete(chatId);
    }
  }, 30000);

  timeOutList.set(chatId,tmid);

  return true;
}





/**
 * Deletes the stored call offer and associated data for a given chat.
 *
 * @param {string} chatId - The unique identifier for the chat session.
 * @param {string} [sender] - Optional sender user ID to delete related sender mapping.
 *
 * @returns {boolean} Returns true if the offer existed and was deleted, false otherwise.
 *
 * @description
 * - Clears and removes the timeout associated with the offer.
 * - Deletes the offer from `OfferMapList`.
 * - Deletes any stored ICE candidates from `CandidateMapList`.
 * - If sender ID is provided, deletes the sender-to-data mapping from `OfferSenderToDataMapList`.
 */

export  function deleteOffer(chatId:string,sender?:string) {
  clearTimeout(timeOutList.get(chatId));
  timeOutList.delete(chatId);
  const data = OfferMapList.delete(chatId);
  CandidateMapList.delete(chatId);
  if(sender) OfferSenderToDataMapList.delete(sender);
  return data?true:false;
}






/**
 * Stores an ICE candidate for a given chat session.
 *
 * @param {string} chatId - The unique identifier for the chat session.
 * @param {*} candidate - The ICE candidate object to store.
 *
 * @description
 * Adds the provided ICE candidate to the existing list of candidates for the chat.
 * If no candidates exist for the chat, initializes a new list with the given candidate.
 */

export  function storeCandidate(chatId:string,candidate:candidatetype) {
  const list = CandidateMapList.get(chatId);
  CandidateMapList.set(chatId,(list?[...list,candidate]:[candidate]));
}





