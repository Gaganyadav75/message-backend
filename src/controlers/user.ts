import { TryCatchError } from "../middlewares/error.js"
import bcrypt from "bcryptjs";
import { UsersModel } from "../models/userModel.js";
import ErrorHandler from "../utils/utils-class.js";
import { conflict, notExists,  unacceptable, unauthorised } from "../utils/error-codes.js";
import {  SALT } from "../utils/utils-variables.js";
import { generateToken, setCookieToFrontend, verifyToken } from "../utils/jwt-functions.js";
import { generateOTP, OtpCodeEmail, SendEmail, VerificationEmail } from "../utils/sendEmail.js";
import { EmailSendingOption } from "../types/types.js";

import { DeleteFromImageKit } from "../utils/ImageUplod.js";

// it will get All the User and return it to frontend


const tokenExpiry = 97500004;


/**
 * @function userVerified
 * @description Validates if a user exists in the database by checking either their email or username. Also ensures the user's email is verified.
 *
 * @param {string} id - The user's identifier, either an email or username.
 *
 * @throws {ErrorHandler} If the user does not exist or if the user's email is not verified.
 *
 * @returns {Object} The user object from the database.
 */

const userVerified = async(id:string)=>{

    const user = await UsersModel.findOne({$or:[{email:id},{username:id}]})

    if (!user) {
        throw new ErrorHandler("User not Exists",conflict,true)
    }

    if (!user.verified) {
        throw new ErrorHandler("Email verification pending",unauthorised,true)
    }

    return user;

}





/**
 * @function checkAlreadyHaveAccount
 * @description Checks if a user account already exists with the provided username or email.
 *
 * @param {string} username - The desired username to check.
 * @param {string} email - The email address to check.
 *
 * @throws {ErrorHandler} If either the username or email is already registered.
 *
 * @returns {boolean} Returns `false` if no account exists with the given credentials.
 */

const checkAlreadyHaveAccount = async(username:string,email:string)=>{

    let user = undefined;
    if (username) {
        user = await UsersModel.findOne({username})

        if (user) {
            throw new ErrorHandler("User already exists",conflict,true)
        }
        user = await UsersModel.findOne({email})

        if (user) {
            throw new ErrorHandler("Email already exists",conflict,true)
        }
    }
   
    return false;

}







/**
 * @function getUser
 * @description Authenticates a user based on the provided credentials (username and password). If successful, sets a token in a secure cookie and returns user information.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body containing `username`, `password`, and optional `remember` flag.
 * @param {string} req.body.username - The username or ID used for login.
 * @param {string} req.body.password - The user's password.
 * @param {boolean} [req.body.remember] - Optional flag indicating if session should persist longer.
 * 
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} Throws an error if required fields are missing or if authentication fails.
 *
 * @returns {Object} JSON response containing:
 * - `success` (boolean): Indicates success.
 * - `message` (string): A success message.
 * - `user` (Object): Contains `_id`, `username`, `dob`, `gender`, `profile`, `email`, and `bio`.
 */


export const getUser = TryCatchError(async(req,res) =>{
    const {id,password} =  req.body;

    if (!id || !password) {
        throw new ErrorHandler("Required Feilds Not Provided",unacceptable)
    }

    const user = await userVerified(id);

    const {_id,dob,gender,profile,email,bio} = user;

    const passwordChecked =  await bcrypt.compare(String(password),String(user?.password)) 

    if(user?.loginattempt && user.loginattempt>=3){

        const token = generateToken({_id:String(user._id),username:user.username},"1d")

        const mailOptions = {
            to: email, // Recipient email address
            subject: 'HII HELLO VERIFICATION EMAIL', // Subject line
            html:VerificationEmail(token,email)// Email body
        } as EmailSendingOption;

        await SendEmail(mailOptions)

        user.verified = false;
        user.save()

        throw new ErrorHandler("too many attempt verify email first",unacceptable,true)
    }

    if (!passwordChecked) {
        user.loginattempt = (user.loginattempt||0)+1;
        user.save();
        throw new ErrorHandler(`Passwor Incorrect ${3-(user?.loginattempt)} more try`,unacceptable,true)
    }

    const token = generateToken({_id:String(_id),username:user.username},undefined)
    setCookieToFrontend(res,"token",token,tokenExpiry,true)
    user.loginattempt = 0;
    await user.save();
    return res.json({success:true,message:"successfull",user:{_id,username:user.username,dob,gender,profile,email,bio}})
})







