require('dotenv-safe').config()

const app = require('express')();
const cors = require('cors');
const fs = require('fs');
var mime = require("mime-types");

app.options('*', cors())
const initMongo = require('./config/mongo')
const Room = require('./app/models/room')
const Chat = require('./app/models/chat')
const uuid = require('uuid')
const User = require('./app/models/user')
const Quote = require("./app/models/quotes");
const ResolutionCenter = require("./app/models/resolution_center");
const ServiceBooking = require("./app/models/service_booking");
const {
  createItem,
  getItemThroughId,
  updateItemThroughId,
  updateItem,
  updateItems,
  countDocuments,
  deleteItem,
  getItemsCustom,
  aggregateCollection,
  getItemCustom,
  sendNotification,
} = require("./app/shared/core");
var mongoose = require("mongoose");

// const Room = require("./app/models/room");
// const Chat = require("../models/chat");

const AWS = require("aws-sdk");
const { resolve } = require('path');
const BUCKET = process.env.AWS_BUCKET_NAME;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const REGION = process.env.AWS_BUCKET_REGION;

var options = {
  key: fs.readFileSync('/etc/letsencrypt/live/developers.promaticstechnologies.com/privkey.pem', 'utf8'),
  cert: fs.readFileSync('/etc/letsencrypt/live/developers.promaticstechnologies.com/fullchain.pem', 'utf8')
  //key: fs.readFileSync('/var/www/html/privkey.pem', 'utf8'),
  //cert: fs.readFileSync('/var/www/html/fullchain.pem', 'utf8')
};


const https = require('https').createServer(options, app);
const io = require('socket.io')(https, { // for cors purpose
  cors: {
    origin: "*", // allowed any origin
  }
});
const port = process.env.SOCKET_PORT || 5010;

