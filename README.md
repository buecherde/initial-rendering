# initial-rendering
Use Chrome headless screenshots for comparing the following steps with the full loaded page:
* only the document is loaded
* the document without any style and script tags is loaded

The library uses puppeteer as wrapper for Chrome headless.

## Install
npm install initial-rendering

## Usage

The library returns a json object with the results. All images are passed as optimized base64 encoded pngs. 
[imagemin-pngquant](https://github.com/imagemin/imagemin-pngquant) is used for optimizing the images.
[pixelmatch](https://github.com/mapbox/pixelmatch) is used for comparing the images.

```js
const initialRendering = require('initial-rendering');
initialRendering({
	url: 'https://foo.bar',
	puppeteerOptions: {}, // optional
	device: 'Nexus 5X' // optional. default: Nexus 5X
}).then(data => {
	// handle result
}).catch(err => {
	// handle err
});
```

## API

### initialRendering(options)

Use Chrome headless screenshots for comparing the initial rendering and return all the informations as object

**Parameters**
-   `options` **object** options (optional, default `{}`)
    -   `options.url` **string** url (optional, default `false`)
    -   `options.device` **string** device name which is supported by chromium (optional, default `Nexus5X`)
    -   `options.puppeteerOptions` **object** additional options for puppeteer (optional, default `{}`)
    -   `options.auth` **object** http authentication (optional, default `{}`)
        -   `options.auth.username` **string** username
        -   `options.auth.password` **string** password

Returns **promise&lt;initialRenderingResult>**

#### initialRenderingResult
Type: object

**Properties**
-   `execution` **number** unix timestamp of execution in ms
-   `url` **string** url
-   `device` **string** device name
-   `width` **number** screenshot width in px
-   `height` **number** screenshot height in px
-   `full` **string** base64 png screenshot of fully loaded website
-   `steps` **array&lt;initialRenderingStep>** loading steps
-   `version` **string** version tag

#### initialRenderingStep
Type: object

**Properties**
-   `name` **string** step name
-   `numDiffPixels` **number** number of diff pixels
-   `ratio` **number** ratio of diff pixels
-   `screenshot` **string** base64 png screenshot of loaded step
-   `diff` **string** base64 png screenshot of diff image

## Examples

### Screenshots
![example screenshot](example/example.png?raw=true "Screenshot example")

### JSON result
```json
{
	"execution": 1527064733409,
	"url": "https://www.buecher.de",
	"device": "Nexus 5X",
	"width": 1082,
	"height": 1922,
	"full": "data:image/png;base64,abc",
	"steps": [{
		"name": "initial",
		"numDiffPixels": 627364,
		"ratio": 30.17,
		"screenshot": "data:image/png;base64,abc",
		"diff": "data:image/png;base64,abc"
	}, {
		"name": "no-assets",
		"numDiffPixels": 295434,
		"ratio": 14.21,
		"screenshot": "data:image/png;base64,abc",
		"diff": "data:image/png;base64,abc"
	}],
	"version": "0.0.1"
}
```