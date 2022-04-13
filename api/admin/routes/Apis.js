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
              admin: true,
              state: app.disabled_routes.includes(`/admin${layer.route.path}@${method}`)
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
              admin: false,
              state: app.disabled_routes.includes(`${layer.route.path}@${method}`)
            })
          })
        });
        res.send({routes: [...adminRoutes, ...baseRoutes]})
      })
      .put((req, res) => {
        let { route, method } = req.body;
        app.disabled_routes.push(`${route}@${method}`)
        res.sendStatus(200)
        console.log(app.disabled_routes)
      })
      .patch((req, res) => {
        let { route, method } = req.body;
        app.disabled_routes.splice(app.disabled_routes.indexOf(`${route}@${method}`), 1)
        res.sendStatus(200)
        console.log(app.disabled_routes)
      })
  },
  path: "/apis"
}