
import { io } from "../index.js";
import {  getUsersChats } from "../db/getChats.js";
import { ContactType } from "../types/chats.js";
import {  SocketErrorHander } from "./helpers.js";
import { getRedisValue } from "./redis.js";

interface ContactStatusPayload {
    chatId: string;
    isOnline: boolean;
  }


/**
 * @function notifyUsers
 * @description Notifies all contacts in a user's chat list about the user's online/offline status.
 * 
 * This function:
 * - Retrieves the user ID associated with the provided socket ID from Redis.
 * - Fetches the user's chat list if not provided.
 * - For each contact in the chat list who is not blocked, checks if they are currently online.
 * - Emits a "contact-status" event to each online contact to inform about the user's status change.
 * 
 * If the user ID cannot be found in Redis, an error is handled via `SocketErrorHander`.
 * 
 * @param {string} socketId - The socket ID of the user whose status has changed.
 * @param {boolean} isOnline - The new online status of the user (`true` for online, `false` for offline).
 * @param {any} [chatList] - Optional pre-fetched chat list of the user. If omitted, the list will be fetched internally.
 * 
 * @returns {Promise<void>} Resolves when notifications are sent.
 */


export const notifyUsers = async (socketId: string, isOnline: boolean,chatList:ContactType[]|null) => {
  const userId = await getRedisValue("active:"+socketId);
  if (!userId) {
    SocketErrorHander(socketId,"id","user id not found");
    return;
  }

  if (!chatList) {
    chatList = await getUsersChats(userId);
  }
   
  chatList?.forEach(async (user:ContactType) => {
    if (!user?.isBlocked) {
      const contactId = await getRedisValue("active:"+user._id);
      if (contactId) {
        io.to(contactId).emit("contact-status", {
          chatId:user.chatId ,
          isOnline,
        } as ContactStatusPayload);
      }
    }
  });
};
