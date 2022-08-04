const express = require('express')
const app = express()
const http = require('http')
const server = http.Server(app)
const { Server } = require('socket.io')
const io = new Server(server, {
    allowEIO3: true
})
const ipcRenderer = require('electron').ipcRenderer
const { EventEmitter } = require('events')
const path = require('path')
const fs = require('fs')

const ServerEmitter = new EventEmitter()
ServerEmitter.setMaxListeners(1)
var connected = false;


io.on('connection', (socket) => {
    console.log('[SERVER_INFO]: WebSocket connection establised')
    socket.removeAllListeners()
    setupIncomingSocketRoutes(socket)
    setupOutgoingSocketRoutes()
})

io.on('disconnected', () => {
    console.log('[SERVER_INFO]: WebSocket disconnected')
})

app.get('/video', (req, res) => {
    const availVids = fs.readdirSync(path.join(__dirname, 'videos'))
    const tgt = availVids[req.query.n]
    if (tgt) {
        res.sendFile(path.join(__dirname, 'videos', tgt))
    }

})

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'mp3', 'radar.mp3'))
})

app.post('/testpost', (req, res) => {
    req.pipe(fs.createWriteStream('test.mp3'))

    req.on('end', () => {
        console.log('done')
    })
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

    socket.on('set-alarm', (alarmId, time) => {
        ServerEmitter.emit('set-alarm', alarmId, time)
    })

    socket.on('cancel-alarm', (alarmId) => {
        ServerEmitter.emit('cancel-alarm', alarmId)
    })

    socket.on('destroy-alarm', (alarmId) => {
        ServerEmitter.emit('cancel-alarm', alarmId)
    })

    socket.on('stop-alarm', () => {
        ServerEmitter.emit('stop-alarm')
    })

    socket.on('monitor-off', () => {
        ServerEmitter.emit('monitor-off')
    })

    socket.on('motion-record-on', () => {
        ServerEmitter.emit('motion-record-on')
    })

    socket.on('motion-record-off', () => {
        ServerEmitter.emit('motion-record-off')
    })

    socket.on('set-motion-record-dur', (duration) => {
        ServerEmitter.emit('set-motion-record-dur', duration)
    })

    socket.on('monitor-on', () => {
        ServerEmitter.emit('monitor-on')
    })

    socket.on('set-volume', (volume) => {
        ServerEmitter.emit('set-volume', volume)
    })

    socket.on('motion-lights-on', () => {
        ServerEmitter.emit('motion-lights-on')
    })

    socket.on('motion-lights-off', () => {
        ServerEmitter.emit('motion-lights-off')
    })

    socket.on('motion-lights-color', (color) => {
        ServerEmitter.emit('motion-lights-color', color)
    })

    socket.on('search-music', (q) => {
        ServerEmitter.emit('search-music', q)
    })

    socket.on('get-videos', () => {
        var res = {}
        fs.readdirSync(path.join(__dirname, 'videos')).forEach((value, index) => {
            res["" + index] = value
        })
        io.emit('avail-videos', res)
    })

    socket.on('remove-video', (video) => {
        try {
            console.log('removing ' + path.join(__dirname, 'videos', video))
            fs.rmSync(path.join(__dirname, 'videos', video))
        } catch (e) {
            console.log('[SERVER_ERROR]: ' + e)
        }
    })

    socket.on('play-song', () => {
        ServerEmitter.emit('play-song')
    })

    socket.on('pause-song', () => {
        ServerEmitter.emit('pause-song')
    })

    socket.on('search-soundcloud', (q) => {
        ServerEmitter.emit('search-soundcloud', q)
    })

    socket.on('gmail-auth-code', code => {
        ServerEmitter.emit('gmail-auth-code', code)
    })

    socket.on('set-emails-displayed', number => {
        ServerEmitter.emit('set-emails-displayed', number)
    })
}

const setupOutgoingSocketRoutes = () => {
    
    const alarmCallback = (alarmId) => {
        io.emit('alarm-playing', { data: alarmId })
    }
    const livestreamCallback = (imageObj) => {
        io.emit('live-image', imageObj)
    }
    const pictureCallback = (image) => {
        io.emit('new-image', { data: image })
    }
    const videoCallback = (dataObj) => {
        console.log('Sending video')
        io.emit('new-video', dataObj)
    }
    const musicFileCallback = () => {
        io.emit('file-ready')
    }
    const musicFileError = () => {
        io.emit('cant-get-title')
    }
    const queryResult = (result) => {
        io.emit('sc-query-result', result)
    }
    const gmailReady = () => {
        io.emit('gmail-ready')
    }

    ServerEmitter.removeListener('alarm-playing', alarmCallback)
    ServerEmitter.removeListener('send-live', livestreamCallback)
    ServerEmitter.removeListener('send-pic', pictureCallback)
    ServerEmitter.removeListener('new-video', videoCallback)
    ServerEmitter.removeListener('music-file-ready', musicFileCallback)
    ServerEmitter.removeListener('cant-get-title', musicFileError)
    ServerEmitter.removeListener('sc-query-result', queryResult)
    ServerEmitter.removeListener('gmail-ready', gmailReady)

    ServerEmitter.on('alarm-playing', alarmCallback)

    ServerEmitter.on('send-live', livestreamCallback)

    ServerEmitter.on('send-pic', pictureCallback)

    ServerEmitter.on('new-video', videoCallback)

    ServerEmitter.on('music-file-ready', musicFileCallback)

    ServerEmitter.on('cant-get-title', musicFileError)

    ServerEmitter.on('sc-query-result', queryResult)

    ServerEmitter.on('gmail-ready', gmailReady)
}


module.exports = ServerEmitter