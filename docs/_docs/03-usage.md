---
permalink: /docs/usage/
title: "Usage"
toc: true
---

# Contents

- [Image](#image)
- [Stylesheet](#stylesheet)
- [Logging](#logging)
- [Defaults](#defaults)
- [Rules](#rules)
  - [Subjects](#subjects)
  - [Actions](#actions)
  - [Services](#services)
  - [Service Data](#service-data)
- [Advanced Topics](#advanced-topics)
  - [Custom Functions](#custom-functions)
  - [Utility Library](#utility-library)

Each instance of Floorplan requires its own configuration.

The configuration can be stored in a separate file (i.e. `home.yaml`) or it can be embedded directly within the configuration of a Lovelace card or HA custom panel.

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

By default, the logging panel is not displayed. Setting `log_level` to any of the following levels causes the logging panel to be displayed below the Floorplan image. The levels are listed in order of least verbose to most verbose.

- `error`
- `warn` (or `warning`)
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

To disable one of the defaults for a specific rule, the relevant action must be set to `false` within that rule.

```
      - entity: switch.fan
        tap_action: false
```

To learn more about [rules](#rules) and [actions](#actions), refer to the sections below.

# Rules

At the heart of Floorplan is the concept of rules. Rules are used to describe how entities should be displayed on the floorplan, along with how user interactions should be handled.

Floorplan rules can be configured using the `rules` setting, which represents a list of rule objects.

Each rule object contains the following parts:

- Subjects - entities / SVG elements to observe for changes, and to use in service calls
- Actions
  - Event - event to handle (i.e. HA entity state change)
  - Service - service to call (i.e. toggle HA entity state)
  - Service data - data to include when calling service (i.e. HA entity)

Below is an example of a simple rule.

```
  - element: button.power
    entity: media_player.tv
    tap_action:
      action: call-service
      service: homeassistant.toggle
```

The above rule can be described as follows:

- Subjects:
  - Observe the SVG `button.power` element for user interactions
  - Observe the HA `media_player.tv` entity for state changes
- Actions:
  - When the SVG element (i.e. `button.power`) is tapped / clicked, call the `homeassistant.toggle` service for the HA `media_player.tv` entity

## Subjects

The following types of items can be used as subjects within a rule.

| Subject    | Description               |
| ---------- | ------------------------- |
| `entity`   | HA entity                 |
| `entities` | list of HA entities       | 
| `groups`   | list of HA group entities |
| `element`  | SVG element               |
| `elements` | list of SVG elements      |

## Actions

Floorplan actions follow the same structure as [actions](https://www.home-assistant.io/lovelace/actions) used in Lovelace cards. Below is the list of actions that are supported by Floorplan.

| Action               | Triggered When                              |
| -------------------- | ------------------------------------------- |
| `state_action`       | HA entity state is changed                  |
| `tap_action`         | SVG element is tapped                       | 
| `hold_action`        | SVG element is tapped and held              |
| `double_tap_action`  | SVG element is double tapped                |
| `hover_action`       | SVG element is hovered over                 |

## Services

Floorplan supports calling all [services](https://www.home-assistant.io/docs/scripts/service-calls) exposed by Home Assistant, as well services that are exposed by Flooorplan.

Below are the services that are specific to Floorplan.

| Floorplan Service           | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `floorplan.class_toggle`    | Toggle a CSS class of the SVG element(s)        |
| `floorplan.class_set`       | Set the CSS class of the SVG element(s)          | 
| `floorplan.style_set`       | Set the CSS style of the of the SVG element      |
| `floorplan.text_set`        | Set the text of the SVG element(s)               |
| `floorplan.image_set`       | Set the image of the SVG element(s)              |
| `floorplan.window_navigate` | Navigate to a URL in a new Web browser window    |

### Service Data

When defining service calls, service data can be dynamically constructed using JavaScript code. Below is the full set of objects that are available when writing code.

| Property                 | Description                            |
| ------------------------ | -------------------------------------- |
| `config`                 | Floorplan configuration                |
| `util`                   | [Utility library](#utility-library)    |
| `functions`              | [Custom functions](#custom-functions)  |
| `entity`                 | State object for the HA current entity |
| `entities` (or `states`) | State objects for all HA entities      |
| `hass`                   | Home Assistant [hass](https://home-assistant.io/developers/development_hass_object/) object |
| `element`                | current SVG element                    |
| `elements`               | current SVG elements                   |

# Advanced Topics

## Custom Functions

Floorplan supports user-defined custom functions, which can be configured using the `functions` setting.

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

These custom functions can be used within any of the rules within the configuration, and must be called using the `functions.` prefix. Below is an example of calling a custom function.

```
  - entity: sensor.ring_salon_battery
    state_action:
      - service: floorplan.style_set
        service_data: ${functions.someFunctionA(entity)}
```

## Utility Library

Floorplan exposes a library of  utility functions, which are available to JavaScript code within rules. The following functions are available. (Note: This list is expected to grow over time).

| Function                     | Parameters                       | Return Type  | References     |
| ---------------------------- | -------------------------------- | ------------ | -------------- |
| `util.ColorUtil.miredToRGB`  | `mired` (number)                 | `number[]`   |                |
| `util.ColorUtil.kelvinToRGB` | `kelvin` (number)                | `number[]`   |                |
| `util.DateUtil.strftime`     | `format` (string), `date` (Date) | `string`     | [NPM package](https://www.npmjs.com/package/strftime) |
