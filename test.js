const rpio = require('rpio')
rpio.open(11, rpio.OUTPUT, rpio.LOW)

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

const rgb2Num = (red, green, blue) => {
    return (red * 256 * 256) + (green * 256) + blue
}
writeLights(rgb2Num(20, 20, 20))