/**
 * @function AuthToken
 * @description Validates the presence of an authenticated user in the request. If present, returns the user’s details.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body.
 * @param {Object} req.body.user - The authenticated user object (typically injected by middleware).
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If no user is found in the request body.
 *
 * @returns {Object} JSON response containing:
 * - `success` (boolean): Indicates the request was successful.
 * - `message` (string): Response message.
 * - `user` (Object): The authenticated user's details (`_id`, `username`, `dob`, `gender`, `profile`, `email`, `fullname`, `bio`).
 */

export const AuthToken = TryCatchError(async(req,res) =>{

    const user = req.body.user;
    if (!user) {
        throw new ErrorHandler("User not Exists",notExists,true)
    }
    const {_id,username,dob,gender,profile,email,fullname,bio} = user;


    return res.json({success:true,message:"successfull",user:{_id,username,dob,gender,profile,email,fullname,bio}})
})










/**
 * @function verifyEmail
 * @description Verifies a user's email using a token passed as a query parameter. If valid, updates the user's verification status and sets a token cookie.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.query - The request query containing the token.
 * @param {string} req.query.token - The verification token.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If the token is missing, invalid, the user is not found, or the user is already verified.
 *
 * @returns {Object} JSON response containing:
 * - `success` (boolean): Indicates success.
 * - `message` (string): A confirmation message.
 * - `user` (Object): Contains `id`, `username`, `dob`, `gender`, `profile`, `email`, `fullname`, and `bio`.
 */


export const verifyEmail = TryCatchError(async(req,res) =>{

    const {token} =  req.query;

    if (!token) {
        throw new ErrorHandler("token not provided",unacceptable)
    }

    const data = verifyToken(String(token))

    if (!data) {
        throw new ErrorHandler("user not found",unacceptable)
    }

    // add email verification here with google to be continued
    const user = await UsersModel.findOne({_id:data._id})

    if (!user) {
        throw new ErrorHandler("User not Exists",notExists,true)
    }

    if (user.verified) {
        throw new ErrorHandler("User already verified",notExists,true)
    }
    user.loginattempt = 0;
    user.verified = true;

    user.save();

    
    const {_id,username,dob,gender,profile,email,fullname,bio} = user

    setCookieToFrontend(res,"token",String(token),tokenExpiry)


    return res.json({success:true,message:"Email verified successfully",user:{id:_id,username,dob,gender,profile,email,fullname,bio}})
})








/**
 * @function resendEmail
 * @description Re-sends a verification email to a user who has not yet verified their account. Validates user credentials and sends a new token.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.query - The request query containing login credentials.
 * @param {string} req.query.id - Username or email of the user.
 * @param {string} req.query.password - User’s password for verification.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If required fields are missing, the user is not found, password is incorrect, or the user is already verified.
 *
 * @returns {Object} JSON response indicating that the email has been resent successfully.
 */



