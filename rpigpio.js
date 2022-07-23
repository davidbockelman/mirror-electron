const { INPUT, HIGH, OUTPUT, i2cReadRegisterRestart } = require('rpio')
const rpio = require('rpio')
const { StillCamera, StreamCamera, Codec } = require('pi-camera-connect')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('stream')
const mpg = require('node-mpg123')
const player = new mpg(path.join(__dirname, 'mp3', 'radar.mp3'))



//pin 4 for motion-senser
const MOT = 7
rpio.open(MOT, INPUT)

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
    width: 720,
    height: 1280
})
var lightsOn
var streaming = false;
var intervalId
var recording = false
var rawData = ''
var stream
var userLockTimeout
var alarms = []
var curPlaying


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
        }, 20 * 60000);
    },

    dimLights: () => {
        rpio.writebuf(LIT, buffers['R1C2'])
    },

    brightenLights: () => {
        rpio.writebuf(LIT, buffers['R1C1'])
    },
    
    setMotionWatchDog: (callback) => {
        callback = (pin) => {
            callback(pin, userLock)
        }
        rpio.poll(MOT, callback, rpio.POLL_BOTH)
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
            player.play()
        }, timeFromNow)
        alarms.push({
            alarmId: alarmName,
            timeoutId: timeoutId
        })
    },

    stopAlarm: () => {
        player.stop()
    },

    setPlayCallback: (callback) => {
        player.on('play', () => {
            console.log("Activating callback")
            callback(curPlaying)
        })
    },

    cancelAlarm: (alarmName) => {
        const alarm = alarms.find((alarm) => alarm.alarmId == alarmName)
        if (alarm) {
            clearTimeout(alarm.timeoutId)
        }
    },

    

    startVideo: async () => {
        if (!recording) {
            recording = true
            stream = streamCamera.createStream()
            rawData = ''
            stream.on('data', (chunk) => rawData += chunk)
            if (!streaming) {
                await streamCamera.startCapture()
            }
        }
        
    },

    stopVideo: async (callback) => {
        if (recording) {
            recording = false
            if (!streaming) {
                await streamCamera.stopCapture()
            }
            const buf = Buffer.from(rawData)
            callback(buf)
            stream.destroy()
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