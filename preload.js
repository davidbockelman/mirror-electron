const { contextBridge, ipcRenderer } = require('electron')
const Modules = require('./modules/modules')

console.log('[PRELOAD]: preload.js running')


// contextBridge.exposeInMainWorld('hello', {
//     text: 'hello'
// })