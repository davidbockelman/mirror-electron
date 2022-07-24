const { time } = require('console')
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')


const rpio = require('./rpigpio')
const ServerEmitter = require('./server')
const Server = require('./server')
var timeoutId = undefined

var win

const createWindow = () => {
    const win = new BrowserWindow({
        width: 900,
        height: 1600,
        backgroundColor: 'black',
        fullscreen: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    })
    win.loadFile('index.html')
    return win
}

app.whenReady().then(() => {
    win = createWindow()
    win.webContents.send('modules-start')
    initServer(win.webContents)
    setupRpio(win.webContents)
})

const setupRpio = (contents) => {

    rpio.setPlayCallback((alarmId) => {
        Server.emit("alarm-playing", alarmId)
    })

    rpio.setInactivityCallback((userLock) => {
        if (!userLock) {
            contents.send('make-fullscreen', '')
        }
        
    })
    var vidTimeout
    rpio.setMotionWatchDog((rpioControl, pin, userLock) => {
        const val = rpioControl.read(pin)
        if (val) {
            rpio.startVideo()
        } else {
            if (vidTimeout) {
                clearTimeout(vidTimeout)
            }
            vidTimeout = setTimeout(() => {
                rpio.stopVideo()
            }, 5000)
        }
        rpio.stopAlarm()
        if (!userLock) {
            if (val) {
                contents.send('exit-fullscreen')
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }
                timeoutId = setTimeout(() => {
                    contents.send('make-fullscreen', '')
                }, 5* 60000)
            } 
        }
    })
}

const timeToMs = (time) => {
    var hours = parseInt(time.substring(0, 2))
    hours = (hours == 12) ? 0 : hours
    var min = parseInt(time.substring(2, 4))
    if (time.substring(4, 6) == "PM") {
        hours += 12
    }
    //console.log('hour: ' + hours + ' min: ' + min)
    const date = new Date()
    const curHour = date.getHours()
    const curMin = date.getMinutes()
    var diff = 0
    if (hours < curHour || (hours == curHour && min <= curMin)) {
        //day behind
        diff += ((60 - curMin) * 60000) + ((23 - curHour) * 60 * 60000)
        diff += (hours * 60 * 60000) + (min * 60000)
        return diff

    } else {
        if (hours == curHour) {
            return (min - curMin) * 60000
        }
        return ((60 - curMin) * 60000) + ((hours - curHour) * 60 * 60000) + (min * 60000)
    }
}

const initServer = (contents) => {
    //setup events from server

    Server.on('stop-alarm', () => {
        rpio.stopAlarm()
    })

    Server.on('set-alarm', (alarmId, time) => {
        const ms = timeToMs(time)
        rpio.setAlarm(alarmId, ms)
    })

    Server.on('cancel-alarm', (alarmId) => {
        rpio.cancelAlarm(alarmId)
    })

    Server.on('req-live', () => {
        rpio.startLivestream((image) => {
            Server.emit('send-live', { data: image.toString('base64') })
        })
    })

    Server.on('end-live', () => {
        rpio.endLivetream()
    })

    Server.on('take-image', async () => {
        const image = await rpio.takePicture()
        Server.emit('send-pic', image)
    })

    Server.on('start-recording', () => {
        rpio.startVideo()
    })

    Server.on('stop-recording', () => {
        rpio.stopVideo()
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
        rpio.turnLightsOff()
    })

    Server.on('modules-start', () => {
        contents.send('modules-start')
    })

    Server.on('display-on', () => {
        contents.send('exit-fullscreen')
        rpio.setUserLock()
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
    })

    Server.on('display-off', () => {
        contents.send('make-fullscreen', '')
        rpio.setUserLock()
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




