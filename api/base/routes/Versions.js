const path = require('path');
const FILES_STORE = path.join(__dirname, "../../../files/")
const yaml = require('js-yaml');

module.exports = {
  run(router, app){
    router.post(this.path+'/upload', (req, res) => {
      const authToken = req.headers?.authorization;
      if (!authToken || authToken !== app.env.UPLOAD_KEY) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No files were uploaded.' });
      }
      const files = req.files.File;
      if (Array.isArray(files)) {
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const path = `${FILES_STORE}${file.name}`;
            file.mv(path, (err) => {
            if (err) {
              console.log(err);
              return res.status(500).json({ message: 'An error occured during upload, please try again' });
            }
          });
        }
      } else {
        const path = `${FILES_STORE}${files.name}`;
        files.mv(path, (err) => {
          if (err) {
            console.log(err);
            return res.status(500).json({ message: 'An error occured during upload, please try again' });
          }
        });
      }
      return res.status(200).json({ message: 'Files were uploaded' });
    })

    router.get(this.path+"/download", (req, res) => {
      try {
        let latest = yaml.load(app.fs.readFileSync(path.resolve(__dirname, '../../../files/latest.yml'), 'utf-8'));
        res.download(`./files/${latest.path}`, 'Synko.exe');
      } catch(e) {
        return res.status(502).json({error: e});
      }
    })

    router.get(this.path+'/latest', (req, res) => {
      try {
          let latest = yaml.load(app.fs.readFileSync(path.resolve(__dirname, '../../../files/latest.yml'), 'utf-8'));
          res.json(latest);
      } catch(e) {
          return res.status(502).json({error: e});
      }
  });
  },
  path: ""
}