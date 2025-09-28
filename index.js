/**
 * @typedef {Object} Config
 * @property {Object} component
 * @property {Object} interpolation
 * @property {Object} security
 */

/*
if you have any questions reach me at discord:
      _  __      _ _ _   
  ___/ |/ /_  __| (_) |__ 
 / __| | '_ \/ _` | | '_ \
 \__ \ | (_) | (_| | | | | 
 |___/_|\___/\__,_|_|_| |_|
*/

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 s16.org
// License: https://opensource.org/license/mit/

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
	},
};

const sanitize = {
	"<": "&lt;",
	">": "&gt;",
	"&": "&amp;",
	'"': "&quot;",
	"'": "&#39;",
};

import jsyaml from "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs";

/**
 * @param {string} url
 */
async function loadComponentsFromYaml(url = "components.yaml") {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to load components from ${url}`);
	const text = await response.text();
	return jsyaml.load(text);
}

class Processor {
	/**
	 * @param {Config} config
	 */
	constructor(config = {}) {
		this.config = this.mergeConfig(config);
		this.regexCache = new Map();
		this.externalComponents = {};
	}

	/**
	 * @param {Object} components
	 */
	setExternalComponents(components) {
		this.externalComponents = components || {};
	}

	/**
	 * @param {Config} config
	 */
	mergeConfig(config) {
		const merged = JSON.parse(JSON.stringify(Config));
		this.deepMerge(merged, config);
		return merged;
	}


	deepMerge(target, source) {
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
	}

	/**
	 * @param {string} str
	 */
	escRegex(str) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}


	getRegex(key, factory) {
		if (!this.regexCache.has(key)) {
			this.regexCache.set(key, factory());
		}
		return this.regexCache.get(key);
	}

	/**
	 * @param {string} content
	 */
	parseComponent(content) {
		const { component } = this.config;
		const pattern = this.getRegex(
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
			const props = this.parseAttributes(match[1]);
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

	/**
	 * @param {string} text
	 */
	sanitizeText(text) {
		return this.config.security.sanitizeHtml
			? text.replace(/[<>&"']/g, (c) => sanitize[c])
			: text;
	}


	interpolate(template, data) {
		const { interpolation } = this.config;
		const pattern = this.getRegex(
			"interpolation",
			() =>
				new RegExp(
					`${this.escRegex(interpolation.start)}(\\w+)${this.escRegex(interpolation.end)}`,
					"g",
				),
		);
		return template.replace(pattern, (_, key) => {
			const val = data[key];
			if (val == null) return "";
			return interpolation.sanitize
				? this.sanitizeText(String(val))
				: String(val);
		});
	}

	/**
	 * @param {string} tagString
	 */
	parseAttributes(tagString) {
		const props = {};
		const regex = /(\w+)="([^"]*)"/g;
		let match = regex.exec(tagString);
		while (match !== null) {
			props[match[1]] = match[2];
			match = regex.exec(tagString);
		}

		return props;
	}

	/**
	 * @param {string} content
	 */
	transform(content) {
		const { components, html } = this.parseComponent(content);
		const mergedComponents = {
			...this.externalComponents,
			...components,
		};
		const { component } = this.config;
		const componentRegex = this.getRegex(
			"component",
			() => new RegExp(`<${component.tagName}\\s+([^>]+?)(?:\\/?)>`, "g"),
		);
		return html.replace(componentRegex, (_, attrs) => {
			const props = this.parseAttributes(attrs);
			const componentName = props[component.attributeName];
			if (!componentName || !mergedComponents[componentName]) {
				return "";
			}
			const data = {
				...props,
			};
			delete data[component.attributeName];
			try {
				return this.interpolate(mergedComponents[componentName], data);
			} catch {
				return "";
			}
		});
	}

	/**
	 * @param {string} content
	 * @param {HTMLElement} targetElement
	 */
	renderTo(content, targetElement) {
		const processed = this.transform(content);
		if (targetElement) {
			targetElement.innerHTML = processed;
		}
		return processed;
	}
}

/**
 * @param {Config} config
 */
function createProcessor(config = {}) {
	return new Processor(config);
}


async function processDocument(config = {}, yamlUrl = "components.yaml") {
	const processor = createProcessor(config);
	try {
		const external = await loadComponentsFromYaml(yamlUrl);
		processor.setExternalComponents(external);
	} catch {
		console.warn(`Failed to load components from ${yamlUrl}`);
	}
	const content = document.body.innerHTML;
	const processed = processor.transform(content);
	document.body.innerHTML = processed;
}

document.addEventListener("DOMContentLoaded", () => {
	processDocument();
});

export { Processor as process, createProcessor, processDocument };
