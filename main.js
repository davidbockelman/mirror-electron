const { exec, spawn } = require('child_process')
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const https = require('https')
const scdl = require('soundcloud-downloader').default
const fs = require('fs')

var MOTION_VIDEO_DURATION_MINUTES = 1
var MOTION_DISPLAY_ON_MINUTES = 5
var MOTION_RECORDING_ENABLED = false
var MOTION_LIGHTS = false
var MOTION_LIGHTS_COLOR = 16755802
var MOTION_LIGHTS_DUR = 5

const rpio = require('./rpigpio')(false)
const Server = require('./server')
const treeKill = require('tree-kill')
var timeoutId = undefined
var vidTimeout = undefined

var win
app.disableHardwareAcceleration()
const createWindow = () => {
    const win = new BrowserWindow({
        width: 900,
        height: 1600,
        backgroundColor: 'black',
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    })
    win.loadFile('index.html')
    return win
}

app.on('window-all-closed', (event) => {
    rpio.stopVideo()
    app.quit()
})

app.whenReady().then(() => {
    win = createWindow()
    win.webContents.send('modules-start')
    initServer(win.webContents)
    setupRpio(win.webContents)
})

var recording = false

const setupRpio = (contents) => {

    rpio.setPlayCallback((alarmId) => {
        Server.emit("alarm-playing", alarmId)
    })

    rpio.setInactivityCallback((userLock) => {
        if (!userLock) {
            contents.send('make-fullscreen', '')
            rpio.setColor(0)
        } 
    })

    var motionLightsTimeout = undefined

    rpio.setMotionWatchDog((rpioControl, pin, userLock) => {
        const val = rpioControl.read(pin)
        if (MOTION_RECORDING_ENABLED) {
            if (val) {
                if (!recording) {
                    rpio.startVideo()
                    recording = true
                }
                if (vidTimeout) {
                    clearTimeout(vidTimeout)
                }
                vidTimeout = setTimeout(() => {
                    rpio.stopVideo()
                    recording = false
                }, MOTION_VIDEO_DURATION_MINUTES * 60000)
            } 
        }
        rpio.stopAlarm()
        if (!userLock) {
            if (val) {
                if (MOTION_LIGHTS) {
                    rpio.setColor(MOTION_LIGHTS_COLOR)
                }
                contents.send('exit-fullscreen')
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }
                timeoutId = setTimeout(() => {
                    contents.send('make-fullscreen', '')
                }, MOTION_DISPLAY_ON_MINUTES * 60000)
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
        return ((60 - curMin) * 60000) + ((hours - curHour - 1) * 60 * 60000) + (min * 60000)
    }
}

const searchForTitle = (q, callback) => {
    var tgt = 'https://soundcloud.com'
    var params = q.split(' ')
    var result = params[0]
    for (var i = 1; i < params.length; i++) {
        if (params[i] == '&') {
            params[i] = '%26'
        }
        result += '%20' + params[i]
    }
    https.get('https://soundcloud.com/search?q=' + result, res => {
    var rawData = ''
    res.on('data', (chunk) => {
        rawData += chunk
    })
    res.on('end', () => {
        var first = rawData.substring(rawData.indexOf('</ul') + 5)
        const rawList = first.substring(first.indexOf('<ul>') + 4, first.indexOf('</ul>'))
        var list = rawList.split('\n')
        var top = list[1].substring(list[1].indexOf('<'))
        top = top.substring(top.indexOf('href') + 6)
        var name = top.substring(top.indexOf('\">') + 2)
        name = name.substring(0, name.indexOf('<'))
        callback(name)
        top = top.substring(0, top.indexOf('\"'))
        tgt += top
        scdl.download(tgt).then((stream) => {
            stream.on('end', () => {
                Server.emit('music-file-ready')
            })
            stream.pipe(fs.createWriteStream(path.join(__dirname, 'mp3', 'temp.mp3')))
        }).catch((reason) => {
            console.log('[ERROR]: ' + reason)
            Server.emit('cant-get-title')
        })
    })
})
}

const searchSoundcloud = (q) => {
    scdl.search({
        query: q
    }).then((res) => {
        var result = {}
        res.collection.forEach((value) => {
            result[value.title] = value.artwork_url
        })
        Server.emit("sc-query-result", result)
    })
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

    Server.on('req-live', async () => {
        await rpio.stopVideo()
        rpio.startLivestream((image) => {
            Server.emit('send-live', { data: image.toString('base64') })
        })
    })

    Server.on('end-live', () => {
        rpio.endLivetream()
    })

    Server.on('take-image', async () => {
        const image = await rpio.takePicture()
        if (image) {
            Server.emit('send-pic', image)
        }
    })

    Server.on('start-recording', () => {
        rpio.startVideo()
    })

    Server.on('stop-recording', () => {
        rpio.stopVideo()
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
        rpio.setUserLock()
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

    Server.on('monitor-off', () => {
        exec('xrandr --output HDMI-1 --off')
    })

    Server.on('monitor-on', () => {
        exec('xrandr --output HDMI-1 --auto').on('exit', () => {
            exec('xrandr --output HDMI-1 --rotate left')
        })
    })

    Server.on('set-volume', (volume) => {
        exec('amixer set Master ' + volume + '%')
    })

    Server.on('motion-record-on', () => {
        MOTION_RECORDING_ENABLED = true
    })

    Server.on('motion-record-off', () => {
        MOTION_RECORDING_ENABLED = false
    })

    Server.on('set-motion-record-dur', (duration) => {
        MOTION_VIDEO_DURATION_MINUTES = duration
    })

    Server.on('motion-lights-on', () => {
        MOTION_LIGHTS = true
    })

    Server.on('motion-lights-off', () => {
        MOTION_LIGHTS = false
    })

    Server.on('motion-lights-color', (color) => {
        MOTION_LIGHTS_COLOR = color
    })

    Server.on('search-music', (q) => {
        if (curPlaying) {
            treeKill(curPlaying.pid)
            curPlaying = undefined
        }
        searchForTitle(q, (name) => {
            console.log(name)
        })
    })

    Server.on('play-song', () => {
        playSong()
    })

    Server.on('pause-song', () => {
        pauseSong()
    })

    Server.on('search-soundcloud', (q) => {
        searchSoundcloud(q)
    })

    Server.on('gmail-auth-code', code => {
        getGmailAccessToken(code)
    })

    Server.on('set-emails-displayed', number => {
        var data = {route: 'update-num-emails', numEmails: number}
        contents.send('set-emails-displayed', data)
    })
}

const getGmailAccessToken = (code) => {
    https.request('https://oauth2.googleapis.com/token?' + 
    'code=' + code + 
    '&client_id=' + '86662619336-20mkmfhrkuut721i2ehg0kc1sv0q7l0a.apps.googleusercontent.com' + 
    '&client_secret=' + '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' + 
    '&grant_type=' + 'authorization_code' + 
    '&redirect_uri=' + 'http://localhost:8080/', {method: 'POST'}, res => {
        var rawData = ''
        res.on('data', (chunk) => {
            rawData += chunk
        })
        res.on('end', () => {
            Server.emit('gmail-ready')
            const responseJSON = JSON.parse(rawData)
            responseJSON.route = 'gmail-auth'
            win.webContents.send('gmail-auth-json', responseJSON)
        })
    }).end()
}


var curPlaying

const playSong = () => {
    if (curPlaying) {
        curPlaying.kill('SIGCONT')
    } else {
        curPlaying = spawn('mpg123', ['-f', '13107', path.join(__dirname, 'mp3', 'temp.mp3')])
    }
    
}

const pauseSong = () => {
    if (curPlaying) {
        curPlaying.kill('SIGSTOP')
    }
}


