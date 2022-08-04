const { INPUT, HIGH, OUTPUT, LOW } = require('rpio')
const rpio = require('rpio')
const { StillCamera, StreamCamera, Codec, Flip } = require('pi-camera-connect')
const fs = require('fs')
const path = require('path')
const mpg = require('node-mpg123')
const player = new mpg(path.join(__dirname, 'mp3', 'radar.mp3'))
player.on('stop', () => isPlaying = false)
const { exec } = require('child_process')
const kill = require('tree-kill')

const INACTIVITY_TIMEOUT_MINUTES = 10
const USERLOCK_TIMEOUT_MINUTES = 10
const MAX_VIDEO_FILES = 20



//pin 4 for motion-senser
const MOT = 7
rpio.open(MOT, INPUT)
var inactivityCallback = function() {

}
setInterval(() => {
    if (!rpio.read(MOT)) {
        inactivityCallback(userLock)
    }
}, INACTIVITY_TIMEOUT_MINUTES * 60000)

var userLock = false;

//lights

//pin 5 for lights
const LIT = 11
rpio.open(LIT, OUTPUT, LOW)

const writeLights = (number) => {
    var bitStr = number.toString(2)
    const padding = 24 - bitStr.length
    for (var i = 0; i < padding; i++) {
        bitStr = '0' + bitStr
    }
    rpio.write(11, 1)
    rpio.msleep(5)
    rpio.write(11, 0)
    rpio.msleep(2)
    for (const bit of bitStr) {
        if (bit == '1') {
            rpio.write(11, 1)
        } else {
            rpio.write(11, 0)
        }
        rpio.msleep(10)
    }
    rpio.write(11, 0)
}


const stillCamera = new StillCamera({
    width: 720,
    height: 1280,
    flip: Flip.Vertical
})
const streamCamera = new StreamCamera({
    codec: Codec.MJPEG,
    fps: 40,
    width: 720,
    height: 1280,
    flip: Flip.Vertical
})
const survCam = new StreamCamera({
    codec: Codec.MJPEG,
    fps: 25,
    width: 1920,
    height: 1080,
    flip: Flip.Vertical
})

var numVideos = fs.readdirSync(path.join(__dirname, 'videos')).length


var streaming = false;
var intervalId
var recording = false
var userLockTimeout
var alarms = []
var curPlaying
var isPlaying = false


module.exports = (debug) => {
    return {
        setUserLock: () => {
            if (debug) console.log('[RPIGPIO_INFO]: User lock on')
            userLock = true;
            if (userLockTimeout) {
                clearTimeout(userLockTimeout)
            }
            userLockTimeout = setTimeout(() => {
                userLock = false
                userLockTimeout = undefined
            }, USERLOCK_TIMEOUT_MINUTES * 60000);
        },
        
        setMotionWatchDog: (callback) => {
            newCallback = (pin) => {            
                callback(rpio, pin, userLock)
            }
            rpio.poll(MOT, newCallback, rpio.POLL_BOTH)
        },

        setColor: (number) => {
            writeLights(number)
        },
    
        takePicture: async () => {
            if (recording) {
                await rpio.stopVideo()
            }
          
            if (debug) console.log('[RPIGPIO_INFO]: Image taken')
            let image = await stillCamera.takeImage()
            return image.toString('base64')  
            
        },
    
        setAlarm: (alarmName, timeFromNow) => {
            if (debug) console.log('[RPIGPIO_INFO]: Alarm ' + alarmName + ' has been set to go off in ' + 
            Math.floor(timeFromNow / (60000 * 60)) + ' hours and ' + (timeFromNow % (60000 * 60)) / 60000 + ' minutes')
            const setTime = Date.now()
            const alarmIntervalId = setInterval(() => {
                if (Date.now() - setTime >= timeFromNow) {
                    clearInterval(alarmIntervalId)
                    curPlaying = alarmName
                    isPlaying = true
                    player.play()
                }
            }, 10000)
            // const timeoutId = setTimeout(() => {
            //     curPlaying = alarmName
            //     isPlaying = true
            //     player.play()
            // }, timeFromNow)
            alarms.push({
                alarmId: alarmName,
                intervalId: alarmIntervalId
            })
        },
    
        stopAlarm: () => {
            if (isPlaying) {
                player.stop()
            }
        },
    
        setPlayCallback: (callback) => {
            player.on('play', () => {
                if (debug) console.log('[RPIGPIO_INFO]: Audio playing')
                callback(curPlaying)
            })
        },
    
        setInactivityCallback: (callback) => {
            inactivityCallback = callback
        },
    
        cancelAlarm: (alarmName) => {
            const alarm = alarms.find((alarm) => alarm.alarmId == alarmName)
            if (alarm) {
                if (debug) console.log('[RPIGPIO_INFO]: Alarm ' + alarm.alarmId + ' has been canceled')
                clearInterval(alarm.intervalId)
            }
        },
    
        startVideo: () => {
            if (numVideos >= MAX_VIDEO_FILES) {
                fs.rmSync(fs.readdirSync(path.join(__dirname, 'videos'))[0])
                numVideos--
            }
            if (!recording && !streaming) {
                if (debug) console.log('[RPIGPIO_INFO]: Recording started.')
                recording = true
                stream = survCam.createStream()
                stream.pipe(fs.createWriteStream('vid.mjpeg'))
                survCam.startCapture()
                this.audProcess = exec('arecord -f cd -d 0 | lame - aud.mp3')
            } 
        },
    
        stopVideo: async () => {
            if (recording) {
                if (debug) console.log('[RPIGPIO_INFO]: Recording stopped.')
                recording = false
                kill(this.audProcess.pid)
                
                await survCam.stopCapture()
                stream.destroy()
                
                const date = new Date()
                const fmt = date.toDateString() + '-' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
                if (debug) console.log('[RPIGPIO_INFO]: Starting ffmpeg')
                exec('ffmpeg -y -i vid.mjpeg -i aud.mp3 temp.mp4').on('exit', () => {
                    numVideos++
                    if (debug) console.log('[RPIGPIO_INFO]: Saved video: ' + fmt + '.mp4')
                    try {
                        fs.renameSync('temp.mp4', path.join(__dirname, 'videos', fmt + '.mp4'))
                        fs.rmSync('aud.mp3')
                        fs.rmSync('vid.mjpeg')
                    } catch (e) {
                        if (debug) console.log('[RPIGPIO_ERROR]: ', e)
                    }
                })
            }
        },
    
        startLivestream: async (intervalCallback) => {
            if (!streaming && !recording) {
                if (debug) console.log('[RPIGPIO_INFO]: Livestreaming started')
                streaming = true
                if (!recording) {
                    await streamCamera.startCapture()
                }
                intervalId = setInterval(async () => {
                    const image = await streamCamera.takeImage()
                    intervalCallback(image)
                }, 200)
            } else {
                if (debug) console.log('[RPIGPIO_ERROR]: Already streaming')
            }
        }, 
    
        endLivetream: () => {
            if (streaming) {
                clearInterval(intervalId)
                if (!recording) {
                    streamCamera.stopCapture()
                }
                if (debug) console.log('RPIGPIO_INFO]: Livestreaming stopped.')
                streaming = false
            } else {
                if (debug) console.log('[RPIGPIO_INFO]: Not currently streaming')
            }
        } 
    }
}
    
