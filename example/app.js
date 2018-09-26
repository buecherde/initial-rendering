const http = require('http');
const initialRendering = require('../lib/initialRendering');
const url = 'https://www.buecher.de';

http.createServer(function(req, res) {
	if (req.url === '/favicon.ico') {
		res.writeHead(204);
		return res.end();
	}

	initialRendering({
		puppeteerOptions: {
			executablePath: '/usr/bin/chromium-browser' // I have to pass the executable cause of our docker environment
		},
		url,
		auth: { // optional http auth
			username: 'foo',
			password: 'bar'
		},
		device: 'Nexus 5X',
		returnScreenshots: true, // optional
		waitFor: { // optional
			1: 0,
			2: 1500,
			3: 1500
		}
	}).then(data => {
		res.writeHead(200, {'Content-Type': 'text/html'});
		let html = `<html><head><title>initial rendering of ${url}</title><style type="text/css">img{max-width:100%;}</style></head><body>`;
		html += `<h1>initial rendering of ${url}</h1>`;
		html += `<div>Execution: ${new Date(data.execution).toISOString().replace(/T/, ' ').replace(/\.\d+Z$/, '')}</div>`;
		html += `<div>Device: ${data.device}</div>`;
		html += `<div>Screenshot dimensions: ${data.width}x${data.height} (${formatNumber(data.width*data.height)}px)</div>`;
		html += `<div>Lib version: ${data.version}</div>`;

		data.steps.forEach(step => {
			html += `<h2>${step.name} compared to full</h2>`;
			html += `<div>Diff pixels: ${formatNumber(step.numDiffPixels)}</div>`;
			html += `<div>Ratio: ${step.ratio}%</div>`;
			html += `<table><tr><td><img src="${step.screenshot}"/></td><td><img src="${data.full}"/></td><td><img src="${step.diff}"/></td></tr></table>`;
		});

		html += '</body></html>';
		res.end(html);
	}).catch(err => {
		res.writeHead(400, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({
			error: err.message || err
		}));
	});

	/**
	 * format number with thousand separator
	 *
	 * @param {number} num - number
	 * @returns {string}
	 */
	function formatNumber(num) {
		return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
	}
}).listen(3000);