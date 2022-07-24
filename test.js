const fs = require('fs')
const path = require('path')
const { StreamCamera, Codec } = require('pi-camera-connect')
const { spawn, exec } = require('child_process')
const kill = require('tree-kill')

const streamCamera = new StreamCamera({
    codec: Codec.MJPEG,
    fps: 25,
    width: 1920,
    height: 1080
})

const stream = streamCamera.createStream()


const wrtStream = fs.createWriteStream('out.mjpeg')

stream.pipe(wrtStream)

streamCamera.startCapture()
const audio = exec("arecord -f cd | lame - aud.mp3")


setTimeout(() => {
    streamCamera.stopCapture()
    kill(audio.pid)
    wrtStream.destroy()
    exec('ffmpeg -y -i out.mjpeg -i aud.mp3 -c copy out.mp4').on('exit', () => {
        console.log('done')
        fs.rmSync('out.mjpeg')
        fs.rmSync('aud.mp3')
    })
    
    
}, 5000)