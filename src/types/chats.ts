export type ContactType = {
    chatId:string,
    _id:string,
    participants: string,
    type: 'one-to-one'| 'group', // Type of chat
    status:'active'| 'archived', // Contact status
    isBlocked: boolean, // Contact status
    blockedBy: string, // Contact status
    deletedBy:string[],
    unreadCount:Number,
    updatedAt:Number,
    isOnline:boolean,
}


export type MessageType = {
    chatId:string, // Reference to the chat
    sender:string, // User ID of the sender
    type:'text'| 'emoji'|'image'|'video'|'audio'|'application'|'info'|'deleted'|'call',
    deleted:boolean,
    text?:string, // Message content
    attach?: string, // Message content
    fileId?:string,
    time: Date,
    status:'sent'| 'unread'|'read',
    forwarded:boolean
}

export type MessageInfoType = {
    sender:string,
    _id:string,
    status:'sent'| 'unread'|'read',
    text?:string,
    time:Date|string|number,
    type:'text'| 'emoji'|'image'|'video'|'audio'|'application'|'info'|'deleted'|'call',
    attach?:any,
    name?:string
}

export type forwareMessageInfoType = Partial<MessageInfoType> &{
    chatId:string,

}


export type onSendMessageType = {
    _id:string,
    participantId:string,
    chatId:string,
    info:MessageInfoType[]
}

export type onForwardingMessageType = {
    _id:string,
    participantId:string,
    chatId:string,
    info:forwareMessageInfoType[]
}

export type onReadMessageType = {chatId:string,contactId:string}

export type onDeleteMessageType ={
    chatId:string,
    contactId:string,
    _id:string,
    messageIdList:string[],
}