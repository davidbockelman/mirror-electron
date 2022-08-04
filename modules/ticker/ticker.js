const symbols = ['AAPL', 'MSFT', 'GOOG', 'GOOGL', 'AMZN', 'TSLA', 'JNJ', 'META',
'TSM', 'V', 'XOM', 'MA', 'PFE', 'TM', 'AXP', 'GS', 'NKE']
var data = []
const apiKey = 'cblh47qad3ib03etmpo0'
const getData = () => {
    data = []
    for (const symbol of symbols) {
        const req = new XMLHttpRequest()
        req.open('GET', 'https://finnhub.io/api/v1/quote?symbol='
        + encodeURIComponent(symbol) + '&token=' + apiKey)
        req.onload = () => {
            const res = JSON.parse(req.responseText)
            var result = {}
            result["symbol"] = symbol
            result["price"] = res.c
            result["change"] = res.dp
            data.push(result)
            if (data.length >= 17) {
                module.exports.updateDom()
            }
        }
        req.send()
    }
}

module.exports = {
    position: 'top-bar',
    id: 'ticker',
    hidden: false,


    getDom: () => {
        const ticker = document.createElement('div')
        ticker.id = 'ticker'

        for(const d of data) {
            const wrap = document.createElement('div')
            wrap.className = 'ticker-single'
            const symbol = document.createElement('div')
            symbol.className = 'ticker-single-symbol'
            const rightWrap = document.createElement('div')
            rightWrap.className = 'ticker-single-right'
            const price = document.createElement('div')
            price.className = 'ticker-single-price'
            const change = document.createElement('div')
            change.className = 'ticker-single-change'

            symbol.innerHTML = d.symbol
            price.innerHTML = d.price
            change.innerHTML = d.change + '%'
            if (d.change < 0) {
                change.style.color = 'red'
            } else {
                change.innerHTML = '+' + change.innerHTML
                change.style.color = 'green'
            }

            rightWrap.appendChild(price)
            rightWrap.appendChild(change)

            wrap.appendChild(symbol)
            wrap.appendChild(rightWrap)
            ticker.appendChild(wrap)
        }
        

        return ticker
    },

    start: () => {
        getData()
        setInterval(getData, 5 * 60000)
    },

    give: (data) => {

    }
}