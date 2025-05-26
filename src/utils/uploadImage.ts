import multer, { StorageEngine } from 'multer';
import path from 'path';
import { Request } from 'express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const destinationPath = path.join(__dirname, '..', '..', 'public', 'profiles');
    cb(null, destinationPath); 
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `${Date.now()}-${file.originalname}`); 
  },
});

const upload = multer({ storage: storage,limits: { fileSize: 2 * 1024 * 1024 }, });
export default upload;
