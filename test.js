const fs = require('fs')
const path = require('path')
const rpio = require('rpio')

const buf = Buffer.from(fs.readFileSync(path.join(__dirname, 'buf-dumps', 'R2C1')))
rpio.open(11, rpio.OUTPUT, rpio.HIGH)
rpio.writebuf(11, buf)
