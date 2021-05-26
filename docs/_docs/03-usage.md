---
permalink: /docs/usage/
title: "Usage"
toc: true
---

# Configuration

Each instance of Floorplan requires its own configuration. The following sections describe the various parts of the configuration.

## Image

Floorplan requires an SVG image, which can be configured using the `image` setting.

In the simplest case, `image` can be set to the file location of the image.

```
  image: /local/floorplan/examples/home/home.svg
```

Alternatively, `image` can be set to an object that allows setting the caching option. By setting `cache: true`, Floorplan will use the Web browser's cache, otherwise the image will be refetched every time the Floorplan is loaded.

```
  image:
    location: /local/floorplan/examples/home/home.svg
    cache: true
```

For supporting multiple Floorplan images based on the current screen resolution, `image` can be set to an object that contains a list of image sizes.

In the example below, the first image will be used if the screen width is less than 1024 pixels, and the second image will be used if the screen widths is greater than that.

```
  image:
    sizes:
      - min_width: 0
        location: /local/floorplan/examples/home/home.svg
        cache: true  
      - min_width: 1024
        location: /local/floorplan/examples/home/home-wide.svg
        cache: true  
```

Floorplan can display an alternate image for mobile devices. This can be configured using the `image_mobile` setting.

```
  image_mobile: /local/floorplan/examples/home/home-mobile.svg
```

Just like the regular `image` setting, `image_mobile` can also be set to an object in order to configure caching, specify multiple image sizes, etc.

## Stylesheet

Floorplan also requires a CSS file, which  be configured using the `stylesheet` setting.

```
  stylesheet: /local/floorplan/examples/home/home.css
```

## Logging

Floorplan can display its own logging panel which can be configured using the `log_level` setting.

```
  log_level: info
```

By default, the logging panel is not displayed. Setting `log_level` to any of the following levels causes the logging panel to be displayed below the Floorplan image.

- `error`
- `warn / warning`
- `info`
- `debug`

Floorplan also allows logging to the Developer Console in the Web browser. This can be enabled using the `console_log_level` setting.

```
  console_log_level: info
```

Logging comes in handy when trying to debug any Floorplan issues.

## Defaults

To avoid unnecessary repetition of actions within the configuration, Floorplan provides a `defaults` setting which can be used.

```
  defaults:
    hover_action: hover-info
    tap_action: more-info
```

This is a powerful feature, as Floorplan 'copies' the default actions to all rules within the configuration.

To learn more about rules and actions, refer to the next section.

# Rules

Floorplan 

## Target Entities / Elements

```
  entity
  entities
  groups
  element
  elements
```

## Actions

```
  state_action
  tap_action
  hold_action
  double_tap_action
  hover_action
```

## Services

```
  service
  service_data
```

### Floorplan Services

| Service                   | Description         |
| ------------------------- | ------------------- |
| floorplan.class_toggle    | xxxxxxxxxxxxxxxxxxx |
| floorplan.class_set       | xxxxxxxxxxxxxxxxxxx | 
| floorplan.style_set       | xxxxxxxxxxxxxxxxxxx |
| floorplan.text_set        | xxxxxxxxxxxxxxxxxxx |
| floorplan.image_set       | xxxxxxxxxxxxxxxxxxx |
| floorplan.page_navigate   | xxxxxxxxxxxxxxxxxxx |
| floorplan.window_navigate | xxxxxxxxxxxxxxxxxxx |
| floorplan.variable_set    | xxxxxxxxxxxxxxxxxxx |

### Expressions

| Property                  | Description         |
| ----------- | ------------------- |
| expression  | xxxxxxxxxxxxxxxxxxx |
| hass        | xxxxxxxxxxxxxxxxxxx | 
| config      | xxxxxxxxxxxxxxxxxxx |
| entityId    | xxxxxxxxxxxxxxxxxxx |
| svgElement  | xxxxxxxxxxxxxxxxxxx |
| svgElements | xxxxxxxxxxxxxxxxxxx |
| functions   | xxxxxxxxxxxxxxxxxxx |

# Advanced Topics

## Custom Functions

```
  functions: |
    >
    return {

      getPercentageFill: (entity) => {
        var max = [195, 232, 141];
        var min = [240, 113, 120];
        var r = Math.floor(min[0] + ((max[0] - min[0]) * (entity.state / 100)));
        var g = Math.floor(min[1] + ((max[1] - min[1]) * (entity.state / 100)));
        var b = Math.floor(min[2] + ((max[2] - min[2]) * (entity.state / 100)));
        return `fill: rgb(${r}, ${g}, ${b})`; 
      },

      someOtherFunctionA: (entity, entities, hass) => {
        return 'foo'; 
      },

      someOtherFunctionB: (entity, entities, hass) => {
        return 'bar'; 
      },
      
    };
```

## Expressions

## Utility Functions
