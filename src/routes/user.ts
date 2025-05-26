import express from 'express'
import { AuthToken, forgotCodeVerify, forgotSendCode, getUser, logoutUser, newUser, resendEmail, searchUser, updateUserData, updateProfile,  verifyEmail } from '../controlers/user.js'
import upload from '../utils/uploadImage.js'
import { ImageFileUploader } from '../utils/ImageUplod.js'
import { userVerifiedMiddleware, VerifyTokenMiddleware } from '../middlewares/user.js'

// upload.single("profile")

const app = express.Router()


app.post("/",getUser)
app.delete("/",logoutUser)
app.get("/auth",VerifyTokenMiddleware,userVerifiedMiddleware,AuthToken)
app.get("/verify",verifyEmail)
app.get("/resend",resendEmail)
app.get("/search",searchUser)
app.post("/profile",upload.single('profile'),VerifyTokenMiddleware,userVerifiedMiddleware,ImageFileUploader,updateProfile)
app.post("/new",newUser)
app.post("/update",VerifyTokenMiddleware,updateUserData)
app.get("/forgot",forgotSendCode)
app.post("/forgot",forgotCodeVerify)


export default app