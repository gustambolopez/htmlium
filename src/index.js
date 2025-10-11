/**
 * @typedef {Object} Config
 * @property {Object} component
 * @property {Object} interpolation
 * @property {Object} security
 */

/*
If you need help or have questions, reach me on Discord:
      _  __      _ _ _
  ___/ |/ /_  __| (_) |__
 / __| | '_ \/ _` | | '_ \
 \__ \ | (_) | (_| | | | |
 |___/_|\___/\__,_|_|_| |_|
*/

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 s16.org
// License: https://opensource.org/license/mit/

// Main configuration - customize these settings as needed
const Config = {
	component: {
		tagName: "htmlium",
		attributeName: "loadcomponent",
		setTagName: "htmlium-set",
	},
	interpolation: {
		start: "{{",
		end: "}}",
		sanitize: true,
	},
	security: {
		sanitizeHtml: true,
		maxInputSize: 1000000,
		allowedProtocols: ["http:", "https:", "mailto:"],
		preventPrototypePollution: true,
	},
};

const htmlEntities = {
	"<": "&lt;",
	">": "&gt;",
	"&": "&amp;",
	'"': "&quot;",
	"'": "&#39;",
	"/": "&#x2F;",
	"`": "&#x60;",
	"=": "&#x3D;",
};

const dangerousPatterns = [
	/javascript:/gi,
	/vbscript:/gi,
	/data:/gi,
	/on\w+\s*=/gi,
	/<script/gi,
	/<\/script/gi,
	/<iframe/gi,
	/<object/gi,
	/<embed/gi,
	/<link/gi,
	/<meta/gi,
	/<style/gi,
	/<\/style/gi,
]; // Remove dangerous tags 

const allowedTags = new Set([
	'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
	'strong', 'em', 'b', 'i', 'u', 'br', 'hr', 'ul', 'ol', 'li',
	'a', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
	'section', 'article', 'header', 'footer', 'nav', 'main'
]); // Extend as you need, this is just a basic set but its good.

import jsyaml from "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs";

