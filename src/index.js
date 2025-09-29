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

// the customizable part ig
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
// TODO... add better sanitization, add auto updating with no memory leaks
const sanitize = {
	"<": "&lt;",
	">": "&gt;",
	"&": "&amp;",
	'"': "&quot;",
	"'": "&#39;",
};

import jsyaml from "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs";

async function loadcomponents(url = "components.yaml") {
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
		this.regexpcache = new Map();
		this.extcomps = {};
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
	escaperegexp(str) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	regxep(key, factory) {
		if (!this.regexpcache.has(key)) {
			this.regexpcache.set(key, factory());
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

	/**
	 * @param {string} text
	 */
	sanitizer(text) {
		return this.config.security.sanitizeHtml
			? text.replace(/[<>&"']/g, (c) => sanitize[c])
			: text;
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
			return interpolation.sanitize ? this.sanitizer(String(val)) : String(val);
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
		const { components, html } = this.parsecomps(content);
		const mergedComponents = {
			...this.extcomps,
			...components,
		};
		const { component } = this.config;
		const componentRegex = this.regxep(
			"component",
			() => new RegExp(`<${component.tagName}\\s+([^>]+?)(?:\\/?)>`, "g"),
		);
		return html.replace(componentRegex, (_, attrs) => {
			const props = this.attributes(attrs);
			const componentName = props[component.attributeName];
			if (!componentName || !mergedComponents[componentName]) {
				return "";
			}
			const data = {
				...props,
			};
			delete data[component.attributeName];
			try {
				let result = mergedComponents[componentName];
				result = this.conditionalsp(result, data);
				result = this.ploops(result, data);
				return this.interpolate(result, data);
			} catch {
				return "";
			}
		});
	}

	/**
	 * @param {string} content
	 * @param {HTMLElement} targetElement
	 */
	renderon(content, targetElement) {
		const processed = this.transform(content);
		if (targetElement) {
			targetElement.innerHTML = processed;
		}
		return processed;
	}
}

function processorcreationig(config = {}) {
	return new Processor(config);
}

async function processDocument(
	config = {},
	componentslocation = "components.yaml",
) {
	const processor = processorcreationig(config);
	try {
		const external = await loadcomponents(componentslocation);
		processor.externalcomponents(external);
	} catch {
		console.warn(`Failed to load components from ${componentslocation}`);
	}
	const content = document.body.innerHTML;
	const processed = processor.transform(content);
	document.body.innerHTML = processed;
}

document.addEventListener("DOMContentLoaded", () => {
	processDocument();
});

export {
	Processor as process,
	processorcreationig as createProcessor,
	processDocument,
};
