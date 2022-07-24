const { INPUT, HIGH, OUTPUT, i2cReadRegisterRestart } = require('rpio')
const rpio = require('rpio')
const { StillCamera, StreamCamera, Codec } = require('pi-camera-connect')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('stream')
const mpg = require('node-mpg123')
const player = new mpg(path.join(__dirname, 'mp3', 'radar.mp3'))
player.on('stop', () => isPlaying = false)
const { exec, spawn } = require('child_process')
const kill = require('tree-kill')



//pin 4 for motion-senser
const MOT = 7
rpio.open(MOT, INPUT)
var inactivityCallback = function() {

}
setInterval(() => {
    if (!rpio.read(MOT)) {
        inactivityCallback(userLock)
    }
}, 5000)

var userLock = false;

//lights
var buffers = {}
fs.readdirSync(path.join(__dirname, 'buf-dumps')).forEach((file) => {
    var buffer = Buffer.from(fs.readFileSync(path.join(__dirname, 'buf-dumps', file)))
    buffers[file] = buffer
})
//pin 5 for lights
const LIT = 11
rpio.open(LIT, OUTPUT, HIGH)

const stillCamera = new StillCamera({
    width: 720,
    height: 1280,
})
const streamCamera = new StreamCamera({
    codec: Codec.MJPEG,
    fps: 40,
    width: 720,
    height: 1280
})
const survCam = new StreamCamera({
    codec: Codec.MJPEG,
    fps: 25,
    width: 1920,
    height: 1080
})

var numVideos = fs.readdirSync(path.join(__dirname, 'videos')).length

var lightsOn
var streaming = false;
var intervalId
var recording = false
var rawData = ''
var userLockTimeout
var alarms = []
var curPlaying
var isPlaying = false
var videoTimeout


module.exports = {
    setColor: (color) => {
        rpio.writebuf(LIT, buffers['R2C2'])
        // switch (color) {
        //     case 'red':
        //         rpio.writebuf(LIT, buffers['R2C1'])
        //         break
                
        //     default:
        //         console.log('[RPIGPIO ERROR]: ' + color + ' is not a selectable color')
        // }
    },

    turnLightsOff: () => {
        if (!lightsOn) console.log('[RPIGPIO_INFO]: lights already off')
        lightsOn = false;
        rpio.writebuf(LIT, buffers['R1C4-off'])
    },

    turnLightsOn: () => {
        if (lightsOn) console.log('[RPIGPIO_INFO]: lights already on')
        lightsOn = true;
        rpio.writebuf(LIT, buffers['R1C4-on'])
    },

    toggleLights: () => {
        if (lightsOn) {
            this.turnLightsOff()
        } else {
            this.turnLightsOn()
        }
        
    },

    setUserLock: () => {
        console.log('User locked')
        userLock = true;
        if (userLockTimeout) {
            clearTimeout(userLockTimeout)
        }
        userLockTimeout = setTimeout(() => {
            userLock = false
            userLockTimeout = undefined
        }, 10 * 60000);
    },

    dimLights: () => {
        rpio.writebuf(LIT, buffers['R1C2'])
    },

    brightenLights: () => {
        rpio.writebuf(LIT, buffers['R1C1'])
    },
    
    setMotionWatchDog: (callback) => {
        newCallback = (pin) => {            
            callback(rpio, pin, userLock)
        }
        rpio.poll(MOT, newCallback, rpio.POLL_BOTH)
    },

    takePicture: async () => {
        let image
        if (streaming) {
            image = await streamCamera.takeImage()
        } else  {
            image = await stillCamera.takeImage()
        }
        return image.toString('base64')
         
    },

    setAlarm: (alarmName, timeFromNow) => {
        const timeoutId = setTimeout(() => {
            curPlaying = alarmName
            isPlaying = true
            player.play()
        }, timeFromNow)
        alarms.push({
            alarmId: alarmName,
            timeoutId: timeoutId
        })
    },

    stopAlarm: () => {
        if (isPlaying) {
            player.stop()
        }
    },

    setPlayCallback: (callback) => {
        player.on('play', () => {
            console.log("Activating callback")
            callback(curPlaying)
        })
    },

    setInactivityCallback: (callback) => {
        inactivityCallback = callback
    },

    cancelAlarm: (alarmName) => {
        const alarm = alarms.find((alarm) => alarm.alarmId == alarmName)
        if (alarm) {
            clearTimeout(alarm.timeoutId)
        }
    },

    

    startVideo: () => {
        if (numVideos >= 20) {
            fs.rmSync(fs.readdirSync(path.join(__dirname, 'videos'))[0])
            numVideos--
        }
        if (!recording) {
            console.log('Recording')
            recording = true
            stream = survCam.createStream()
            stream.pipe(fs.createWriteStream('vid.mjpeg'))
            survCam.startCapture()
            this.audProcess = exec('arecord -f cd -d 0 | lame - aud.mp3')
        }
        
    },

    stopVideo: () => {
        if (recording) {
            console.log('Stopping')
            recording = false
            kill(this.audProcess.pid)
            
            survCam.stopCapture()
            stream.destroy()
            
            const date = new Date()
            const fmt = date.toDateString() + '-' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
            
            exec('ffmpeg -y -i vid.mjpeg -i aud.mp3 -c copy \"/home/davidpi/mirror-electron/videos/' + fmt + '.mp4\"').on('exit', () => {
                numVideos++
                fs.rmSync('aud.mp3')
                fs.rmSync('vid.mjpeg')
            })
        }
    },

    startLivestream: async (intervalCallback) => {
        if (!streaming) {
            streaming = true
            if (!recording) {
                await streamCamera.startCapture()
            }
            intervalId = setInterval(async () => {
                const image = await streamCamera.takeImage()
                intervalCallback(image)
            }, 100)
        } else {
            console.log('[RPIGPIO_ERROR]: Already streaming')
        }
    }, 

    endLivetream: () => {
        if (streaming) {
            clearInterval(intervalId)
            if (!recording) {
                streamCamera.stopCapture()
            }
            
            streaming = false
        } else {
            console.log('[RPIGPIO_INFO]: Not currently streaming')
        }
    }

    
}