export const resendEmail = TryCatchError(async(req,res) =>{
    const {id,password}  =  req.query;

    if (!id  || !password) {
        throw new ErrorHandler("Required Feilds Not Entered",unacceptable)
    }
    const user = await UsersModel.findOne({$or:[{email:id},{username:id}]})

    if (!user) {
        throw new ErrorHandler("User not Exists",conflict,true)
    }

    const passwordChecked =  await bcrypt.compare(String(password),String(user?.password)) 

    if (!passwordChecked) {
        throw new ErrorHandler("incorrect password",conflict,true)
    }
    if (user.verified) {
        throw new ErrorHandler("Email already verified",unauthorised,true)
    }
    if(user.resendattempt && user.resendattempt>=3){
         throw new ErrorHandler("Resend attempts are over",unauthorised,true)
    }
    user.resendattempt = !user.resendattempt?1:user.resendattempt+1;

    await user.save();

    const token = generateToken({_id:String(user._id),username:user.username},undefined)

    setCookieToFrontend(res,"token",'',0)

    const mailOptions = {
        to: user.email,
        subject: 'HII HELLO VERIFICATION EMAIL', // Subject line
        html:VerificationEmail(token,user.email||"")// Email body
    } as EmailSendingOption;

     await SendEmail(mailOptions)
     
    return res.json({success:true,message:"verification email resent successfully"})
   
})








/**
 * @function newUser
 * @description Handles new user registration. Validates input, checks for existing accounts, hashes the password, stores the user in the database, generates a verification token, and sends a verification email.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Contains the user's registration data.
 * @param {string} req.body.username - The desired username.
 * @param {string} req.body.email - The user's email address.
 * @param {string} req.body.password - The user's password.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If required fields are missing or an account already exists with the same username or email.
 *
 * @returns {Object} JSON response confirming the user was created and a verification email was sent.
 */


export const newUser = TryCatchError(async(req,res) =>{
    const {username,email,password} =  req.body

    if (!username  || !email || !password) {
        throw new ErrorHandler("Required Feilds Not Entered",unacceptable)
    }

    await checkAlreadyHaveAccount(username,email)


    const hashedpassword =  bcrypt.hashSync(password,SALT)

    const user = await UsersModel.create({username,email,password:hashedpassword})

    const token = generateToken({_id:String(user._id),username},"1d")


    const mailOptions = {
        to: email, // Recipient email address
        subject: 'HII HELLO VERIFICATION EMAIL', // Subject line
        html:VerificationEmail(token,email)// Email body
    } as EmailSendingOption;

     await SendEmail(mailOptions)
     
    return res.json({success:true,message:"verification email sent successfully"})
   
})










/**
 * @function updateBio
 * @description Updates the bio of an authenticated user based on the provided token data.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Contains the token data and new bio.
 * @param {Object} req.body.tokenData - Data extracted from the authentication token.
 * @param {string} req.body.tokenData._id - The authenticated user's ID.
 * @param {string} req.body.bio - The new bio to be updated.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If required fields are missing.
 *
 * @returns {Object} JSON response confirming that the bio was updated.
 */


export const updateBio = TryCatchError(async(req,res) =>{

    const {tokenData,bio} = req.body
    
    if (!tokenData || !tokenData._id ||!bio) {
        throw new ErrorHandler("Required Feilds Not Entered",unacceptable)
    }
 
    await UsersModel.updateOne({_id:tokenData._id},{bio})

    return res.json({success:true,message:"bio updated successfully",bio})
})







/**
 * @function updateProfile
 * @description Updates the user's profile picture and fileId. Deletes the old profile image from storage if it exists.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Contains the new profile URL/path, new fileId, and authenticated user object.
 * @param {string} req.body.profile - New profile image URL or path.
 * @param {string} req.body.fileId - New file identifier for the uploaded profile image.
 * @param {Object} req.body.user - Authenticated user object.
 * @param {string} req.body.user._id - User's ID.
 * @param {string} req.body.user.fileId - Previous profile image's file ID.
 * @param {string} req.body.user.profile - Previous profile image URL or path.
 * @param {Object} req.file - Uploaded file object (new profile image).
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If required file or user data is missing or invalid.
 *
 * @returns {Object} JSON response confirming profile update with the new profile and fileId.
 */

export const updateProfile = TryCatchError(async (req, res) => {
    const newProfile = req.body.profile;
    const newFileId = req.body.fileId;
    const file = req.file;
    const { _id, fileId, profile } = req.body.user;

    if (!file || !req.body.user || !file.filename) {
        throw new ErrorHandler("something went wrong", unacceptable);
    }

    if (profile && fileId) {
        DeleteFromImageKit(fileId);
    }

    await UsersModel.updateOne({ _id }, { profile: newProfile, fileId: newFileId });

    return res.json({ success: true, message: "profile updated!", user: { profile: newProfile, fileId: newFileId } });
});




