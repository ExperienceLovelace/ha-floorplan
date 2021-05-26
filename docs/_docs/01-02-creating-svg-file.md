---
permalink: /docs/create-svg-file/
title: "Creating Your First SVG File"
toc: true
---

[Inkscape](https://inkscape.org/en/develop/about-svg/) is a free application that lets you create vector images. You can make your floorplan as simple or as detailed as you want. It is recommended that you create an SVG element (i.e. `rect`, `path`, `text`, etc.) for each HA entity ( i.e. binary sensor, switch, camera, etc.) you want to display on your floorplan. Each of these elements should have its `id` set to the corresponding entity name in Home Assistant.

For example, below is what the SVG element looks like for a Front Hallway binary sensor. The `id` of the shape is set to the entity name `binary_sensor.front_hallway`. This allows the shape to automatically get hooked up to the right entity when the floorplan is displayed.

```html
<path id="binary_sensor.front_hallway" d="M650 396 c0 -30 4 -34 31 -40 17 -3 107 -6 200 -6 l169 0 0 40 0 40
-200 0 -200 0 0 -34z"/>
```

If you need a good source of SVG icons / images, the following resources are a good starting point.

- [Free SVG](https://freesvg.org)
- [Online Web Fonts](https://www.onlinewebfonts.com/icon)
- [Material Design Icons](https://materialdesignicons.com)
- [Noun Project](https://thenounproject.com)
- [Flat Icon](http://flaticon.com)
