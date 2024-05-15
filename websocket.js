require('dotenv-safe').config()
const express = require('express');
const ws = require('ws');
// const Ping = require('./lib/Ping');
const PORT = process.env.WEBSOCKET_PORT || 3000;
const app = express();

const wsServer = new ws.Server({ noServer: true });
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();

const server = app.listen(PORT);

server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit('connection', socket, request);
    });
});

wsServer.on('connection', socket => {

    socket.on('message', message => {
        console.log("On Message")
    });

    eventEmitter.on('start', () => {
        console.log('started');
        // socket.emit("message", "fsdfssd")
        socket.send("messsage", "fsdfd")
    });

});

function emit(emitter_name,object){

    eventEmitter.emit(emitter_name, object);

}