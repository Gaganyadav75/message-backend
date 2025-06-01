import fs from "fs";
import { io } from "../index.js";
import { MessageModel } from "../models/chatModel.js";
import { DeleteFromImageKit, UploadAndInform } from "../utils/ImageUplod.js";
import { getRedisValue } from "./redis.js";
import {  MessageInfoType, onDeleteMessageType, onForwardingMessageType, onReadMessageType, onSendMessageType } from "../types/chats.js";
import { SocketErrorHander } from "./helpers.js";
import { Socket } from "socket.io";





/**
 * Handles sending messages through the socket.
 *
 * @param {Socket} socket - The socket instance of the sender.
 * @returns {Function} - An async function that processes message sending.
 *
 * @param {Object} param0
 * @param {string} param0._id - Sender's user ID.
 * @param {string} param0.participantId - Receiver's user ID.
 * @param {string} param0.chatId - The chat session ID.
 * @param {Array<MessageInfoType>} param0.info - Array of message info objects to send.
 *
 * @description
 * Validates message data, saves message(s) to DB, writes attachments to disk if any,
 * and emits the messages to sender and receiver via socket.io.
 * Handles errors by emitting socket error events.
 */

export const sendMessage = (socket:Socket)=>{
  return async({_id,participantId,chatId,info}:onSendMessageType) =>{
    try {
      if ( !_id || !chatId || !participantId || participantId == _id||!info || info?.length<1) {
        SocketErrorHander(socket.id,'send-message',"fields are not provided");
        return;
      }

      const Id = await getRedisValue("active:"+participantId);

       Promise.all(info?.map(async(mess:MessageInfoType) => {
          let fld:{filename:string,filePath:string,buffer:Buffer,messageId?:string}|null = null;
          const status = Id?'unread':'sent' as 'unread'|'sent'; 
          const newinfo = {chatId:chatId,sender:_id,text:mess.text,time:mess.time,type:mess.type,attach:mess.attach,status};
          if (mess.attach && (mess.type=='image' || mess.type=='video' || mess.type=='application' || mess.type=='audio') ) {
            try {
              const buffer = Buffer.from(mess.attach); 
              const flname = `${Date.now()}-${mess.name}`;
              const filePath = `public/uploads/${flname}`;
              mess.attach = flname;
              newinfo.attach = flname;
              // Write the file to the uploads folder
              await Promise.resolve(fs.writeFile(filePath, new Uint8Array(buffer),async(err) => {
                  if (err) {
                      console.error('File upload error:', err);
                  }
                  })
              );
              fld = {filename:flname,filePath,buffer};
            } catch  {
               SocketErrorHander(socket.id,'send-file-message',"error in sending file");
            }
            

          }else if (mess.type == 'text' && !mess.text ) {
            return null;
          }
          const createdMess = await MessageModel.create(newinfo);

          mess.sender = _id;
          mess._id = String(createdMess._id);
          mess.status = status;
          if(Id)socket.to(Id).emit("receive-message",{chatId,sender:_id,info:[mess]});
          socket.emit("receive-message",{chatId,sender:_id,info:[mess]});
          if(fld){
            fld.messageId = String(createdMess._id);
            UploadAndInform(fld.buffer,fld.filename,fld.filePath,fld.messageId,_id,participantId,chatId);
          }
      }));

    } catch {
       SocketErrorHander(socket.id,'send-message',"error in sending catch message");
    }
  };
};








/**
 * Handles forwarding messages through the socket.
 *
 * @param {Socket} socket - The socket instance of the sender.
 * @returns {Function} - An async function that processes message forwarding.
 *
 * @param {Object} param0
 * @param {string} param0._id - Sender's user ID.
 * @param {string} param0.participantId - Receiver's user ID.
 * @param {string} param0.chatId - The chat session ID.
 * @param {Array<MessageInfoType>} param0.info - Array of message info objects to forward.
 *
 * @description
 * Validates the input, creates new message records marked as forwarded,
 * and emits the forwarded messages to both sender and receiver via socket.io.
 * Emits an error event if forwarding fails.
 */

