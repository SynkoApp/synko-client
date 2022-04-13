const { default: axios } = require('axios');
const { parse: HTML } = require('node-html-parser');
module.exports = {
  run(router, app){
    router.get(this.path+"/:type", (req, res) => {
      console.log(req.query)
      if(!req.query.url) return res.status(400).json({message : "No url provided"});
      switch(req.params.type) {
        case "i":
          axios({
            method: "GET",
            url: `https://proxy.duckduckgo.com/iu/?u=${req.query.url}`,
            responseType: 'arraybuffer'
          }).then(resp => {
            res.set("Content-Type", resp.headers['content-type'] || "image/png");
            res.send(resp.data);
          }).catch(err => {
            res.sendFile(__dirname + '/assets/default.png');
          });
          break;
        case "m":
          axios({
            method: "GET",
            url: `${req.query.url}`,
            headers: {
              "User-Agent": "Synko Bot"
            }
          }).then(resp => {
            if(!resp.headers['content-type'].includes('text/html')) return res.status(400).json({message : "No url provided"});
            let $ = HTML(resp.data);
            let og = {},
                meta = {};
            let title = $.querySelector('head title');
            if (title) meta.title = title.text;
            let canonical = $.querySelector('link[rel=canonical]');
            if (canonical) meta.url = canonical.getAttribute('href');
            meta.domain = app.urlparser(req.query.url).hostname;
            let icon = $.querySelector('link[rel=icon]') || $.querySelector('link[rel="shortcut icon"]');
            if(icon) meta.icon = icon.getAttribute('href');
            else meta.icon = icon;
            let metas = $.querySelectorAll('head meta');
            for(let i = 0; i < metas.length; i++) {
              let el = metas[i];
              ['title', 'description', 'image', 'theme-color'].forEach(s => {
                let val = readMT(el, s);
                if(val) meta[s] = val;
              });
              ['og:title', 'og:description', 'og:image', 'og:url', 'og:site_name', 'og:type'].forEach(s => {
                let val = readMT(el, s);
                if(val) og[s.split(':')[1]] = val;
              });
            }
            function readMT(el, name) {
              let prop = el.getAttribute('name') || el.getAttribute('property');
              return prop == name ? el.getAttribute('content') : null;
            };
            return res.json({meta, og});
          }).catch(err => {
            if(err.request._isRedirect) {
              res.status(410).json({
                error: "Bad redirect",
                content: `${err.code}: ${err.syscall} from ${err.hostname}`
              });
            } else if(err.response?.status == 404) {
              res.status(404).json({
                error: "Not found",
                content: err.message
              });                    
            } else {
              res.status(502).json({
                error: "Internal server error",
                content: err.message
              });
            }
          });
          break;
        default:
          res.sendStatus(404);
      }
    })
  },
  path: "/proxy"
}