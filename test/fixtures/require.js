var template = require('./template.marko');
global.templateOutput = template.renderSync({name: 'Frank'});