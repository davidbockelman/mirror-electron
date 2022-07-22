module.exports = {
    id: 'clock',
    position: 'top-left',
    usesInterval: true,
    hidden: false,
    interval: 1000,
    getDom: () => {
        const date = new Date()

        const wrap = document.createElement('div')
        wrap.id = 'clock'
        const dateWrap = document.createElement('div')
        dateWrap.id = 'date-wrap'
        const timeWrap = document.createElement('div')
        timeWrap.id = 'time-wrap'
        const hourWrap = document.createElement('div')
        hourWrap.id = 'hour-wrap'
        const secondWrap = document.createElement('div')
        secondWrap.id = 'second-wrap'
        const seconds = document.createElement('div')
        seconds.id = 'seconds'
        const halfday = document.createElement('div')
        halfday.id = 'halfday'

        let month
        switch (date.getMonth()) {
            case 0:
                month = 'Janurary'
                break;
            case 1:
                month = 'Feburary'
                break
            case 2:
                month = 'March'
                break
            case 3:
                month = 'April'
                break
            case 4:
                month = 'May'
                break
            case 5:
                month = 'June'
                break
            case 6:
                month = 'July'
                break
            case 7:
                month = 'August'
                break
            case 8:
                month = 'September'
                break
            case 9:
                month = 'October'
                break
            case 10:
                month = 'November'
                break
            case 11:
                month = 'December'
                break
            default:
                break;
        }

        let day
        switch(date.getDay()) {
            case 0:
                day = 'Sunday'
                break
            case 1:
                day = 'Monday'
                break
            case 2:
                day = 'Tuesday'
                break
            case 3:
                day = 'Wednesday'
                break
            case 4:
                day = 'Thursday'
                break
            case 5:
                day = 'Friday'
                break
            case 6:
                day = 'Saturday'
                break
        }

        const numDay = date.getDate()
        let suffix
        switch(numDay % 10) {
            case 1:
                suffix = 'st'
                break
            case 2:
                suffix = 'nd'
                break
            case 3: 
                suffix = 'rd'
                break
            default:
                suffix = 'th'
        }

        dateWrap.innerHTML = day + ', ' + month + ' ' + numDay + suffix + ', ' + date.getFullYear()

        let hour = date.getHours()
        let halfDay = 'am'
        halfDay = (hour >= 12) ? 'pm' : halfDay
        hour = (hour > 12) ? hour - 12 : hour
        hour = (hour == 0) ? 12 : hour

        let minutes = date.getMinutes()
        hourWrap.innerHTML = hour + ':' + ((minutes < 10) ? '0' + minutes : minutes)
        let sec = date.getSeconds()
        seconds.innerHTML = (sec < 10) ? '0' + sec : sec
        halfday.innerHTML = halfDay

        secondWrap.appendChild(seconds)
        secondWrap.appendChild(halfday)

        timeWrap.appendChild(hourWrap)
        timeWrap.appendChild(secondWrap)

        wrap.appendChild(dateWrap)
        wrap.appendChild(timeWrap)

        return wrap
    },

    start: () => {

    }, 

    give: (data) => {

    }
}