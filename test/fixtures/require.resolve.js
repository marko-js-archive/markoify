var template = require('marko').load(require.resolve('./template.marko'));
global.templateOutput = template.renderSync({name: 'Jane'});