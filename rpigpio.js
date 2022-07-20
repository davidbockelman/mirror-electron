const { INPUT, HIGH, OUTPUT } = require('rpio')
const rpio = require('rpio')
const { StillCamera, StreamCamera, Codec } = require('pi-camera-connect')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('stream')

//pin 4 for motion-senser
const MOT = 7
rpio.open(MOT, INPUT)

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

    dimLights: () => {
        rpio.writebuf(LIT, buffers['R1C2'])
    },

    brightenLights: () => {
        rpio.writebuf(LIT, buffers['R1C1'])
    },
    
    setMotionWatchDog: (callback) => {
        rpio.poll(MOT, callback, rpio.POLL_BOTH)
    },

    takePicture: async () => {
        const image = await stillCamera.takeImage()
        return image.toString('base64')
    },

    takeVideo: async (duration, callback) => {
        const stream = streamCamera.createStream()
        var rawData = ''
        stream.on('data', (chunk) => rawData += chunk)
        await streamCamera.startCapture()
        rpio.msleep(duration)
        await streamCamera.stopCapture()
        stream.destroy()
        callback(Buffer.from(rawData))
    },

    startLivestream: async (intervalCallback) => {
        if (!streaming) {
            streaming = true
            await streamCamera.startCapture()
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
            streamCamera.stopCapture()
            streaming = false
        } else {
            console.log('[RPIGPIO_INFO]: Not currently streaming')
        }
    }

    
}