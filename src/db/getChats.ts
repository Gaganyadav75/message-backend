import { ChatModel, MessageModel } from "../models/chatModel.js";
import { UsersModel } from "../models/userModel.js";
import { getRedisValue } from "../sockets/redis.js";
import { ContactType } from "../types/chats.js";


export const DefaultUserProfile = {
  username:"hii hello user",
  email:'abc.example.com',
  _id:'123456',
  profile:null,
}



/**
 * @async
 * @function getUsersChats
 * @description Retrieves the chat list for a specific user, optionally including unread message counts.
 *
 * For each chat involving the user, fetches the other participant's public profile, last message timestamp,
 * online status, block and deletion status, and unread message count if requested.
 *
 * @param {string} userId - The ID of the user whose chats are being retrieved.
 * @param {boolean} [unread] - Optional flag to include unread message counts.
 *
 * @returns {Promise<ContactType[]|null>} A Promise resolving to an array of chat participant objects
 * with chat metadata, or null if an error occurs.
 */


export const getUsersChats = async (userId:string,unread?:boolean):Promise<ContactType[]|null> =>{
  try {
   
    const chats = !unread?await ChatModel.find({
      participants: userId,
    }):await ChatModel.find({
          participants: userId,
        }).populate({
          path: 'unreadMessagesCount',
          match: { sender: { $ne: userId }, status: {$ne:'read'} }, 
          select: '_id'
        }).exec()
    
    
    const chatWithParticipants = await Promise.all(
      chats.map(async (chat) => {
        const participantIds = chat.participants.filter((participant )=> participant !== userId);
        const participant = await UsersModel.findOne({ _id: participantIds[0] },{ password: 0,role:0,verified:0,fileId:0 }).exec();
        const lastMessage = await MessageModel.findOne({chatId:chat._id}).sort({ time: -1 }).limit(1).exec();
       
        const deletedbyuser = chat.deletedBy.includes(userId);
        if (!participant || deletedbyuser ) {
          return false
        }
        
        const deletebycontact = chat.deletedBy.includes(String(participant._id));

        let newchat = JSON.parse(JSON.stringify(participant))

        if(!chat.isBlocked && (await getRedisValue("active:"+participant._id)) && !deletebycontact){
          newchat.isOnline = true;
        } 
     
        if (chat.isBlocked) {
            newchat = {...newchat,profile:''}
        }

        if(deletebycontact){
            newchat = {...newchat,...DefaultUserProfile}
          }
        const unreadCount = unread?chat.unreadMessagesCount?.length:0;
        newchat.chatId = String(chat._id);
        newchat.isBlocked = chat.isBlocked;
        newchat.blockedBy = chat.blockedBy;
        newchat.isDeleted = deletebycontact;
        newchat.unreadCount = unreadCount;
        newchat.updatedAt = Number(lastMessage?.time);

       return newchat
      })
    );

    

    return chatWithParticipants.filter(ele=>ele).sort((a,b)=>b.updatedAt-a.updatedAt)
  } catch {
    return null;
  }
}
