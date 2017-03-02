markoify
========

This Browserify transform results in any referenced Marko templates to automatically be compiled and bundled up so that the templates can be rendered in the browser.

# Installation

```bash
npm install markoify --save
```

# Usage:

```bash
browserify -g markoify --extension=".marko" main.js -o browser.js
```

# Example

__my-project/template.marko:__

```html
Hello ${data.name}!
```

__my-project/main.js:__

```javascript
var template = require('./template.marko');
template.render({
        name: 'World'
    },
    function(err, output) {
        console.log('Output: ', output)
    });
```

Page HTML:

```
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Marko+Browserify Test</title>
    </head>
    <body>
        <script src="browser.js"></script>
    </body>
</html>
```

Browser output:

```
Output: Hello World!
```

# Further Reading

* [Marko](https://github.com/marko-js/marko)
* [Lasso.js](https://github.com/lasso-js/lasso) (alternative to Browserify)

# Discuss

If you have any questions or run into any problems, please reach out to us in the [Marko Gitter chat room](https://gitter.im/marko-js/marko) or open a Github issue.

# Maintainers

* [Patrick Steele-Idem](https://github.com/patrick-steele-idem) (Twitter: [@psteeleidem](http://twitter.com/psteeleidem))

# Contribute

Pull Requests welcome. Please submit Github issues for any feature enhancements, bugs or documentation problems.

# License

Apache License v2.0
