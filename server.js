const express = require('express')
const app = express()
const expressWs = require('express-ws')(app)
const ipcRenderer = require('electron').ipcRenderer
const { EventEmitter } = require('events')
const path = require('path')

const ServerEmitter = new EventEmitter()

var connected = false;

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'))
})

app.ws('/socket', (initWs, req) => {
    console.log('[SERVER_INFO]: WebSocket connection establised')
    ws = initWs;
    connected = true;
    setupIncomingSocketRoutes(initWs)
    setupOutgoingSocketRoutes(initWs)
})

app.listen(8000)

const setupIncomingSocketRoutes = (ws) => {
    ws.on('message', message => {
        
        message = JSON.parse(message)
    
        let route
        if (message.route) {
            route = message.route
        } else {
            console.log('[SERVER_ERROR]: Incoming request has no route')
        }
        console.log('[SERVER_INFO]: Got message with route ' + route)
        switch (route) {
            case 'req-live':
                //request livestream
                ServerEmitter.emit('req-live')
                break
            case 'req-end-live':
                //request to end livestream
                ServerEmitter.emit('end-live')
                break
            case 'req-pic':
                //request still picture
                ServerEmitter.emit('req-pic')
                break
            case 'req-video':
                //request video
                let vidDuration
                if (message.duration) {
                    vidDuration = message.duration
                } else {
                    console.log('[SERVER_ERROR]: Video request has no duration property')
                }
                ServerEmitter.emit('req-video', vidDuration)
                break
            case 'req-audio':
                //request audio
                let audioDuration
                if (message.duration) {
                    audioDuration = message.duration
                } else {
                    console.log('[SERVER_ERROR]: Audio request has no duration property')
                }
                ServerEmitter.emit('req-audio', audioDuration)
                break
            case 'play-audio':
                //play audio
                let buf
                if (message.data) {
                    buf = Buffer.from(message.data)
                } else {
                    console.log('[SERVER_ERROR]: Play audio request has no data buffer')
                }
                ServerEmitter.emit('play-audio', buf)
                break
            case 'get-modules':
                //get modules
                ServerEmitter.emit('get-modules')
                break
            case 'update-dom':
                //update dom
                let tgt
                if (message.module) {
                    tgt = message.module
                } else {
                    console.log('[SERVER_ERROR]: Update dom request has no target')
                }
                ServerEmitter.emit('update-dom', tgt)
                break
            case 'dom-data':
                //give module dom-related data
                let tgtModule
                if (message.module) {
                    tgtModule = message.module
                } else {
                    console.log('[SERVER_ERROR]: Dom data request has no target')
                }
                let data
                if (message.data) {
                    data = message.data
                } else {
                    console.log('[SERVER_ERROR]: Dom data request has no data property')
                }
                ServerEmitter.emit('dom-data', tgtModule, data)
                break
            case 'set-lights':
                //set lights to a color
                let color
                if (message.color) {
                    color = message.color
                } else {
                    console.log('[SERVER_ERROR]: Set color request has no color property')
                }
                ServerEmitter.emit('set-color', color)
                break
            case 'lights-on':
                //turn on lights
                ServerEmitter.emit('lights-on')
                break
            case 'lights-off':
                //turn off lights
                ServerEmitter.emit('lights-off')
                break

            case 'modules-start':
                ServerEmitter.emit('modules-start')
                break
            case 'hide-module':
                let moduleId
                if (message.moduleId) {
                    moduleId = message.moduleId
                } else {
                    console.log('[SERVER_ERROR]: Hide module request has no target')
                }
                let hideDuration
                if (message.duration) {
                    hideDuration = message.duration
                } else {
                    console.log('[SERVER_ERROR]: Hide module request has no target')
                }
                ServerEmitter.emit('hide-module', moduleId, hideDuration)
                break
            case 'show-module':
                let showModuleId
                if (message.moduleId) {
                    showModuleId = message.moduleId
                } else {
                    console.log('[SERVER_ERROR]: Hide module request has no target')
                }
                let showDuration
                if (message.duration) {
                    showDuration = message.duration
                } else {
                    console.log('[SERVER_ERROR]: Hide module request has no target')
                }
                ServerEmitter.emit('hide-module', showModuleId, showDuration)
                break
            case 'make-fullscreen':
                let makeDom
                if (message.dom != undefined) {
                    makeDom = message.dom
                } else {
                    console.log('[SERVER_ERROR]: Make fullscreen request hss no dom data')
                }
                ServerEmitter.emit('make-fullscreen', makeDom)
                break
            case 'exit-fullscreen': 
                ServerEmitter.emit('exit-fullscreen')
                break
            default:
                console.log('[SERVER_ERROR]: Unrecognized route from client')
        }
    })
    
}

const setupOutgoingSocketRoutes = (ws) => {
    //motion detected
    ServerEmitter.on('motion-start', () => {
        ws.send('motion-start')
    })
    //motion stopped
    ServerEmitter.on('motion-stop', () => {
        ws.send('motion-stop')
    })
    //send livestream
    ServerEmitter.on('send-live', (image) => {
        const imgWrap = JSON.stringify({
            route: 'live-image',
            buf: image
        })
        ws.send(imgWrap)
    })
    //send picure
    ServerEmitter.on('send-pic', (image) => {
        const imageWrap = JSON.stringify({
            route: 'image',
            buf: image
        })
        ws.send(imageWrap)
    })
    //send video
    ServerEmitter.on('send-vid', (video) => {
        const videoWrap = JSON.stringify({
            route: 'video',
            buf: video
        })
        ws.send(videoWrap)
    })
    //send audio
    ServerEmitter.on('send-audio', (audio) => {
        const audioWrap = JSON.stringify({
            route: 'audio',
            buf: audio
        })
        ws.send(audioWrap)
    })
    //send error
    ServerEmitter.on('send-error', (error) => {
        const errWrap = JSON.stringify({
            route: 'error',
            error: error
        })
        ws.send(errWrap)
    })
    //send moduleIds
    ServerEmitter.on('module-ids', (moduleIds) => {
        const wrap = JSON.stringify({
            route: 'module-ids',
            moduleIds: moduleIds
        })
        ws.send(wrap)
    })
}


module.exports = ServerEmitter