export const forwardMessage = (socket:Socket)=>{
  return async({_id,participantId,chatId,info}:onForwardingMessageType) =>{
    try {
      if ( !_id || !chatId || !participantId || participantId == _id||!info || info.length<1) {
          SocketErrorHander(socket.id,'forword-message',"data not provided properly");
          return;
      }

      const Id = await getRedisValue("active:"+participantId);

      info.forEach(async(mess) => {
            mess.sender = _id;
            mess.status  = Id?'unread':'sent';
            mess.time = Date.now();
            mess.chatId = chatId;
            mess._id = undefined;
            const newinfo = {...mess,forwarded:true};

            const createdMess = await MessageModel.create(newinfo);
            mess._id = String(createdMess._id);
               
            if(Id) socket.to(Id).emit("receive-message",{chatId,sender:_id,info:[mess]});
            socket.emit("receive-message",{chatId,sender:_id,info:[mess]});

        });
             
    } catch {
      SocketErrorHander(socket.id,'message',"error in forwarding message");
    }

  };
};







/**
 * Marks messages as read in a chat and notifies the sender.
 *
 * @param {Socket} socket - The socket instance of the connected user.
 * @returns {Function} - An async function handling the read message event.
 *
 * @param {Object} param0
 * @param {string} param0.chatId - The chat session ID.
 * @param {string} param0.contactId - The sender's user ID whose messages are marked as read.
 *
 * @description
 * Updates all messages in the specified chat from the contact to "read" status,
 * then emits a "seen-messages" event to notify the contact that their messages have been seen.
 * Sends a socket error if any issues occur.
 */

export const readMessages = (socket:Socket)=>{

  return async({chatId,contactId}:onReadMessageType) =>{
    if (chatId && contactId) {
      try {
        await MessageModel.updateMany({chatId,sender:contactId},{status:'read'});
        const senderId = await getRedisValue("active:"+contactId);
        if (senderId) {
           io.to(senderId).emit("read-messages",chatId);
        }
      } catch {
        SocketErrorHander(socket.id,'read-message',"data not provided properly");
      }
    }
  };
};



/**
 * Handles deleting messages sent by the user and notifies both parties.
 *
 * @param {Socket} socket - The socket instance for the connected user.
 * @returns {Function} - An async function to process message deletion.
 *
 * @param {Object} param0
 * @param {string} param0._id - The user ID of the message sender requesting deletion.
 * @param {string} param0.contactId - The contact's user ID to notify about the deletion.
 * @param {string[]} param0.messageIdList - List of message IDs to delete.
 * @param {string} param0.chatId - The chat session ID containing the messages.
 *
 * @description
 * Finds the messages in the chat sent by the user matching the given message IDs.
 * If a message is already marked deleted, it removes it fully (including deleting files from ImageKit if applicable).
 * Otherwise, it updates the message to a "deleted" placeholder (text: 'deleted', clears attachments).
 * Emits a "deleted-message" event to both the sender and the contact to update their UI.
 * Calls SocketErrorHandler if required data is missing or an error occurs.
 */

export const deleteMessage = (socket:Socket)=>{
  return async({_id,contactId,messageIdList,chatId}:onDeleteMessageType) =>{
    
      try {
        if (!_id || !messageIdList || !(messageIdList?.length>0) || !contactId) {
          SocketErrorHander(socket.id,'delete-message',"data not provided properly");
          return;
        }
          const Messages = await MessageModel.find({
            chatId,
            _id: {$in:messageIdList},
            sender: _id
          });
          const conId = await getRedisValue("active:"+contactId);
          let deleted;
          Messages.forEach(async(ele)=>{
            if (ele?.deleted) {
              if(ele?.fileId) await DeleteFromImageKit(ele.fileId);
              deleted = await  ele.deleteOne();
            }else{
              if(ele?.fileId) await DeleteFromImageKit(ele.fileId);
              deleted = await ele?.updateOne({type:"text",text:'deleted',attach:'',deleted:true});
            }
              
            if (deleted) {
  
                socket.emit("deleted-message",{chatId,messageId:ele._id});
    
                if(conId) io.to(conId).emit("deleted-message",{chatId,messageId:ele._id});
              
            }
          });
         
           
      } catch {
        SocketErrorHander(socket.id,'delete-message',"error while deleting");
      }
  };  
};






/**
 * Emits a 'typing' event to notify a participant that the user is typing.
 *
 * @param {Object} data - The typing event data.
 * @param {string} data._id - The ID of the user who is typing.
 * @param {string} data.participantId - The recipient user ID to notify.
 *
 * @description
 * Retrieves the socket ID of the participant from Redis and emits a 'typing' event
 * with the typing user's ID to that participant if they are online.
 */

export const Typing = async(data:{_id:string,participantId:string})=>{
    const Id = await getRedisValue(data.participantId);
    if (Id) {
      io.to(Id).emit('typing',data._id);
    }
};



