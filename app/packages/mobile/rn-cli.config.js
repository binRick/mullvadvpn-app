const path = require('path');

module.exports = {
  getProjectRoots: () => {
    return [__dirname, path.resolve(path.join(__dirname, '../common'))];
  },
};
