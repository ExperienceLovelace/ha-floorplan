---
permalink: /docs/usage/
title: "Usage"
toc: true
---

Each instance of Floorplan requires its own configuration.

The following example shows the minimum configuration required for Floorplan to work.

```
  image: /local/floorplan/examples/home/home.svg
  stylesheet: /local/floorplan/examples/home/home.css
  rules:
```

The following sections describe the complete set of configuration items.

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

Floorplan also requires a CSS file, which can be configured using the `stylesheet` setting.

```
  stylesheet: /local/floorplan/examples/home/home.css
```

## Logging

Logging comes in handy when trying to debug any Floorplan issues. Floorplan can display its own logging panel which can be configured using the `log_level` setting.

```
  log_level: info
```

By default, the logging panel is not displayed. Setting `log_level` to any of the following levels causes the logging panel to be displayed below the Floorplan image.

- `error`
- `warn / warning`
- `info`
- `debug`

Floorplan also allows logging to the Developer Console in the Web browser. This can be enabled using the `console_log_level` setting, in the same was as the reagular `log_level` setting.

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

At the heart of Floorplan is the concept of rules. Rules are used to describe how entities should be displayed on the floorplan, along with how user interactions should be handled.

Floorplan rules can be configured using the `rules` setting, which represents a list of rule objects.

Each rule object contains the following parts:

- Subjects - entities / SVG elements to observe for changes, and to use in service calls
- Actions
  - Event - event to handle (i.e. HA entity state change)
  - Service - service to call (i.e. toggle HA entity state)

Below is a example of a simple rule.

```
  - element: button.power
    entity: media_player.tv
    tap_action:
      action: call-service
      service: homeassistant.toggle
```

The above rule can be described as follows:

1) Observe the SVG `button.power` element for user interactions.
1) Observe the HA `media_player.tv` entity for state changes.
1) When the SVG element (i.e. `button.power`) is tapped (or clicked), call the `homeassistant.toggle` service for the HA `media_player.tv` entity.

## Subjects

| Item     | Description         |
| -------- | ------------------- |
| entity   | xxxxxxxxxxxxxxxxxxx |
| entities | xxxxxxxxxxxxxxxxxxx | 
| groups   | xxxxxxxxxxxxxxxxxxx |
| element  | xxxxxxxxxxxxxxxxxxx |
| elements | xxxxxxxxxxxxxxxxxxx |

## Actions

| Item              | Description         |
| ----------------- | ------------------- |
| state_action      | xxxxxxxxxxxxxxxxxxx |
| tap_action        | xxxxxxxxxxxxxxxxxxx | 
| hold_action       | xxxxxxxxxxxxxxxxxxx |
| double_tap_actio  | xxxxxxxxxxxxxxxxxxx |
| hover_action      | xxxxxxxxxxxxxxxxxxx |

## Services

```
  service
  service_data
```

| Floorplan Service         | Description         |
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

| Property    | Description         |
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

      someFunctionA: (entity, entities, hass) => {
        return 'foo'; 
      },

      someOtherFunctionB: (entity, entities, hass) => {
        return 'bar'; 
      },
      
    };
```

## Expressions

## Utility Functions
