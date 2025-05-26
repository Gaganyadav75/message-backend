import { ContactType } from "./chats.js"

export type offertype = RTCOfferOptions
export type answertype = RTCAnswerOptions
export type candidatetype = RTCIceCandidate

export type onCallType ={
    chatId:string,
    from:ContactType,
    to:ContactType,
    offer:offertype,
    video:boolean
}

export type onAnswerType ={
    chatId:string,
    from:ContactType,
    to:ContactType,
    answer:answertype,
}

export type onCandidateType ={
    from:ContactType,
    to:ContactType,
    candidate:candidatetype,
}

export type onEndCallType ={
    chatId:string,
    to:ContactType,
}