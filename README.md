# HTMLium

![license](https://img.shields.io/badge/License-MIT-yellow.svg)
![stars](https://img.shields.io/github/stars/gustambolopez/htmlium?style=social)
![forks](https://img.shields.io/github/forks/gustambolopez/htmlium?style=social)
![cdn](https://img.shields.io/badge/CDN-jsdelivr-blue)
[![badge](https://data.jsdelivr.com/v1/package/gh/gustambolopez/htmlium/badge)](https://www.jsdelivr.com/package/gh/gustambolopez/htmlium)

**Htmlium** is a lightweight, fast html superset, fully configurable that makes your html **dynamic without any build tools**. You can create reusable components using yaml and interpolate data easily. Perfect if you just want plain html but with powerful features and reactivity with NO breaking changes.

---

Demo:
<https://gustambolopez.github.io/htmlium/>
---
## Inspiration
HTMLium its like a mix of handlebars+ alpine.js + web components + simpler designed to be a relief, not cause a pain because of you having to rewrite all your stuff

## Features

* **No build step** – just include a script.
* **Components from yaml** – define once, use anywhere.
* **Safe html** – automatic sanitization to avoid xss attacks.
* **Easy interpolation** – use `{{variable}}` in components.
* **Conditionals and loops** – `{{#if ...}}...{{/if}}`, `{{#each ...}}...{{/each}}`.
* **Fast and lightweight** – small footprint, simple to use.
* **Configurable** – override default tags, interpolation symbols, or security options.

---

## Installation (we avoid breaking changes at all cost to maintain good stability)

Add Htmlium to your page:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/gustambolopez/htmlium@lastest/index.min.js"></script>
````

---

## Creating Components (Example)

1. Create a `components.yaml` file:

```yaml
Header: "<header><h1>the title is: {{title}}</h1></header>"
Footer: "<footer> its {{year}}</footer>"
```

2. Components can include **variables** that you’ll fill in later using html attributes.

### Load a component anywhere on the page

```html
<htmlium loadcomponent="Header" title="my site using htmlium" />
<htmlium loadcomponent="Footer" year="2025" />
```

Htmlium automatically replaces these tags with the correct component content.

---

## Interpolation

* Use `{{variable}}` in components.
* Pass values through html attributes like `title="..."` or `year="..."`.
* Sanitization is enabled by default can be disabled in config.

---

## Conditionals

Use conditional blocks inside components:

```yaml
Message: |
  {{#if loggedIn}}
    <p>welcome back {{user}}</p>
  {{#else}}
    <p>log in gng</p>
  {{/if}}
```

---

## Loops

Use loops to render arrays:

```yaml
List: |
  <ul>
    {{#each items}}
      <li>{{this}}</li>
    {{/each}}
  </ul>
```

```html
<htmlium loadcomponent="List" items='["one","two","three"]' />
```

---

## Example

```yaml
Button: "<button>{{text}}</button>"
```

```html
<htmlium loadcomponent="Button" text="gurt: yo" />
```

Renders as:

```html
<button>gurt: yo</button>
```

---

## Config

The library includes a default `Config` object you can override if needed

```js
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
```

---

## Tips

* Keep your components simple for faster rendering.
* Combine multiple components for bigger layouts.
* Htmlium is **frontend only**, no build step.

---

## Contributors

<a href="https://github.com/gustambolopez/htmlium/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=gustambolopez/htmlium" />
</a>

## License

SPDX-License-Identifier: MIT
Copyright (c) 2025 s16.org
License: [https://opensource.org/license/mit/](https://opensource.org/license/mit/)
