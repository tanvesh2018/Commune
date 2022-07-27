const express = require("express");
const {chats} = require("./data/data");
const dotenv = require("dotenv")
const cors = require('cors');
const path = require('path');
const colors = require("colors");
const chatRoutes = require("./routes/chatRoutes")
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes")
const {notFound , errorHandler} = require('./middleware/errorMiddleware')
dotenv.config()
const app = express()

const mongoose = require('mongoose');
const { Socket } = require("socket.io");



mongoose
.connect(process.env.MONGO_URL, {
})
.then(() => {
    console.log('Connected to Mongo!');
})
.catch((err) => {
    console.error('Error connecting to Mongo', err);
});

app.use(express.json())

const corsOptions ={
    origin:'http://localhost:3000', 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}
app.use(cors(corsOptions));

// app.get('/' , (req , res) =>{
//     res.send("API is running")
// })

// app.get('/api/chat' , (req , res) =>{
//     res.send(chats);
// })


// app.get('/api/chat/:id' , (req , res) => {
//     const singleChat = chats.find(c=> c._id === req.params.id);
//     console.log(singleChat)
//     res.send(singleChat);
// })

// app.use(notFound)
// app.use(errorHandler)

app.use('/api/user' , userRoutes);
app.use('/api/chat' , chatRoutes);
app.use('/api/message' , messageRoutes);

const server = app.listen(5000 , console.log("Server Started on PORT 5000"));

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    // credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});