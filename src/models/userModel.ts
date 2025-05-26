
import mongoose, { Types } from "mongoose";

const Schema = mongoose.Schema;

type Gender = "male" | "female" | "other";

export interface UserModelType {
    _id:Types.ObjectId;
    profile?: string;
    username: string;
    fullname?: string;
    bio?: string;
    email: string;
    dob?: string;
    gender?: Gender;
    password?: string;
    fileId?: string;
    role?: string;
    verified?: boolean;
    token?: string;
    loginattempt?: number;
    resendattempt?: number;
    forgotattempt?: number;
    forgototp?: string;
    isOnline?: boolean;
};


const userSchema = new Schema<UserModelType>({
    profile:String,
    username: {type:String,require:true},
    fullname: {type:String},
    email:{type:String,require:true,unique:true},
    dob:{type:String},
    gender:{type:String,enum:["male","female","other"],default:"other"},
    password:String,
    fileId:String,
    role:{type:String,default:"user"},
    verified:{type:Boolean,default:false},
    token:{type:String},
    loginattempt:{type:Number,default:0},
    resendattempt:{type:Number,default:0},
    forgotattempt:{type:Number,default:0},
    forgototp:{type:String},
    bio:{type:String,default:"hey how's going!"},
    isOnline:{type:Boolean,default:false}
});


export const UsersModel = mongoose.model('users', userSchema);