/**
 * @function updateUserData
 * @description Updates the user's email, username, or bio. If email is changed, sends a verification email and marks user as unverified.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Contains tokenData and fields to update (email, username, bio).
 * @param {Object} req.body.tokenData - Authenticated user's token data.
 * @param {string} req.body.tokenData._id - User's ID.
 * @param {string} [req.body.email] - New email address.
 * @param {string} [req.body.username] - New username.
 * @param {string} [req.body.bio] - New bio.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If required fields are missing or if email/username already exists.
 *
 * @returns {Object} JSON response confirming the update and the updated field.
 */
export const updateUserData = TryCatchError(async (req, res) => {
    const { tokenData, email, bio, username } = req.body;

    if (!tokenData || !tokenData._id) {
        throw new ErrorHandler("Required Feilds Not Entered", unacceptable);
    }

    if (email) {
        let other = await UsersModel.findOne({ email });
        if (other) {
            throw new ErrorHandler("Email already exists", unacceptable);
        }
        const token = generateToken({ _id: String(tokenData._id), username: tokenData.username }, "1d");
        await UsersModel.updateOne({ _id: tokenData._id }, { email, verified: false, token });
        const mailOptions = {
            to: email,
            subject: 'HII HELLO VERIFICATION EMAIL',
            html: VerificationEmail(token, email)
        } as EmailSendingOption;

        await SendEmail(mailOptions);
        setCookieToFrontend(res, "token", '', 0);
        return res.json({ success: true, message: "verification email sent!", data: { email } });
    } else if (username) {
        let other = await UsersModel.findOne({ username });
        if (other) {
            throw new ErrorHandler("uername already exists", unacceptable);
        }
        await UsersModel.updateOne({ _id: tokenData._id }, { username });
        return res.json({ success: true, message: "username updated successfully", data: { username } });
    } else if (bio) {
        await UsersModel.updateOne({ _id: tokenData._id }, { bio });
        return res.json({ success: true, message: "bio updated successfully", data: { bio } });
    } else {
        throw new ErrorHandler("Required fields not provided", unacceptable);
    }
});






/**
 * @function deleteUser
 * @description Deletes the authenticated user from the database based on the JWT token provided in the authorization header.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.headers - HTTP headers containing the authorization token.
 * @param {string} req.headers.authorization - Bearer token for authentication.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If the token is missing, invalid, or the user does not exist.
 *
 * @returns {Object} JSON response confirming the user was deleted successfully.
 */


export const deleteUser = TryCatchError(async(req,res) =>{

    const headerdata = req.headers?.authorization?.split(" ")[1];

    const verifiedtoken = verifyToken(String(headerdata))

    const user = await userVerified(verifiedtoken?._id)

    user.deleteOne();

    return res.json({success:true,message:"user deleted successfully"})
})






/**
 * @function logoutUser
 * @description Logs out the user by clearing the authentication token cookie.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 *
 * @returns {Object} JSON response confirming the user has been logged out.
 */


export const logoutUser = TryCatchError(async(req,res) =>{

    res.cookie('token', '', { expires: new Date(0), httpOnly: true, path: '/' });

    return res.json({success:true,message:"user deleted successfully"})
})







/**
 * @function searchUser
 * @description Searches for users whose username or email starts with the given query string (case-insensitive).
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.query - Query parameters.
 * @param {string} req.query.username - The username or email prefix to search for.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If the username query parameter is not provided.
 *
 * @returns {Object} JSON response containing matched users with selected fields.
 */


