# Messaging App Backend

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This is the backend server for a real-time messaging application, built with Node.js, Express, MongoDB, Redis, and Socket.IO. It provides a robust and scalable foundation for real-time communication, user management, and media handling.

---

## ✨ Features

- **🔒 User Authentication:** Secure user registration, login, and logout using JWT and secure cookie storage.
- **💬 Real-time Messaging:** Send and receive text and media messages instantly using Socket.IO.
- **🖼️ Media Support:** Seamlessly handle images, videos, audio, and various file types in messages.
- **📞 Call Offers:** Implement WebRTC signaling for initiating and managing audio/video calls.
- **🟢 User Presence:** Track user online/offline status in real-time using Redis.
- **✅ Message Status:** Monitor message delivery (sent, unread, read) and enable message deletion.
- **📤 File Upload:** Integrate with ImageKit for efficient and reliable media uploads and storage.
- **⚠️ Error Handling:** Centralized middleware for consistent and informative error responses.
- **📧 Email Notifications:** Send email notifications for user-related events using Nodemailer.

---

## 🛠️ Technologies Used

- **Node.js & Express**
- **MongoDB with Mongoose**
- **Redis**
- **Socket.IO**
- **ImageKit**
- **JSON Web Tokens (JWT)**
- **Nodemailer**

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed and configured:

- **Node.js (v14+)**: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
- **MongoDB**: [https://www.mongodb.com/docs/manual/installation/](https://www.mongodb.com/docs/manual/installation/)
- **Redis**: [https://redis.io/docs/getting-started/installation/](https://redis.io/docs/getting-started/installation/)
- **ImageKit Account**: [https://imagekit.io/](https://imagekit.io/)
- **SMTP Credentials** (e.g., Gmail, SendGrid)

---

## 🚀 Installation & Setup

Follow these steps to get the backend server up and running:

### 1. Clone the Repository

```bash
git clone [https://github.com/yourusername/messaging-app-backend.git](https://github.com/yourusername/messaging-app-backend.git)
cd messaging-app-backend
### 2. Install Dependencies

Bash

npm install
3. Setup Environment Variables
Create a .env file in the root directory and add the following variables:

Code snippet

MONGODBURI=mongodb://your-mongo-uri
REDIS_URL=redis://localhost:6379
EMAIL_USERNAME=your-email@example.com
EMAIL_PASSWORD=your-email-password
SECRET_TOKEN_KEY=your_jwt_secret
FRONTEND_DOMAIN=your-frontend-domain.com
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
PORT=5000
Important: Replace the placeholder values with your actual configurations.

4. Run the Server
Bash

npm start
The server will start on http://localhost:5000 (or the port in .env).

Post Installation
Connect Frontend: Configure your frontend to connect to this backend's URL for API calls and Socket.IO.
Database Initialization: MongoDB collections are created automatically as needed.
Redis Connection: Ensure Redis is running at the REDIS_URL.
Testing: Use tools like Postman for API testing and a Socket.IO client for real-time features.
Media Uploads: Files are temporarily stored on the server before being uploaded to ImageKit. Verify your ImageKit credentials.
Available Scripts
npm start: Runs the server in production mode.
npm run dev: Runs the server with nodemon for development.
API Endpoints & Socket.IO Events
Refer to the source code for detailed routes and events including:

Authentication: login, register, logout
Messaging: send, forward, delete, read messages
Calls: offer, candidate, end-call signaling
User Presence: online/offline notifications
File Upload: Profile images and message attachments
🤝 Contributing
Contributions are welcome! Fork the repo and submit pull requests.

📜 License
MIT License

📧 Contact
If you have any questions or need support, please open an issue or contact the maintainer.

Would you like me to generate a Postman collection or create more detailed API documentation based on this information?