async function loadcomponents(url = "components.yaml") {
	if (typeof url !== 'string' || url.length > 2048) {
		throw new Error('Invalid URL provided');
	}

	try {
		const urlObj = new URL(url, window.location.origin);
		const allowedProtocols = ['http:', 'https:'];
		if (!allowedProtocols.includes(urlObj.protocol)) {
			throw new Error('Protocol not allowed');
		}
	} catch (e) {
		if (!/^[a-zA-Z0-9._-]+\.ya?ml$/.test(url)) {
			throw new Error('Invalid file path format');
		}
	}

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load components from ${url}`);
	}
	
	const text = await response.text();
	if (text.length > 1000000) {
		throw new Error('Component file too large');
	}
	
	return jsyaml.load(text);
}

class Processor {
	/**
	 * @param {Config} config
	 */
	constructor(config = {}) {
		this.config = this.mergeConfig(config);
		this.regexpcache = new Map();
		this.extcomps = {};
		this.observer = null;
		this.isObserving = false;
	}

	/**
	 * @param {Object} components
	 */
	externalcomponents(components) {
		this.extcomps = components || {};
	}

	mergeConfig(config) {
		const merged = JSON.parse(JSON.stringify(Config));
		this.deepMerge(merged, config);
		return merged;
	}

	deepMerge(target, source) {
		if (!this.config.security.preventPrototypePollution) {
			for (const key of Object.keys(source)) {
				if (
					source[key] &&
					typeof source[key] === "object" &&
					!Array.isArray(source[key])
				) {
					if (!target[key]) target[key] = {};
					this.deepMerge(target[key], source[key]);
				} else {
					target[key] = source[key];
				}
			}
			return;
		}

		for (const key of Object.keys(source)) {
			if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
				continue;
			}
			
			if (
				source[key] &&
				typeof source[key] === "object" &&
				!Array.isArray(source[key])
			) {
				if (!target[key]) target[key] = {};
				this.deepMerge(target[key], source[key]);
			} else {
				target[key] = source[key];
			}
		}
	}

	/**
	 * @param {string} str
	 */
	escaperegexp(str) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	regxep(key, factory) {
		if (!this.regexpcache.has(key)) {
			try {
				const regex = factory();
				this.regexpcache.set(key, regex);
			} catch (error) {
				console.error(`Failed to create regex for ${key}:`, error);
				return /(?:)/g;
			}
		}
		return this.regexpcache.get(key);
	}

	parsecomps(content) {
		const { component } = this.config;
		const pattern = this.regxep(
			"componentSet",
			() =>
				new RegExp(
					`<${component.setTagName}\\s+([^>]+?)>([\\s\\S]*?)<\\/${component.setTagName}>`,
					"g",
				),
		);
		const components = {};
		let html = content;

		let match = pattern.exec(content);
		while (match !== null) {
			const props = this.attributes(match[1]);
			const componentName = props.component;
			if (componentName) {
				components[componentName] = match[2];
			}
			match = pattern.exec(content);
		}

		html = content.replace(
			new RegExp(
				`<${component.setTagName}[^>]*>[\\s\\S]*?<\\/${component.setTagName}>`,
				"g",
			),
			"",
		);

		return {
			components,
			html,
		};
	}

	validateInput(input) {
		if (typeof input !== 'string') {
			return false;
		}
		if (input.length > this.config.security.maxInputSize) {
			return false;
		}
		return true;
	}

	sanitizeText(text) {
		if (!this.validateInput(text)) {
			return '';
		}
		
		if (!this.config.security.sanitizeHtml) {
			return text;
		}

		let sanitized = text.replace(/[<>&"'`=/]/g, (char) => htmlEntities[char] || char);
		
		for (const pattern of dangerousPatterns) {
			sanitized = sanitized.replace(pattern, '');
		}
		
		return sanitized;
	}

	sanitizeHtml(html) {
		if (!this.validateInput(html)) {
			return '';
		}
		
		if (!this.config.security.sanitizeHtml) {
			return html;
		}

		let sanitized = html;
		
		for (const pattern of dangerousPatterns) {
			sanitized = sanitized.replace(pattern, '');
		}

		sanitized = sanitized.replace(/<(\/?)([\w-]+)([^>]*)>/g, (match, slash, tagName, attrs) => {
			const tag = tagName.toLowerCase();
			if (!allowedTags.has(tag)) {
				return '';
			}
			
			if (attrs) {
				attrs = attrs.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
				attrs = attrs.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
				attrs = attrs.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');
			}
			
			return `<${slash}${tag}${attrs}>`;
		});
		
		return sanitized;
	}

	getnestvalue(obj, path) {
		return path.split(".").reduce((current, key) => current?.[key], obj);
	}

	/**
	 * @param {string} template
	 * @param {Object} data
	 */
	conditionalsp(template, data) {
		return template.replace(
			/\{\{#if\s+([\w.]+)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
			(_, path, ifContent, elseContent) => {
				const val = this.getnestvalue(data, path);
				const isTruthy = val && val !== "false" && val !== "0";
				return isTruthy ? ifContent : elseContent || "";
			},
		);
	}

	ploops(template, data) {
		return template.replace(
			/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
			(_, path, content) => {
				const arr = this.getnestvalue(data, path);
				if (!Array.isArray(arr)) return "";

				return arr
					.map((item, index) => {
						let itemData;
						if (typeof item === "object" && item !== null) {
							itemData = {
								...item,
								"@index": index,
							};
						} else {
							itemData = {
								this: item,
								"@index": index,
							};
						}

						let processed = this.conditionalsp(content, itemData);
						processed = this.ploops(processed, itemData);
						return this.interpolate(processed, itemData);
					})
					.join("");
			},
		);
	}

	interpolate(template, data) {
		if (!this.validateInput(template)) {
			return '';
		}
		
		const { interpolation } = this.config;
		const pattern = this.regxep(
			"interpolation",
			() =>
				new RegExp(
					`${this.escaperegexp(interpolation.start)}([\\w.@]+)${this.escaperegexp(interpolation.end)}`,
					"g",
				),
		);
		return template.replace(pattern, (_, path) => {
			const val = this.getnestvalue(data, path);
			if (val == null) return "";
			const stringVal = String(val);
			return interpolation.sanitize ? this.sanitizeText(stringVal) : stringVal;
		});
	}

	/**
	 * @param {string} tagString
	 */
	attributes(tagString) {
		const props = {};
		const regex = /(\w+)="([^"]*)"/g;
		let match = regex.exec(tagString);
		while (match !== null) {
			props[match[1]] = match[2];
			match = regex.exec(tagString);
		}

		return props;
	}

	transform(content) {
		if (!this.validateInput(content)) {
			return '';
		}
		
		const { components, html } = this.parsecomps(content);
		const mergedComponents = {
			...this.extcomps,
			...components,
		};
		
		const componentCount = Object.keys(mergedComponents).length;
		if (componentCount > 1000) {
			console.warn('Too many components detected, limiting processing');
			return html;
		}
		
		const { component } = this.config;
		const componentRegex = this.regxep(
			"component",
			() => new RegExp(`<${this.escaperegexp(component.tagName)}\\s+([^>]+?)(?:\\/?)>`, "g"),
		);
		
		let processedCount = 0;
		return html.replace(componentRegex, (_, attrs) => {
			processedCount++;
			if (processedCount > 500) {
				console.warn('Component processing limit reached');
				return '';
			}
			
			const props = this.attributes(attrs);
			const componentName = props[component.attributeName];
			
			if (!componentName || typeof componentName !== 'string' || componentName.length > 100) {
				return "";
			}
			
			if (!mergedComponents[componentName]) {
				return "";
			}
			
			const data = { ...props };
			delete data[component.attributeName];
			
			try {
				let result = mergedComponents[componentName];
				if (typeof result !== 'string' || result.length > 100000) {
					return '';
				}
				
				result = this.conditionalsp(result, data);
				result = this.ploops(result, data);
				return this.interpolate(result, data);
			} catch (error) {
				console.error('Component processing error:', error);
				return "";
			}
		});
	}

	startAutoUpdate(targetElement = document.body) {
		if (this.isObserving || !targetElement) return;
		
		this.observer = new MutationObserver((mutations) => {
			let shouldUpdate = false;
			let mutationCount = 0;
			
			for (const mutation of mutations) {
				mutationCount++;
				if (mutationCount > 100) {
					console.warn('Too many mutations detected, skipping update');
					return;
				}
				
				if (mutation.type === 'childList' || mutation.type === 'attributes') {
					shouldUpdate = true;
					break;
				}
			}
			
			if (shouldUpdate) {
				try {
					this.renderSecurely(targetElement.innerHTML, targetElement);
				} catch (error) {
					console.error('Error during auto-update:', error);
				}
			}
		});

		this.observer.observe(targetElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: [this.config.component.attributeName]
		});
		
		this.isObserving = true;
	}

	stopAutoUpdate() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		this.isObserving = false;
	} // Stop observing DOM changes

	createSecureElement(htmlString) {
		if (!this.validateInput(htmlString)) {
			return null;
		}
		
		const sanitized = this.sanitizeHtml(htmlString);
		const template = document.createElement('template');
		template.innerHTML = sanitized;
		return template.content;
	}

	renderSecurely(content, targetElement) {
		if (!targetElement || !this.validateInput(content)) {
			return '';
		}
		
		const processed = this.transform(content);
		const secureContent = this.createSecureElement(processed);
		
		if (secureContent) {
			targetElement.innerHTML = '';
			targetElement.appendChild(secureContent);
		}
		
		return processed;
	}

	renderon(content, targetElement) {
		return this.renderSecurely(content, targetElement);
	}
}

function processorcreationig(config = {}) {
	return new Processor(config);
}

async function processDocument(
	config = {},
	componentslocation = "components.yaml",
	enableAutoUpdate = true,
) {
	const processor = processorcreationig(config);
	
	try {
		const external = await loadcomponents(componentslocation);
		processor.externalcomponents(external);
	} catch (error) {
		console.warn(`Failed to load components from ${componentslocation}:`, error.message);
	}
	
	if (!document.body) {
		console.error('Document body not found');
		return processor;
	}
	
	const content = document.body.innerHTML;
	processor.renderSecurely(content, document.body);
	
	if (enableAutoUpdate) {
		processor.startAutoUpdate(document.body);
	}
	
	return processor;
}

let globalProcessor = null;

document.addEventListener("DOMContentLoaded", async () => {
	globalProcessor = await processDocument();
});

window.addEventListener("beforeunload", () => {
	if (globalProcessor) {
		globalProcessor.stopAutoUpdate();
	}
});

export {
	Processor as process,
	processorcreationig as createProcessor,
	processDocument,
};
