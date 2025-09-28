
# Htmlium

![license](https://img.shields.io/badge/License-MIT-yellow.svg)
![stars](https://img.shields.io/github/stars/gustambolopez/htmlium?style=social)
![forks](https://img.shields.io/github/forks/gustambolopez/htmlium?style=social)
![cdn](https://img.shields.io/badge/CDN-jsdelivr-blue)


**Htmlium** is a lightweight, fast html superset, fully configurable that makes your html **dynamic without any build tools**. You can create reusable components using yaml and interpolate data easily. Perfect if you just want plain html but with powerful features.

---

## Features

* **No build step** – just include a script.
* **Components from yaml** – define once, use anywhere.
* **Safe html** – automatic sanitization to avoid xss attacks.
* **Easy interpolation** – use `{{variable}}` in components.
* **Fast and lightweight** – small footprint, simple to use.

---

## Installation

Add Htmlium to your page:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/gustambolopez/htmlium@main/index.min.js"></script>
```

---

## Creating Components (Example)

1. Create a `components.yaml` file:

```yaml
Header: "<header><h1>the title is: {{title}}</h1></header>"
Footer: "<footer> its {{year}}</footer>"
```

2. Components can include **variables** that you’ll fill in later using html attributes.

---

## Using components in html (going to be deprecated soon since it breaks the whole purpose of components)

1. Define a component (optional, for inline HTML fallback):

```html
<htmlium-set component="Header">
  <header><h1>the tile is {{title}} </h1></header>
</htmlium-set>
```

2. Load a component anywhere on the page:

```html
<htmlium loadcomponent="Header" title="my site using htmlium" />
<htmlium loadcomponent="Footer" year="2025" />
```

Htmlium automatically replaces these tags with the correct component content.

---

## Interpolation

* Use `{{variable}}` in components.
* Pass values through html attributes like `title="..."` or `year="..."`.
* Sanitization is enabled by default to prevent unsafe html.

---

## Example

```yaml
Button: "<button>{{text}}</button>"
```

```html
<htmlium loadcomponent="Button" text="click me" />
```

Renders as:

```html
<button>click me</button>
```

---

## Tips

* Keep your components simple for faster rendering.
* Combine multiple components for bigger layouts.
* Htmlium is **frontend only** – no build step.
