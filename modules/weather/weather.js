const API_KEY = 'b9e1023b24ac49bf908152126220807'
const END_POINT = 'https://api.weatherapi.com/v1/forecast.json?key=b9e1023b24ac49bf908152126220807&q=Austin&days=3&aqi=no&alerts=no'
const path = require('path')

let curData
let todaysForecast
let threeDay
const getData = () => {
    const req = new XMLHttpRequest()
    req.open('GET', END_POINT)
    req.onload = () => {
        const response = JSON.parse(req.responseText)
        curData = response.current
        todaysForecast = response.forecast.forecastday[0]
        threeDay = response.forecast.forecastday
        
    }
    req.send()
}

module.exports = {
    position: 'bottom-right',
    id: 'weather',
    hidden: false,
    usesInterval: true,
    interval: 1000,

    getDom: () => {
	this.count++
	if (this.count == 300) {
	    getData()
	    this.count = 0
	}
        const wrap = document.createElement('div')
        wrap.id = 'weather'
        const todayWrap = document.createElement('div')
        todayWrap.id = 'weather-today'
        const left = document.createElement('div')
        left.id = 'weather-left'
        const header = document.createElement('div')
        header.id = 'weather-header'
        const right = document.createElement('div')
        right.id = 'weather-right'
        const temp = document.createElement('div')
        temp.id = 'weather-temp-today'
        const icon = document.createElement('img')
        icon.id = 'weather-today-icon'
        const hilo = document.createElement('div')
        hilo.id = 'weather-today-hilo'
        const forecast = document.createElement('div')
        forecast.id = 'weather-forecast'
        

        if (curData && todaysForecast) {
            wrap.innerHTML = ''
            temp.innerHTML = curData.temp_f + '\u00B0'
            header.innerHTML = 'Austin, TX'
            icon.src = path.join(__dirname, 'icons', 'partly-cloudy.png')
            hilo.innerHTML = 'Feels like '  + curData.feelslike_f + '\u00B0'
            
            for (var i = 0; i < threeDay.length; i++) {
                const forecastDayWrap = document.createElement('div')
                forecastDayWrap.className = 'forecast-wrap'
                const forecastDay = document.createElement('div')
                forecastDay.className = 'forecast-day'
                const forecastIcon = document.createElement('img')
                forecastIcon.className = 'forecast-icon'
                const forecastHilo = document.createElement('div')
                forecastHilo.className = 'forecast-hilo'

                const day = new Date().getDay()
                let dayOfWeek
                switch((day + i) % 7) {
                    case 0:
                        dayOfWeek = 'SUN'
                        break
                    case 1:
                        dayOfWeek = 'MON'
                        break
                    case 2:
                        dayOfWeek = 'TUE'
                        break
                    case 3:
                        dayOfWeek = 'WED'
                        break
                    case 4:
                        dayOfWeek = 'THUR'
                        break
                    case 5:
                        dayOfWeek = 'FRI'
                        break
                    case 6:
                        dayOfWeek = 'SAT'
                        break
                }
                forecastDay.innerHTML = dayOfWeek
                forecastIcon.src = path.join(__dirname, 'icons', 'partly-cloudy.png')
                forecastHilo.innerHTML = threeDay[i].day.mintemp_f + ' / ' + threeDay[i].day.maxtemp_f + '\u00B0'

                forecastDayWrap.appendChild(forecastDay)
                forecastDayWrap.appendChild(forecastIcon)
                forecastDayWrap.appendChild(forecastHilo)

                forecast.appendChild(forecastDayWrap)
            }
        } else {
            wrap.innerHTML = 'Loading'
        }

        left.appendChild(temp)
        right.appendChild(icon)
        right.appendChild(hilo)

        todayWrap.appendChild(left)
        todayWrap.appendChild(right)

        wrap.appendChild(header)
        wrap.appendChild(todayWrap)
        wrap.appendChild(forecast)

        return wrap
    },

    start: () => {
        getData()
	this.count = 0
    }, 

    give: () => {

    }
}
