var template = require('view-engine').load(require.resolve('./template.marko'));
global.templateOutput = template.renderSync({name: 'John'});