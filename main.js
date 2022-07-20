const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')


const rpio = require('./rpigpio')
const Server = require('./server')


var win

const createWindow = () => {
    const win = new BrowserWindow({
        width: 900,
        height: 1600,
        backgroundColor: 'black',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    })
    win.loadFile('index.html')
    return win
}



app.whenReady().then(() => {
    win = createWindow()
    initServer(win.webContents)
})

const initServer = (contents) => {
    //setup events from server
    Server.on('req-live', () => {
        rpio.startLivestream((image) => {
            Server.emit('send-live', { data: image.toString('base64') })
        })
    })

    Server.on('end-live', () => {
        rpio.endLivetream()
    })

    Server.on('req-pic', async () => {
        const image = await rpio.takePicture()
        Server.emit('send-pic', image)
    })

    Server.on('req-video', (duration) => {
        rpio.takeVideo(duration, (video) => {
            Server.emit('send-vid', video.toString('base64'))
        })
    })

    Server.on('play-audio', (audio) => {

    })

    Server.on('get-modules', () => {
        
        ipcMain.on('modules-array', (event, moduleIds) => {
            console.log('Received modules')
            Server.emit('module-ids', moduleIds)
        })
        contents.send('get-modules')
    })

    Server.on('update-dom', (module) => {
        contents.send('update-module', module)
    })

    Server.on('dom-data', (module, data) => {
        contents.send('give-data', module, data)
    })

    Server.on('set-lights', (colorNum) => {
        rpio.setColor(colorNum)
    })

    Server.on('lights-on', () => {
        rpio.turnLightsOn()
    })

    Server.on('lights-off', () => {
        rpio.turnLightsOn()
    })

    Server.on('modules-start', () => {
        contents.send('modules-start')
    })

    Server.on('hide-module', (module, duration) => {
        contents.send('hide-module', module, duration)
    })

    Server.on('make-fullscreen', (dom) => {
        contents.send('make-fullscreen', dom)
    })

    Server.on('exit-fullscreen', () => {
        contents.send('exit-fullscreen')
    })

    Server.on('bright-level', brightNum => {
        rpio.setBright(brightNum)
    })
}




