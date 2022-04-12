const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

module.exports = {
    run(router, app) {
        router.get(this.path, (req, res) => {
            let latest = yaml.load(fs.readFileSync(path.resolve(__dirname, '../../../files/latest.yml'), 'utf-8'));
            fs.readdir(path.resolve(__dirname, '../../../files'), async (err, files) => {
                if(err) return res.send(err);
                let executables = files.filter((v => v.split('.').pop() == "exe"));
                let versions = [];
                executables.map(async (f) => {
                    let pathFile = path.resolve(__dirname, `../../../files/${f}`);
                    let file = fs.statSync(pathFile);
                    let size = app.fBytes(file.size, 4);
                    let version = f.replace('.exe', '').replace('Synko ', '');
                    versions.push({
                        version,
                        date: file.mtime,
                        size: `${size.size} ${size.unit}`,
                        hash: null
                    });
                });
                return res.json({ latest, versions });
            });
        });

        router.delete(this.path + '/:version', (req, res) => {
            try {
                [`Synko ${req.params.version}.exe`, `Synko ${req.params.version}.exe.blockmap`].forEach(e => {
                    fs.unlink(path.resolve(__dirname, `../../../files/${e}`), (err) => {
                        if(err) console.log(err);
                    });
                });
            } catch(err) {
                throw new Error(err)
                return res.status(500).json({message: "Server error"});
            }
        });

        router.get(this.path + '/:version/hash', (req, res) => {
            if(!req.params.version) return res.status(403).json({message: "No version provided"})
            let filePath = path.resolve(__dirname, `../../../files/Synko ${req.params.version}.exe`);
            if(fs.existsSync(filePath)) {
                app.hashFile(filePath).then(hash => {
                    return res.json({ version: req.params.version, hash });
                })
            } else return res.status(404).json({message: "Resource not found"});
        });
    },
    path: "/versions"
}