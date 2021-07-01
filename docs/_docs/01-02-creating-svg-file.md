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

- [SVG Repo](https://www.svgrepo.com)
- [Free SVG](https://freesvg.org)
- [Online Web Fonts](https://www.onlinewebfonts.com/icon)
- [Material Design Icons](https://materialdesignicons.com)
- [Noun Project](https://thenounproject.com)
- [Flat Icon](http://flaticon.com)

## Animations not in the right position?

If you're using animations in your floorplans, and your SVG elements are not appearing in the right position or are spinning off the page, it's most likely because your SVG element already has a [transform](https://www.w3schools.com/cssref/css3_pr_transform.asp) applied to it. Best way to resolve this is to view the SVG file in a text editor, and locate your SVG element. If the SVG element contains a `transform` attribute, it means that any `transform` you apply in Floorplan will likely conflict with this existing `transform`. Below is an example of an SVG element with a `transform` already applied.

```xml
  <g
     id="switch.kitchen_fan"
     transform="translate(-243.57143,81.428571)">
```

The best way to resolve this is to create a `<g>` element to act as a container for your SVG element, and move the original `transform` attribute to the `<g>` element.

Below is an example of a `<g>` element that contains the original SVG element. As you can see, the `<g>` element contains the original `transform`, which frees up the SVG element to use any `transform` applied in Floorplan.

```xml
  <g
     id="switch.kitchen_fan_group"
     transform="translate(-243.57143,81.428571)">
    <g
       id="switch.kitchen_fan">
```
