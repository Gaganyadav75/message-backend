import express from 'express'
import { addChats, blockChat, deleteChat, getChats, unBlockChat } from '../controlers/chats.js'
import { userVerifiedMiddleware, VerifyTokenMiddleware } from '../middlewares/user.js'


const app = express.Router()


app.get("/",VerifyTokenMiddleware,getChats)
app.post("/",VerifyTokenMiddleware,userVerifiedMiddleware,addChats)
app.delete("/",VerifyTokenMiddleware,userVerifiedMiddleware,deleteChat)


app.post("/block",VerifyTokenMiddleware,userVerifiedMiddleware,blockChat)
app.post("/unblock",VerifyTokenMiddleware,userVerifiedMiddleware,unBlockChat)




export default app