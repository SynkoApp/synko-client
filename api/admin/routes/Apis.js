const usages = require('../../route_usages.json');
module.exports =  {
  run(router, app){

      // Get active APIS List
      router.route(this.path)
      .get((req, res) => {
        let [adminRoutes, baseRoutes] = [[], []];
        app.adminRouter.stack.forEach(layer => {
          if(!layer.route) return
          Object.keys(layer.route.methods).forEach(method => {
            baseRoutes.push({
              route: "/admin"+layer.route.path,
              method,
              usage: usages["/admin"+layer.route.path][method],
              admin: true
            })
          })
        });
        app.baseRouter.stack.forEach(layer => {
          if(!layer.route) return
          Object.keys(layer.route.methods).forEach(method => {
            baseRoutes.push({
              route: layer.route.path,
              method,
              usage: usages[layer.route.path][method],
              admin: false
            })
          })
        });
        res.send({routes: [...adminRoutes, ...baseRoutes]})
      })
  },
  path: "/apis"
}