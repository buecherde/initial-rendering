'use strict';
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const pixelmatch = require('pixelmatch');
const pkg = require('../package.json');
const PNG = require('pngjs').PNG;
const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');

/**
 * initial rendering result
 *
 * @typedef {object} initialRenderingResult
 * @property {number} execution - unix timestamp of execution in ms
 * @property {string} url - url
 * @property {string} device - device name
 * @property {number} width - screenshot width in px
 * @property {number} height - screenshot height in px
 * @property {string} full - base64 png screenshot of fully loaded website
 * @property {array.<initialRenderingStep>} steps - loading steps
 * @property {string} version - version tag
 */

/**
 * initial rendering step
 *
 * @typedef {object} initialRenderingStep
 * @property {string} name - step name
 * @property {number} numDiffPixels - number of diff pixels
 * @property {number} ratio - ratio of diff pixels
 * @property {string} screenshot - base64 png screenshot of loaded step
 * @property {string} diff - base64 png screenshot of diff image
 */

/**
 * Use Chrome headless screenshots for comparing the initial rendering and return all the informations as object
 *
 * @async
 * @param {object} options - options
 * @param {string} options.url - url
 * @param {string} [options.device=Nexus 5X] - device name which is supported by chromium
 * @param {object} [options.puppeteerOptions] - additional options for puppeteer
 * @param {object} [options.auth] - http authentication
 * @param {string} [options.auth.username] - username
 * @param {string} [options.auth.password] - password
 * @param {string} [options.returnScreenshots=true] - return screenshots as base64
 * @returns {promise.<initialRenderingResult>}
 */
const initialRendering = ({url=false, device='Nexus 5X', puppeteerOptions={}, auth={}, returnScreenshots=true} = {}) => {
	if (devices[device] == null) {
		return Promise.reject(`device "${device}" isn't available at chromium`);
	}

	if (/^https?:\/\//.test(url) === false) {
		return Promise.reject(`url "${url}" isn't valid`);
	}

	return Promise.all([
		getScreenshot('initial'),
		getScreenshot('no-assets'),
		getScreenshot('full')
	]).then(async function(screenshots) {
		const last = screenshots.pop();
		const width = last[1].width;
		const height = last[1].height;
		const allPixels = width*height;

		const result = {
			execution: Date.now(),
			url,
			device,
			width,
			height,
			steps: [],
			version: pkg.version
		};
		if (returnScreenshots === true) {
			result.full = await pngToBase64(last[1]);
		}

		for (let i in screenshots) {
			const screenshot = screenshots[i];
			const diff = new PNG({
				width,
				height
			});
			const numDiffPixels = pixelmatch(last[1].data, screenshot[1].data, diff.data, width, height, {
				threshold: 0.1
			});

			const ratio = Math.round(numDiffPixels / allPixels * 100 * 100) / 100;

			const step = {
				name: screenshot[0],
				numDiffPixels,
				ratio
			};
			if (returnScreenshots === true) {
				step.screenshot = await pngToBase64(screenshot[1]);
				step.diff = await pngToBase64(diff);
			}
			result.steps.push(step);
		}

		return result;
	});

	/**
	 * get screenshot from url
	 *
	 * @async
	 * @param {string} type - type
	 * @returns {promise.<array>}
	 */
	async function getScreenshot(type) {
		const result = [
			type
		];

		const browser = await puppeteer.launch(puppeteerOptions);
		const page = await browser.newPage();
		if (auth != null && typeof auth === 'object' && auth.username != null && auth.password != null) {
			await page.authenticate(auth);
		}
		await page.emulate(devices[device]);

		if(['initial', 'no-assets'].indexOf(type) !== -1) {
			await page.setRequestInterception(true);
			page.on('request', interceptedRequest => {
				if (type === 'initial' && interceptedRequest._resourceType !== 'document') {
					interceptedRequest.abort();
				} else if (type === 'no-assets' && ['script', 'stylesheet'].indexOf(interceptedRequest._resourceType) !== -1) {
					interceptedRequest.abort();
				} else {
					interceptedRequest.continue();
				}
			});
		}

		await page.goto(url);

		result.push(await bufferToPng(await page.screenshot()));

		await browser.close();

		return result;
	}

	/**
	 * buffer to base64 string
	 *
	 * @param {object} buffer - buffer
	 * @param {string} type - image type
	 * @returns {string}
	 */
	function bufferToBase64Img(buffer, type) {
		return `data:image/${type};base64,` + buffer.toString('base64');
	}

	/**
	 * return png based on buffer
	 *
	 * @async
	 * @param {buffer} data - image data
	 * @returns {promise.<object>}
	 */
	function bufferToPng(data) {
		return new Promise((resolve, reject) => {
			const img = new PNG();
			img.parse(data, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve(img);
				}
			});
		});
	}

	/**
	 * png to base64
	 *
	 * @async
	 * @param {object} png - png object
	 * @returns {promise.<string>}
	 */
	function pngToBase64(png) {
		return new Promise((resolve, reject) => {
			const chunks = [];
			png.pack();
			png.on('data', function(chunk) {
				chunks.push(chunk);
			});
			png.on('error', function(err) {
				reject(err);
			});
			png.on('end', function() {
				imagemin.buffer(Buffer.concat(chunks), {
					use: [
						imageminPngquant()
					]
				}).then(buffer => {
					resolve(bufferToBase64Img(buffer, 'png'));
				}).catch(err => {
					reject(err);
				});
			});
		});
	}
};

module.exports = initialRendering;