export const searchUser = TryCatchError(async(req,res) =>{

    const {username} =  req.query;

    if (!username) {
        throw new ErrorHandler("Required Feilds Not Entered",unacceptable)
    }

    const usersData = await UsersModel.find({$or:[{username:{ $regex: `^${username}`, $options: 'i' }},{email: { $regex: `^${username}`, $options: 'i' }}]})

    const users = usersData.map((user)=>{
        return {
            _id:user._id,
            username:user.username,
            email:user.email,
            profile:user.profile,
            bio:user.bio || "hey how's going!",
        }
    })

    return res.json({success:true,message:`username start with ${username}`,users:users})
   
})







/**
 * @function forgotSendCode
 * @description Sends a password reset OTP to the user's email if the account exists and is verified. Limits resend attempts.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.query - Query parameters.
 * @param {string} req.query.email - The user's email address.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If the email is missing, user does not exist, email is not verified, or resend attempts are exceeded.
 *
 * @returns {Object} JSON response confirming that the password reset OTP was sent.
 */
export const forgotSendCode = TryCatchError(async(req,res) =>{

      const {email}  =  req.query;

      console.log({email})

    if (!email) {
        throw new ErrorHandler("Required Feilds Not Entered",unacceptable)
    }
    const user = await UsersModel.findOne({email})

    if (!user) {
        throw new ErrorHandler("User not Exists",conflict,true)
    }

    if (!user.verified) {
        throw new ErrorHandler("Email not verified",unauthorised,true)
    }

    if(user.resendattempt && user.resendattempt>=3){
         throw new ErrorHandler("Resend attempts are over",unauthorised,true)
    }
    user.resendattempt = !user.resendattempt?1:user.resendattempt+1;

    const otp = generateOTP();
    user.forgototp = otp;

    await user.save();

    const mailOptions = {
        to: user.email,
        subject: 'HII HELLO - Password Reset OTP', 
        html:OtpCodeEmail(otp)
    } as EmailSendingOption;

     await SendEmail(mailOptions)
     
    return res.json({success:true,message:"password reset otp sent"})
   
})

/**
 * @function forgotCodeVerify
 * @description Verifies the OTP sent to the user's email and resets the password if valid. Limits verification attempts and prevents reusing the previous password.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Request body.
 * @param {string} req.body.email - The user's email address.
 * @param {string} req.body.otp - The OTP sent to the user's email.
 * @param {string} req.body.password - The new password to set.
 *
 * @param {Object} res - Express response object.
 *
 * @throws {ErrorHandler} If required fields are missing, OTP or password format is invalid, user does not exist, email is not verified, attempts are exceeded, password is reused, or OTP is incorrect.
 *
 * @returns {Object} JSON response confirming that the password was reset.
 */
export const forgotCodeVerify = TryCatchError(async(req,res) =>{

      const {password,otp,email} = req.body;

    if (!email || !otp ||!password ) {
        throw new ErrorHandler("Required Feilds Not Entered",unacceptable)
    }

    if(otp.length!=6 ){
         throw new ErrorHandler("otp should be of 6 digits",unacceptable)
    } 
    if(password.length < 6){
         throw new ErrorHandler("password should be of min 6 digits",unacceptable)
    }

    const user = await UsersModel.findOne({email})

    if (!user) {
        throw new ErrorHandler("User not Exists",conflict,true)
    }

    if (!user.verified) {
        throw new ErrorHandler("Email not verified",unauthorised,true)
    }

    if(user.forgotattempt && user.forgotattempt>=5){
         throw new ErrorHandler("Resend attempts are over",unauthorised,true)
    }
    user.forgotattempt = !user.forgotattempt?1:user.forgotattempt+1;

    await user.save();

    const passwordChecked =  await bcrypt.compare(String(password),String(user?.password)) 
    if(passwordChecked){
        throw new ErrorHandler("password is same as previous",unauthorised,true)
    }
    
    if(user.forgototp!=otp){
         throw new ErrorHandler("OTP is not correct",unauthorised,true)
    }

    user.forgotattempt = 0;
    user.forgototp = undefined;
    user.password =  bcrypt.hashSync(password,SALT);

    await user.save();

    return res.json({success:true,message:"password reset"})
   
})


