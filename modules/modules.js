const ipcRenderer = require('electron').ipcRenderer
const { constants } = require('buffer')
const fs = require('fs')
const path = require('path')



var modules = []
var styles = []
var inFullscreen = false
var gmailId

const loadModules = () => {
    fs.readdirSync(__dirname).forEach((moduleDirName, index) => {
        
        if (moduleDirName != 'modules.js') {
            
            fs.readdirSync(path.join(__dirname, moduleDirName)).forEach((fileName) => {
                if (fileName.substring(fileName.lastIndexOf('.')) == '.js') {
                    const mod = require(path.join(__dirname, moduleDirName, fileName))
                    mod.id = fileName + '_' + index
                    mod.updateDom = () => {
                        updateModule(mod.id)
                    }
                    mod.hide = (duration) => {
                        fadeOut(mod.id, duration)
                    }
                    mod.show = (duration) => {
                        fadeIn(mod.id, duration)
                    }
                    if (fileName == 'gmail.js') {
                        gmailId = mod.id
                    }
                    modules.push(mod)
                } else if (fileName.substring(fileName.lastIndexOf('.')) == '.css') {
                    styles.push(path.join(__dirname, moduleDirName, fileName))
                }
            })
        }
    })
}

const positionModulesWrappers = () => {
    modules.forEach((mod) => {
        const wrap = document.createElement('div')
        wrap.id = mod.id
        document.getElementById(mod.position).appendChild(wrap)
    })
}

const appendModules = () => {
    modules.forEach((mod) => {
        if (!mod.hidden) {
            const moduleDom = mod.getDom()
            const wrap = document.getElementById(mod.id)
            wrap.innerHTML = ''
            wrap.appendChild(moduleDom)
        }

    })
}

const appendStyles = () => {
    styles.forEach((path) => {
        const style = document.createElement('link')
        style.href = '' + path
        style.rel = 'stylesheet'
        document.getElementsByTagName('head')[0].appendChild(style)
    })
}

const updateModule = (moduleId) => {
    const tgt = modules.find((mod) => mod.id == moduleId)
    const wrap = document.getElementById(tgt.id)
    wrap.innerHTML = ''
    wrap.appendChild(tgt.getDom())
}

var intervalIds = []

const setIntervals = () => {
    modules.forEach((mod) => {
        if (mod.usesInterval) {
            const intervalId = setInterval(() => {
                if (!inFullscreen && !mod.hidden) updateModule(mod.id)
            }, mod.interval)
            intervalIds.push({
                modId: mod.id,
                intId: intervalId
            })
        }
        if (mod.usesFadeInterval) {
            setTimeout(() => {
                if (!mod.hidden) {
                    fadeOut(mod.id, mod.fadeDuration / 2)
                    setTimeout(() => {
                        fadeIn(mod.id, mod.fadeDuration / 2)
                    }, mod.fadeDuration / 2)
                }
                setInterval(() => {
                    if (!mod.hidden) {
                        fadeOut(mod.id, mod.fadeDuration / 2)
                        setTimeout(() => {
                            fadeIn(mod.id, mod.fadeDuration / 2)
                        }, mod.fadeDuration / 2)
                    }
                }, mod.fadeInterval)
            }, mod.fadeStart)
        }
       
    })
}

var storage = []

const makeFullscreen = (data) => {
    if (!inFullscreen) {
        
        inFullscreen = true
        const wrap = document.getElementById('fullscreen')
        wrap.childNodes.forEach((node) => storage.push(node))
        wrap.innerHTML = ''
        wrap.appendChild(data)
    } else {
        console.log('[MODULES_ERROR]: Display already in fullscreen')
    }
}

const exitFullscreen = () => {
    if (inFullscreen) {
        document.getElementById('fullscreen').innerHTML = ''
        storage.forEach((node, index) => {
            document.getElementById('fullscreen').appendChild(storage[index])
        })
        inFullscreen = false
        storage = []
    } else {
        console.log('[MODULES_INFO]: Already in fullscreen')
    }
}

const clearModInterval = (moduleId) => {
    const intervalId = intervalIds.find((mod) => mod.modId == moduleId)
    clearInterval(intervalId.intId)
}

const getModuleIds = () => {
    var result = []
    modules.forEach((mod) => {
        result.push(mod.id)
    })
    return result
}

const giveData = (moduleId, data) => {

    const tgt = modules.find((mod) => mod.id == moduleId)
    tgt.give(data)
}

const startModules = () => {
    modules.forEach((mod) => {
        mod.start()
    })
}

const fadeOut = (moduleId, duration) => {
    const mod = modules.find((mod) => mod.id == moduleId)
    if (!mod.hidden) {
        mod.hidden = true
        const wrap = document.getElementById(moduleId)
        wrap.style.opacity = 1
        const fadeInterval = setInterval(() => {
            if (wrap.style.opacity > 0) {
                wrap.style.opacity -= 0.02
            } else {
                
                clearInterval(fadeInterval)
            }
        }, duration / 50)
    } else {
        console.log('[MODULES_ERROR]: Module is already hidden')
    }
}

const fadeIn = (moduleId, duration) => {
    const mod = modules.find((mod) => mod.id == moduleId)
    if (mod.hidden) {
        const wrap = document.getElementById(moduleId)
        wrap.style.opacity = 0
        const fadeInterval = setInterval(() => {
            
            if (wrap.style.opacity < 1) {
                console.log(wrap.style.opacity)
                wrap.style.opacity -= -0.02
                
            } else {
                mod.hidden = false
                clearInterval(fadeInterval)
            }
        }, duration / 50)
    } else {
        console.log('[MODULES_INFO]: Module is already shown')
    }
}

const setupIpcRoutes = () => {
    //start modules
    ipcRenderer.on('modules-start', () => {
        console.log('starting modules')
        loadModules()
        startModules()
        positionModulesWrappers()
        appendStyles()
        appendModules()
        setIntervals()
    })
    //update a module
    ipcRenderer.on('update-module', (event, moduleId) => {
        updateModule(moduleId)
    })
    //give a module data
    ipcRenderer.on('give-data', (event, moduleId, data) => {
        giveData(moduleId, data)
    })
    //get module ids
    ipcRenderer.on('get-modules', () => {
        console.log('Got modules request')
        ipcRenderer.send('modules-array', getModuleIds())
    })
    //make fullscreen
    ipcRenderer.on('make-fullscreen', (event, data) => {
        console.log('making fullscreen')
        const parser = new DOMParser()
        makeFullscreen(parser.parseFromString(data, 'text/html').body)
    })
    //clear fullscreen
    ipcRenderer.on('exit-fullscreen', () => {
        exitFullscreen()
    })
    //hide
    ipcRenderer.on('hide-module', (event, moduleId, duration) => {
        fadeOut(moduleId, duration)
    })
    //show
    ipcRenderer.on('show-module', (event, moduleId, duration) => {
        fadeIn(moduleId, duration)
    })

    ipcRenderer.on('gmail-auth-json', (event, authJson) => {
        giveData(gmailId, authJson)
    })

    ipcRenderer.on('set-emails-displayed', (event, data) => {
        giveData(gmailId, data)
    })

}

setupIpcRoutes()

module.exports = {
    start: () => {
        loadModules()
        startModules()
        positionModulesWrappers()
        appendStyles()
        appendModules()
    },

    updateModule: updateModule
}
