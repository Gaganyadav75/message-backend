import mongoose from "mongoose";


interface IChat extends Document {
  participants: string[]; // List of participant user IDs
  type: 'one-to-one' | 'group'; // Type of chat
  status: 'active' | 'archived'; // Chat status
  isBlocked: boolean; // Whether the chat is blocked
  blockedBy?: string; // ID of the user who blocked the chat (optional)
  deletedBy: string[]; // List of user IDs who deleted the chat
  unreadMessagesCount?: IMessage[]; // Array of unread messages (optional, populated dynamically)
}


interface IMessage extends Document {
  chatId: string; // Reference to the chat
  sender: string; // User ID of the sender
  type: 'text' | 'emoji' | 'image' | 'video' | 'audio' | 'application' | 'info' | 'deleted' | 'call'; // Message type
  deleted: boolean; // Whether the message is deleted
  text?: string | null; // Message content (optional, null or undefined allowed)
  attach?: string | null; // Attachments (optional, null or undefined allowed)
  fileId?: string | null; // File ID (optional, null or undefined allowed)
  time: Date; // Time when the message was sent
  status: 'sent' | 'unread' | 'read'; // Status of the message
  forwarded: boolean; // Whether the message was forwarded
}

// Chat Schema
const chatSchema = new mongoose.Schema<IChat>({
    participants: { type: [String], required: true },
    type: { type: String, enum: ['one-to-one', 'group'], default: 'one-to-one' }, // Type of chat
    status: { type: String, enum: ['active', 'archived'], default: 'active' }, // Contact status
    isBlocked: { type: Boolean, default:false}, // Contact status
    blockedBy: { type: String, }, // Contact status
    deletedBy:{type:[String]},

});



chatSchema.virtual('unreadMessagesCount', {
  ref: 'messages',
  localField: '_id',
  foreignField: 'chatId',
  justOne: false,
});


export const ChatModel = mongoose.model<IChat>('Chat', chatSchema);

// Message Schema
const messageSchema = new mongoose.Schema<IMessage>({
  chatId: { type: String, required: true }, // Reference to the chat
  sender: { type: String, required: true }, // User ID of the sender
  type:{ type: String, enum: ['text', 'emoji','image','video','audio','application','info','deleted','call'], default: 'text' },
  deleted:{ type:Boolean,default:false},
  text: { type: String||null||undefined, }, // Message content
  attach: { type: String||null||undefined }, // Message content
  fileId:{type:String||null||undefined},
  time: { type: Date, default: Date.now() },
  status:{type: String, enum: ['sent', 'unread','read'], default: 'sent'},
  forwarded:{type:Boolean,default:false}
});



export const MessageModel = mongoose.model<IMessage>('messages', messageSchema);

