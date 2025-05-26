import { Server, Socket } from 'socket.io';

import { deleteMessage, forwardMessage, readMessages, sendMessage, Typing } from './messages.js';

import { onAnswer, onCandidate, OnDisconnet, onEndCall, onOffer, updateMessageAndInform } from './calls.js';
import { getUsersChats } from '../db/getChats.js';
import {  setRedisKey } from './redis.js';
import { ContactType } from '../types/chats.js';
import { candidatetype, offertype } from '../types/calls.js';
import {Redis} from 'ioredis';



export type UserSocketMap = Map<string, string>; 

export const ActiveUsers:UserSocketMap = new Map()

export interface pendingSignalsVlaueType {offer:offertype,sender:ContactType,receiver:ContactType,video:boolean,messageId:string}
export type pendingSignalsMap = Map<string,pendingSignalsVlaueType >;
export const OfferMapList:pendingSignalsMap = new Map()
export const OfferSenderToDataMapList = new Map<string,{receiver:string,chatId:string,messageId:string}>()

export type CandidatesType = Map<string,candidatetype[]>
export const CandidateMapList:CandidatesType = new Map()

export type timeoutListType = Map<string,NodeJS.Timeout >;
export const timeOutList: timeoutListType = new Map();


const rdlink = process.env.REDIS_SERVER_LINK


export const redis = rdlink ?new Redis(rdlink):null;


redis?.flushall().then().catch((err:any)=>console.log(err))





/**
 * @function initializeSocketIO
 * @description Initializes Socket.IO server event listeners for real-time communication.
 * 
 * Sets up handlers for user connection, messaging, call signaling, and disconnection events.
 * Stores active socket-user mappings in Redis for presence management.
 * 
 * @param {Server} io - Socket.IO server instance.
 */


export const initializeSocketIO = async (io: Server) => {


  io.on('connection', async(socket: Socket) => {
    const _id = socket.handshake.query._id as string;
    if (!_id) {socket.disconnect(); return;}

    await setRedisKey("active:"+_id,socket.id)
    await setRedisKey("active:"+socket.id,_id)
    
  
    updateMessageAndInform(await getUsersChats(_id,true),_id);

    socket.on("send-message",sendMessage(socket))
    socket.on("forward-message",forwardMessage(socket))


    socket.on("delete-message",deleteMessage(socket))
    socket.on("read-messages",readMessages(socket))

    socket.on("typing",Typing)



    socket.on('join', (room) => {
      socket.join(room);
    });
  
    socket.on('offer', onOffer(socket));
  
    socket.on('answer',  onAnswer(socket));

    
    socket.on('ice-candidate', onCandidate(socket));

    socket.on('end-call', onEndCall(socket));


    socket.on('connect_error', err => console.log(err))
    socket.on('connect_failed', err => console.log(err))


    // Handle disconnection
    socket.on('disconnect',OnDisconnet(socket));
  });

};


