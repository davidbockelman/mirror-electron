const express = require('express')
const app = express()
const path = require('path')

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'))
})

app.listen(8000)