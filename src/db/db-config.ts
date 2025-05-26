import ImageKit from 'imagekit';
import mongoose from 'mongoose';

import dotenv from 'dotenv'

dotenv.config()

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY!;
const privateKey=  process.env.IMAGEKIT_PRIVATE_KEY!;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT!;
export const imagekit = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint
});


/**
 * Establishes a connection to the MongoDB database using Mongoose.
 * Exits the process if the connection fails.
 * 
 * @returns {Promise<mongoose.Connection>} The mongoose connection object.
 */
export const ConnectDB = async () => {
  try {
    // Connect to the MongoDB database
    const MongoDB = await mongoose.connect(process.env.MONGODBURI!);
    
    return MongoDB;
  } catch (error:any) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1); // Exit the process if connection fails
  }
};
