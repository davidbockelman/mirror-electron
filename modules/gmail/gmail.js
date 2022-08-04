const res = require("express/lib/response")

var authJson
var refreshToken
var rawMessages
var expandedMessages = []
var numEmailsDisplayed = 3
const getData = () => {
    const req = new XMLHttpRequest()
    req.open('GET', 'https://gmail.googleapis.com/gmail/v1/users/me/messages?access_token='
    + authJson["access_token"])
    req.onload = () => {
        const response = JSON.parse(req.responseText)
        rawMessages = response.messages

        expandDetail()
    }
    req.send()
}

const expandDetail = () => {
    expandedMessages = []
    for (var i = 0; i < numEmailsDisplayed; i++) {
        const req = new XMLHttpRequest()
        req.open('GET', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/'
        + rawMessages[i].id + '?access_token=' + authJson["access_token"])
        req.onload = () => {
            const response = JSON.parse(req.responseText)
            const subject = response.payload.headers.find((header) => header.name == 'Subject')
            const sender = response.payload.headers.find((header) => header.name == 'From')
            const date = response.payload.headers.find((header) => header.name == "Date")
            var result = {}
            result["subject"] = subject.value.substring(0, 30) + '...'
            result["sender"] = sender.value.substring(0, 20) + '...'
            result["time"] = formatMs(Date.now() - new Date(date.value).valueOf())
            expandedMessages.push(result)
        }
        req.send()
    }
}

const formatMs = (number) => {
    number = Math.floor(number / 1000)
    if (number < 60) {
        return number + ' ' + (number < 2 ? 'sec' : 'secs') + ' ago'
    }
    number = Math.floor(number / 60)
    if (number < 60) {
        return number + ' ' + (number < 2 ? 'min' : 'mins') + ' ago'
    }
    number = Math.floor(number / 60)

    return number + ' ' + (number < 2 ? 'hour' : 'hours') + ' ago'
}

const getNewAccessToken = () => {
    const req = new XMLHttpRequest()
    req.open('POST', 'https://oauth2.googleapis.com/token?' + 
    'refresh_token=' + refreshToken + 
    '&client_id=' + '86662619336-20mkmfhrkuut721i2ehg0kc1sv0q7l0a.apps.googleusercontent.com' + 
    '&client_secret=' + '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' + 
    '&grant_type=' + 'refresh_token')
    req.onload = () => {
        const response = JSON.parse(req.responseText)
        authJson["access_token"] = response["access_token"]
    }
    req.send()
}

module.exports = {
    position: 'top-right',
    id: 'gmail',
    hidden: false,
    usesInterval: true,
    interval: 1000,
    

    getDom: () => {
        this.count++
        if (this.count >= 5 * 60) {
            this.count = 0
            getData()
        }
        const wrap = document.createElement('div')
        wrap.id = 'gmail'
        const header = document.createElement('div')
        header.id = 'gmail-header'
        const gmails = document.createElement('div')
        gmails.id = 'gmail-list'
        
        
        for (const data of expandedMessages) {
            const emailLeft = document.createElement('div')
            emailLeft.className = 'gmail-left-wrap'
            const email = document.createElement('div')
            email.className = 'gmail-single-wrap'
            const emailTitle = document.createElement('div')
            emailTitle.className = 'gmail-single-title'
            const sender = document.createElement('div')
            sender.className = 'gmail-single-sender'
            const time = document.createElement('div')
            time.className = 'gmail-single-time'

            emailTitle.innerHTML = data.subject
            sender.innerHTML = data.sender
            time.innerHTML = data.time

            emailLeft.appendChild(emailTitle)
            emailLeft.appendChild(sender)

            email.appendChild(emailLeft)
            email.appendChild(time)

            gmails.appendChild(email)
        }
        
        header.innerHTML = "Gmail"

        

        wrap.appendChild(header)
        wrap.appendChild(gmails)

        return wrap
    },

    start: () => {
        this.count = 0
    },

    give: (data) => {
        if (data.route == 'gmail-auth') {
            authJson = data
            refreshToken = data["refresh_token"]
            getData()
            setInterval(getNewAccessToken, 3000 * 1000)
        } else if (data.route == 'update-num-emails') {
            console.log('updating num emails: ' + data.numEmails)
            numEmailsDisplayed = data.numEmails
            expandDetail()
        }
    }
}