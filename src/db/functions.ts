import { ChatModel } from "../models/chatModel.js";


  
export  async function findChatBetweenUsers(userId: string, contactId: string){
    try {
      const chat = await ChatModel.find({
        participants: { $all: [userId, contactId] },
        deletedBy:{$nin:[userId,contactId]}
      });

      if (chat.length>0) {
      return true;
      }
      
      return false
      
    } catch (err) {
      console.error('Error finding chat:', err);
      return null; // Return null in case of an error
    }
}


