const API_KEY = 'iqAgR3Wk3svxYFgYRchKnq8aBQ8OMRyX'
const END_POINT = 'https://api.nytimes.com/svc/topstories/v2/business.json?api-key=' + API_KEY
let articles
const getData = () => {
    const req = new XMLHttpRequest()
    req.open('GET', END_POINT)
    req.onload = () => {
        const response = JSON.parse(req.responseText)
        articles = response.results
    }
    req.send()
}


module.exports = {
    position: 'bottom-bar',
    id: "news",
    hidden: false,
    
    usesInterval: true,
    interval: 1000,
    

    getDom: () => {
        this.count++
        const wrap = document.createElement('div')
        wrap.id = 'news'
        const header = document.createElement('div')
        header.id = 'news-header'
        const title = document.createElement('div')
        title.id = 'news-title'
        const description = document.createElement('div')
        description.id = 'news-description'
        header.innerHTML = 'New York Times'
        wrap.appendChild(header)
        if (articles) {
            const curArticle = articles[this.index]
            title.innerHTML = curArticle.title
            description.innerHTML = curArticle.abstract
            wrap.appendChild(title)
            wrap.appendChild(description)
            if (this.count % 15 == 0) {
                this.index = (this.index + 1) % articles.length
            }
        } else {
            description.innerHTML = 'Loading..'
            wrap.appendChild(description)
        }
       

        return wrap
    },

    start: () => {
        getData()
        setInterval(() => getData(), 600000)
        this.count = 0
        this.index = 0
    }, 

    give: (data) => {

    }
}