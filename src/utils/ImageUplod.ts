
import fs from "fs";

import ErrorHandler from "./utils-class.js";
import { TryCatchError } from "../middlewares/error.js";
import { MessageModel } from "../models/chatModel.js";
import { io } from "../index.js";
import { getRedisValue } from "../sockets/redis.js";
import { imagekit } from "../db/db-config.js";



/**
 * Middleware to handle uploading a single image file to ImageKit.
 * 
 * Reads the uploaded file from the request, uploads it to ImageKit under the profiles folder,
 * then attaches the resulting URL and fileId to `req.body`.
 * 
 * Calls `next()` if successful, or responds with status 500 and error message if failed.
 * 
 * @param {Request} req - Express request object, expects `req.file` to contain the uploaded file.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */

export const ImageFileUploader = TryCatchError(async (req, res , next)=>{
    try {
        const file = req?.file;
        if (!file) throw new Error("file not uploaded properly");
        const fileBuffer = fs.readFileSync(file.path);
        const result = await uploadToImageKit(fileBuffer,file.filename,true);
        req.body = {...req.body, profile: result.url, fileId: result.fileId };
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Error reading file', error });
    }
   
});


/**
 * Uploads a file buffer to ImageKit storage.
 * 
 * @param {Buffer} fileBuffer - The buffer containing the file data to upload.
 * @param {string} fileName - The desired name for the uploaded file.
 * @param {boolean} [profile=false] - Optional flag indicating whether the file is a profile image.
 *                                   If true, uploads to the "/profiles/" folder; otherwise, "/messages/".
 * @returns {Promise<any>} - The response from ImageKit after successful upload.
 * @throws {ErrorHandler} - Throws an error if the upload fails.
 */
export const uploadToImageKit = async(fileBuffer:Buffer,fileName:string,profile?:boolean) =>{
    try {
        const result = await imagekit.upload({
            file: fileBuffer,
            fileName,
            folder: profile?"/profiles/":"/messages/"
        });
        return result;
    } catch {
        throw new ErrorHandler("image upload failed",400,true);
    }
    
};



/**
 * Deletes a file from ImageKit storage by its file ID.
 * 
 * @param {string} fileId - The unique identifier of the file to delete in ImageKit.
 * @returns {Promise<any|null>} - Returns the deletion result on success, or null if an error occurs.
 */
export const DeleteFromImageKit = async(fileId:string)=>{
    try {
        const result = await imagekit.deleteFile(fileId);
        return result;
      } catch (error) {
        console.error("Error deleting file:", error);
        return null;
      }
};




/**
 * Uploads a file buffer to ImageKit and updates the message with the file's metadata.
 * Deletes the local file after upload and informs sender and recipient about the new file attachment.
 * 
 * @param {Buffer} fileBuffer - Buffer of the file to upload.
 * @param {string} fileName - Name of the file.
 * @param {string} filePath - Local file path to delete after upload.
 * @param {string} messageId - The message ID to update.
 * @param {string} _id - Sender user ID.
 * @param {string} participantId - Recipient user ID.
 * @param {string} chatId - Chat session ID.
 */
export const UploadAndInform = async(fileBuffer:Buffer,fileName:string,filePath:string,messageId:string,_id:string,participantId:string,chatId:string)=>{
    try {
        const message = await MessageModel.findById(messageId);
        if(!message)  throw new Error("there is no such messageId");
        
        const data = await uploadToImageKit(fileBuffer,fileName);
        if(!data) throw new Error("Failed to upload image properly");
    
        await message.updateOne({fileId:data.fileId,attach:data.url});
        fs.unlink(filePath,()=>{});

        const userId = await getRedisValue("active:"+_id);
        const Id = await getRedisValue("active:"+participantId);
        if(userId ) io.to(userId).emit("receive-message-files",{chatId,messageId,attach:data.url,fileId:data.fileId});
        if(Id ) io.to(Id).emit("receive-message-files",{chatId,messageId,attach:data.url,fileId:data.fileId});

    } catch {
        // silent error Handling
    }
   
    
};