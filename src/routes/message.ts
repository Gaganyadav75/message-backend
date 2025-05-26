import express from 'express'
import { getMessages } from '../controlers/message.js'
import { VerifyTokenMiddleware } from '../middlewares/user.js'

const app = express.Router()


app.post('/',VerifyTokenMiddleware,getMessages)



export default app

