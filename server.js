const express = require('express')
const app = express()
const http = require('http')
const server = http.Server(app)
const { Server } = require('socket.io')
const io = new Server(server)
const ipcRenderer = require('electron').ipcRenderer
const { EventEmitter } = require('events')
const path = require('path')

const ServerEmitter = new EventEmitter()

var connected = false;



io.on('connection', (socket) => {
    console.log('[SERVER_INFO]: WebSocket connection establised')
    connected = true
    setupIncomingSocketRoutes(socket)
    setupOutgoingSocketRoutes()
})

server.listen(8000)

const setupIncomingSocketRoutes = (socket) => {
    socket.onAny((...args) => console.log("[SERVER_INFO]: Got a message with args", args))


    socket.on('get-modules', () => {
        console.log('Got modules request')
        ServerEmitter.emit('get-modules')
    })

    socket.on('modules-start', () => {
        ServerEmitter.emit('modules-start')
    })

    socket.on('req-live-stream', () => {
        ServerEmitter.emit('req-live') 
    })

    socket.on('set-lights', (lightNum) => {
        ServerEmitter.emit('set-lights', lightNum)
    })

    socket.on('brightness-level', (brightNum) => {
        ServerEmitter.emit('bright-level', brightNum)
    })

    socket.on('lights-on', () => {
        ServerEmitter.emit('lights-on')
    })

    socket.on('lights-off', () => {
        ServerEmitter.emit('lights-off')
    })

    socket.on('stop-live', () => {
        ServerEmitter.emit('end-live')
    })

    socket.on('start-recording', () => {
        ServerEmitter.emit('start-recording')
    })

    socket.on("stop-recording", () => {
        ServerEmitter.emit('stop-recording')
    })

    socket.on('take-image', () => {
        ServerEmitter.emit('take-image')
    })

    socket.on("display-off", () => {
        ServerEmitter.emit('display-off')
    })

    socket.on('display-on', () => {
        ServerEmitter.emit('display-on')
    })
}

const setupOutgoingSocketRoutes = () => {
    ServerEmitter.on('send-live', (imageObj) => {
        io.emit('live-image', imageObj)
    })

    ServerEmitter.on('send-pic', (image) => {
        io.emit('new-image', { data: image })
    })
}


module.exports = ServerEmitter