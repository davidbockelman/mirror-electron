
module.exports = {
    id: 'helloworld',
    position: 'top-right',
    usesInterval: true,
    hidden: true,
    interval: 1000,
    getDom: () => {
        const wrap = document.createElement('div')
        wrap.id = 'hello-world-container'
        wrap.innerHTML = this.text[this.index]
        this.index  = (this.index + 1) % this.text.length
        return wrap
    },

    give: (data) => {
        this.text.push(data.text)
    },

    start: () => {
        this.text = ['Hello World', 'More Text', 'Another phrase']
        this.index = 0
    }
}