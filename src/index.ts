import dotenv from "dotenv";

import express from "express";
import userRoute from "./routes/user.js";
import chatRoute from "./routes/chats.js";
import messageRoute from "./routes/message.js";
import cors from 'cors';
import fs from "fs";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { initializeSocketIO } from "./sockets/app.js";
import { fileURLToPath } from 'url';

import http from "http";
import path from "path";

import { ConnectDB } from "./db/db-config.js";
import { errorMiddleware } from "./middlewares/error.js";


const app = express();

dotenv.config();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
];


if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push(
    'http://localhost:5173',
    'https://localhost',
    'http://192.168.0.109:5173',
    'http://192.168.56.1:5173',
    'https://192.168.0.109:5173'
  );
}

const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow request
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};


app.use(cors(corsOptions));

const server = http.createServer(app);

export const io = new Server(server, {
  cors: corsOptions,cookie:true,
  maxHttpBufferSize: 10 * 1024 * 1024 ,
  pingTimeout: 40000});


const port = 3000;


app.use(express.json());

app.use(cookieParser());


const dir = 'public';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
  fs.mkdirSync(dir+"/uploads");
  fs.mkdirSync(dir+"/profiles");
}



// Get the current directory name (similar to __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '..', 'public')));

import {  indexHtmlFile} from "./utils/text.js";

app.get('/', (req, res) => {
return res.status(200).send(indexHtmlFile)
});

app.use("/api/v1/user",userRoute);
app.use("/api/v1/chat",chatRoute);
app.use("/api/v1/message",messageRoute);

// socket io connection initializer
initializeSocketIO(io);


app.use(errorMiddleware);



ConnectDB().then(()=>{
  server.listen(port,'0.0.0.0', () => {
    return console.log(`Express is listening at port = ${port}`);
  });
}).catch(()=>console.log("database connection error"));