io.on('connection', (socket) => {
  console.log("Socket connected...", socket.client.conn.server.clientsCount)

  // For send message and recieve
  socket.on('chat_message', async msg => {
    console.log('chat msg)))))', typeof (msg), msg);

    if (typeof (msg) == "string") {
      msg = JSON.parse(msg)
    }
    const added = await Chat.create({
      room_id: msg.room_id,
      message: msg.message,
      primary_room_id: msg.primary_room_id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
    })

    // socket.join(msg.room_id);
    io.to(msg.room_id).emit('chat_message', added);
    console.log("***********", added);

    // io.to(msg.room_id).emit('chat message', msg);
  });

  async function getChatDetail(data){
    return new Promise(async(resolve,reject)=> {
      try{
        const getChat = await Chat.aggregate([
          {
            $match: {_id:data._id},
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender_id",
              as: "senderDetails",
            },
          },
          {
            $unwind: "$senderDetails",
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "receiver_id",
              as: "receiverDetails",
            },
          },
          {
            $lookup: {
              from: "quotes",
              localField: "quote_id",
              foreignField: "_id",
              as: "quoteDetails",
            },
          },
          {
            $unwind: {
              path: "$quoteDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ]).then((response) => {
          console.log(`done! - `, response);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });

      }catch(err){
        console.log(err);
      }
    })
  }

  async function uploadImage(object) {
    return new Promise((resolve, reject) => {
      console.log({
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
        region: REGION,
      });

      // console.log('O B J E C T ==============>>',object)
      var obj = object.image_data;
      // console.log('O B J ==============>>',obj)

      var imageRemoteName =
        object.path +
        "/" +
        Date.now() +
        obj.name
          .replace(/[^.,a-zA-Z0-9]/g, "")
          .replace(/ /g, "_")
          .toLowerCase();

      AWS.config.update({
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
        region: REGION,
      });

      var s3 = new AWS.S3();
      s3.upload({
        Bucket: BUCKET,
        Body: obj.data,
        Key: imageRemoteName,
      })
        .promise()
        .then((response) => {
          console.log(`done! - `, response);
          resolve(response.Location);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  socket.on('media message', async msg => {
    console.log("media message data",msg);
    // var image_name = await uploadImage({
    //   image_data: req.files.image,
    //   path: __dir + "public/chatmedia",
    // });
    const contentType = mime.lookup(msg.attachment_name);

    const attachments = {
      name : msg.attachment_name,
      mime: contentType,
      size: msg.attachment_size,
      url: msg.attachment
    }

    var ObjChat = {
      room_id: msg.room_id,
      message: msg.message,
      primary_room_id: msg.primary_room_id,
      sender_id: msg.sender_id,
      message_type: "media",
      message_type: msg.message_type,
      contract_id: msg.contract_id,
      attachments: attachments,
      receiver_id: msg.receiver_id,
    }

    if(msg.booking_id){
      ObjChat.booking_id = msg.booking_id
    }

    const added = await Chat.create(ObjChat)

    console.log("added",added);

    io.to(msg.room_id).emit('media message', added);



    // io.to(msg.room_id).emit('chat message', msg);
  });

  // For join room
  socket.on('room join', (msg) => {
    socket.join(msg.room_id);
    console.log('Room joined -> ', msg.room_id)
    io.to(msg.room_id).emit('room join', msg)
  })

  socket.on('leave room', (msg) => {
    console.log('LEAVING', msg)
    socket.leave(msg.room_id);
    io.to(msg.room_id).emit('leave room', msg)
  })

  // socket.on('total joinee', (msg) => {
  //   msg.total = io.sockets.adapter.rooms.get(msg.room_id).size
  //   console.log('Total -> ', msg.total)
  //   io.to(msg.room_id).emit('total joinee',msg)
  // })

  socket.on("block", (msg) => {
    console.log("block", msg);
    io.to(msg.room_id).emit("block", msg);
  });

  socket.on("unblock", (msg) => {
    io.to(msg.room_id).emit("unblock", msg);
  });

  socket.on('typing', (msg) => {
    console.log(msg)
    io.to(msg.room_id).emit('typing', msg)
  })
  socket.on('type out', (msg) => {
    console.log(msg)
    io.to(msg.room_id).emit('type out', msg)
  })
  // socket.on('end chat', msg => {
  //   io.to(msg.room_id).emit('end chat', msg)
  // })
  // socket.on('check status', async msg => {
  //   const status = await User.findById(msg.user_id, "is_online")
  //   msg.is_online = status.is_online
  //   io.to(msg.room_id).emit('check status', msg)
  // })
  socket.on('seen message', async msg => {
    await Chat.updateOne({
      _id: msg.msg_id
    },
      {
        seen: true
      })

    io.to(msg.room_id).emit('seen message', msg)
  })

  socket.on('last active', async msg => {
    const lastActiveTime = new Date()
    const update = await User.updateOne({
      _id: msg.user_id
    },
      {
        last_active: lastActiveTime
      })

      var last_active_time = {
        last_active : lastActiveTime
      }

    io.to(msg.user_id).emit('last active', last_active_time)
  })

  socket.on('decline offer', async msg => {
    const update = await Quote.updateOne({
      _id: msg.quote_id,
    },
      {
        status: 'rejected'
      })
      console.log("msg in decline offer",msg);
      console.log("msg in decline offer",update);

    io.to(msg.user_id).emit('decline offer', msg)

  })

  // socket.on('withdraw offer', async msg => {
  //  const update = await Quote.updateOne({
  //     _id: msg.quote_id,
  //   },
  //     {
  //       status: 'withdrawn'
  //     })
  //     console.log("msg withdraw offer",msg);
  //     console.log("msg withdraw offer",update);


  //   io.to(msg.user_id).emit(' withdraw offer', msg)

  // })

  socket.on('rfq', async msg => {

    // const get_quote_info = await Quote.findOne({_id:msg.quote_id});
    // console.log("RFG");

    // const getRoom = await Room.findOne({room_id:msg.room_id});

      // const added = await Chat.create({
      //   room_id: msg.room_id,
      //   quote_id: get_quote_info._id,
      //   message_type: "quote",
      //   primary_room_id: getRoom._id,
      //   sender_id: getRoom.sender_id,
      //   receiver_id: getRoom.receiver_id,
      // })

      console.log("MSG",msg);

    const getChat1 = await Chat.findOne({_id:msg.message_id}).populate('quote_id');
    
    const getChat = await getChatDetail(getChat1)

    console.log("RFQ",getChat);
    
    io.to(msg.room_id).emit('rfq', getChat)

  })

  socket.on('create offer', async msg => {
    const getChat1 = await Chat.findOne({_id:msg.message_id}).populate('quote_id');
    
    const getChat = await getChatDetail(getChat1)

    console.log("create offer---->",getChat);
    io.to(msg.room_id).emit('create offer', getChat)
  })

  socket.on('withdraw offer', async msg => {
    const getChat1 = await Chat.findOne({_id:msg.message_id}).populate('quote_id');
    
    const getChat = await getChatDetail(getChat1)

    console.log("create offer---->",getChat);
    io.to(msg.room_id).emit('withdraw offer', getChat)
  })

  socket.on('decline offer', async msg => {
    const getChat1 = await Chat.findOne({_id:msg.message_id}).populate('quote_id');
    
    const getChat = await getChatDetail(getChat1)

    console.log("create offer---->",getChat);
    io.to(msg.room_id).emit('decline offer', getChat)
  })

  socket.on('cancel request', async msg => {

    const Cancel_Order = await ServiceBooking.updateOne(
      {_id: mongoose.Types.ObjectId(msg.booking_id)},
      {
        $set: {
          status: 'cancelled',
        },
      }
    );

    const update_dispute = await ResolutionCenter.updateOne(
      {
        booking_id: mongoose.Types.ObjectId(msg.booking_id),
      },
      {
        $set: {cancel_description:msg.cancel_description, cancellation_request: msg.cancellation_request},
      }
    );

    console.log("create offer---->",Cancel_Order);
    io.to(msg.room_id).emit('cancel request', Cancel_Order)
  })

  socket.on('update dispute', async msg => {

    console.log("UPDATE DISPUTE",msg);
    
    const update_dispute = await ResolutionCenter.updateOne(
      {
        booking_id: mongoose.Types.ObjectId(msg.booking_id),
      },
      {
        $set: {is_dispute:msg.is_dispute},
      }
    );

    if(msg.chat_id){

      const Update_dispute_inChat = await Chat.updateOne(
        {
          _id: mongoose.Types.ObjectId(msg.chat_id),
        },
        {
          $set: {"dispute.data.is_dispute":msg.is_dispute},
        }
      );
    }


    if(msg.question_one === 'first'){
      console.log("Accepted");
    }

    if(msg.question_one === 'second'){
      if(msg.is_dispute == 'accepted'){
        const Cancel_Order = await ServiceBooking.updateOne(
          {_id: mongoose.Types.ObjectId(msg.booking_id)},
          {
            $set: {
              status: 'cancelled',
            },
          }
        );
        console.log("Inside Second -- accepted -- Update dispute", Cancel_Order);
      }else if(msg.is_dispute == 'decline'){
        console.log("decline");
      }
    }

    var dispute = await ResolutionCenter.findOne({booking_id: mongoose.Types.ObjectId(msg.booking_id)})

    var chat_detail = await Chat.findOne({_id: mongoose.Types.ObjectId(msg.chat_id)})

    console.log("create offer---->",dispute);
    io.to(msg.room_id).emit('update dispute',dispute)
  })


  socket.on('resolution center', async msg => {
    const data = msg;
    console.log("msg",msg);
    // let added ;
    if(msg.resolution_type == 'cancel_order'){
      msg.resolution_for_cancelOrder.is_order_cancelled = true;
      const result = await ResolutionCenter.updateOne(
        {_id: mongoose.Types.ObjectId(msg.booking_id)},
        {
          $set: {
            resolution_for_cancelOrder: msg.resolution_for_cancelOrder,
          },
        }
      );
      console.log("result",result);
      const added = await Chat.create({
        room_id: msg.room_id,
        message_type: 'cancel_order',
        primary_room_id: msg.primary_room_id,
        sender_id: msg.sender_id,
        dispute : {
          resolution_for_cancelOrder :  msg.resolution_for_cancelOrder,
          resolution_type: msg.resolution_type
        },
        receiver_id: msg.receiver_id,
        is_dispute_message: true,
         booking_id: msg.booking_id,
         dispute_message_request: msg.dispute_message_request

      })
      console.log("add",added);
    io.to(msg.primary_room_id).emit('resolution center', added)

    }else if(msg.resolution_type == 'update_order'){
      const result = await ResolutionCenter.updateOne(
        {_id: mongoose.Types.ObjectId(msg.booking_id)},
        {
          $set: {
            resolution_for_updateOrder: msg.resolution_for_updateOrder,
          },
        }
      );
      const added = await Chat.create({
        room_id: msg.room_id,
        message_type: 'update_order',
        primary_room_id: msg.primary_room_id,
        sender_id: msg.sender_id,
        dispute : {
          resolution_for_updateOrder :  msg.resolution_for_updateOrder,
          resolution_type: msg.resolution_type
        },
        receiver_id: msg.receiver_id,
        is_dispute_message: true,
        booking_id: msg.booking_id,
        dispute_message_request: msg.dispute_message_request


      })
    io.to(msg.primary_room_id).emit('resolution center', added)

    }
    
    
    // io.to(msg.room_id).emit('resolution center', msg)
  })

  socket.on('order cancelled', async msg => {
    const Cancel_Order = await ServiceBooking.updateOne(
      {_id: mongoose.Types.ObjectId(msg.booking_id)},
      {
        $set: {
          status: 'cancelled',
        },
      }
    );

   const added = await Chat.create({
      room_id: msg.room_id,
      message_type: 'resolution',
      message: "Your Order is Cancelled",
      dispute : {
        resolution_for_cancelOrder: msg.resolution_for_cancelOrder,
      },
      primary_room_id: msg.primary_room_id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      is_dispute_message: true,
      booking_id: msg.booking_id,
      dispute_message_request: msg.dispute_message_request


    })

    io.to(msg.primary_room_id).emit('order cancelled', added);
  })

  socket.on('order decline', async msg => {
   const added = await Chat.updateOne(
    {_id: mongoose.Types.ObjectId(msg.message_id)},
    {
      message_type: 'request_decline',
      message: "Your Request is Decline",
      is_dispute_message:true,
      booking_id: msg.booking_id,
      dispute_message_request: msg.dispute_message_request


    });

    const data = await Chat.findOne({_id: mongoose.Types.ObjectId(msg.message_id)})



    io.to(msg.room_id).emit('order decline', data);
  })

  socket.on('orderRequest cancelled', async msg => {
    const Cancel_Order = await ServiceBooking.updateOne(
      {_id: mongoose.Types.ObjectId(msg.booking_id)},
      {
        $set: {
          status: 'cancelled',
        },
      }
    );

   const added = await updateItem(
    Chat,
    {_id: mongoose.Types.ObjectId(msg.message_id)},
    {
      message_type: 'order_cancelled',
      message: "Your Order is Cancelled",
      // primary_room_id: msg.primary_room_id,
      is_dispute_message: true,
      booking_id: msg.booking_id,
      dispute_message_request: msg.dispute_message_request

    }
  ) 
    // Chat.updateOne(
    // {_id: mongoose.Types.ObjectId(msg.message_id)},
    // {
    //   message_type: 'order_cancelled',
    //   message: "Your Order is Cancelled",
    //   primary_room_id: msg.primary_room_id,
    //   is_dispute_message: true,
    //   booking_id: msg.booking_id

    // });

    const data = await Chat.findOne({_id: mongoose.Types.ObjectId(msg.message_id)})

    io.to(msg.room_id).emit('orderRequest cancelled', data);
  })

  socket.on('request cancelled', async msg => {
   const added = await Chat.updateOne(
    {_id: mongoose.Types.ObjectId(msg.message_id)},
    {
      message_type: 'request_cancelled',
      message: "Your request is Cancelled",
      // primary_room_id: msg.primary_room_id,
      is_dispute_message: true,
      booking_id: msg.booking_id,
      dispute_message_request: msg.dispute_message_request


    });
    
    const data = await Chat.findOne({_id: mongoose.Types.ObjectId(msg.message_id)})

    io.to(msg.room_id).emit('request cancelled', data);
  })

  socket.on('response', async msg => {

    const fetch_room_id = await Chat.findOne({primary_room_id: mongoose.Types.ObjectId(msg.room_id)})
   
     const added = await Chat.create({
      room_id: fetch_room_id.room_id,
      message_type: 'response',
     
      dispute : {
        description: msg.description,
      },
      primary_room_id: msg.room_id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      is_dispute_message: true,
      booking_id: msg.booking_id,
      dispute_message_request: msg.dispute_message_request
    })

    console.log("msg",msg);

    const update_status = await updateItem(
      Chat,
      {_id: mongoose.Types.ObjectId(msg.message_id)},
      {
        dispute_message_request: msg.dispute_message_request
      }
    ) 

    console.log("update_status",update_status);

    const fetch_updated_chat = await Chat.findOne({_id: msg.message_id})

    var result = {
      create_Chat : added,
      update_chat: fetch_updated_chat
    }

    console.log("result",result);

    console.log("");
     io.to(msg.room_id).emit('response', result);
   })

  socket.on('requestUpdate cancelled', async msg => {
    const added = await updateItem(
      Chat,
      {_id: mongoose.Types.ObjectId(msg.message_id)},
      {
        message_type: 'request_update_cancelled',
        message: "Your request is Cancelled",
        primary_room_id: msg.primary_room_id,
        is_dispute_message: true,
        booking_id: msg.booking_id,
        dispute_message_request: msg.dispute_message_request
      }
    ) 

    const data = await Chat.findOne({_id: mongoose.Types.ObjectId(msg.message_id)})

     io.to(msg.room_id).emit('requestUpdate cancelled', data);
   })








  socket.on('test event', async msg => {
    io.to(msg.room_id).emit('test event', msg)
  })

  socket.on('textMessage', async msg => {
    console.log(msg)
    if (typeof (msg) == "string") {
      msg = JSON.parse(msg)
    }

    var chatObj ={
      room_id: msg.room_id,
      message: msg.message,
      primary_room_id: msg.primary_room_id,
      sender_id: msg.sender_id,
      contract_id: msg.contract_id,
      receiver_id: msg.receiver_id,
      is_dispute_message: msg.is_dispute_message
    }

    if(msg.is_dispute_message){
      chatObj.is_dispute_message = true
    }

    if(msg.booking_id){
      chatObj.booking_id = msg.booking_id;
    }

    const added = await Chat.create(chatObj)

    const undelete = await Room.update(
      {
        room_id: msg.room_id,
      },
      {
        $pull: { deletedAt: msg.receiver_id },
      }
    );
    result = await Chat.updateOne(
      {
        _id: added._id,
        unread: { $nin: [msg.receiver_id] },
      },
      {
        $push: { unread: msg.receiver_id },
      }
    );
    // socket.join(msg.room_id);
    io.to(msg.room_id).emit('textMessage', added);
    // console.log("***********", added);


    // io.to(msg.room_id).emit('textMessage', msg)
  })

  socket.on('incomingCall', async msg => {
    io.emit('incomingCall', msg)
  })

  socket.on('rejectCall', async msg => {
    io.emit('rejectCall', msg)
  })

  socket.on('rejectBusyCall', async msg => {
    io.emit('rejectBusyCall', msg)
  })

  socket.on('mediaMessage', async msg => {
    io.to(msg.room_id).emit('mediaMessage', msg)
  })

  socket.on("disconnect", (reason) => {
    console.log("Disconnected..", reason)
  });



});

io.of("/").adapter.on("leave-room", (room) => {
  io.to(room).emit('leave joinee', room);
  console.log(`room ${room} was leaved`);
});

io.of("/admin").adapter.on("leave-room", (room) => {
  io.to(room).emit('leave joinee', room);
  console.log(`room ${room} was leaved`);
});


https.listen(port, () => {
  console.log(`Socket.IO server running at ${port}/`);
});

initMongo()
