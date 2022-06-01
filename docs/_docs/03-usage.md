---
permalink: /docs/usage/
title: "Usage"
toc: true
---

## Configuration

Each instance of Floorplan requires its own configuration.

The configuration can be stored in a separate file (i.e. `home.yaml`) or it can be embedded directly within the configuration of a Lovelace card or HA custom panel.

The following example shows a minimal configuration of Floorplan.

```yaml
  image: /local/floorplan/examples/home/home.svg
  stylesheet: /local/floorplan/examples/home/home.css

  rules:
    - element: button.power
      entity: media_player.tv
      tap_action:
        action: call-service
        service: homeassistant.toggle
```

The following sections describe the complete set of configuration items.

## Image

Floorplan requires an SVG image, which can be configured using the `image` setting.

In the simplest case, `image` can be set to the file location of the image.

```yaml
  image: /local/floorplan/examples/home/home.svg
```

Alternatively, `image` can be set to an object that allows setting the caching option. By setting `cache: true`, Floorplan will use the Web browser's cache, otherwise the image will be refetched every time the Floorplan is loaded.

```yaml
  image:
    location: /local/floorplan/examples/home/home.svg
    cache: true
```

For supporting multiple Floorplan images based on the current screen resolution, `image` can be set to an object that contains a list of image sizes.

In the example below, the first image will be used if the screen width is less than 1024 pixels, and the second image will be used if the screen widths is greater than that.

```yaml
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

```yaml
  image_mobile: /local/floorplan/examples/home/home-mobile.svg
```

Just like the regular `image` setting, `image_mobile` can also be set to an object in order to configure caching, specify multiple image sizes, etc.

## Stylesheet

Floorplan also requires a CSS file, which can be configured using the `stylesheet` setting.

```yaml
  stylesheet: /local/floorplan/examples/home/home.css
```

## Logging

Logging comes in handy when trying to debug any Floorplan issues. Floorplan can display its own logging panel which can be configured using the `log_level` setting.

```yaml
  log_level: info
```

By default, the logging panel is not displayed. Setting `log_level` to any of the following levels causes the logging panel to be displayed below the Floorplan image. The levels are listed in order of least to most verbose.

- `error`
- `warn` (or `warning`)
- `info`
- `debug`

Floorplan also allows logging to the Developer Console in the Web browser. This can be enabled using the `console_log_level` setting, in the same was as the reagular `log_level` setting.

```yaml
  console_log_level: info
```

## Defaults

To avoid unnecessary repetition of actions within the configuration, Floorplan provides a `defaults` setting which can be used.

```yaml
  defaults:
    hover_action: hover-info
    hover_info_filter:
      - min_mireds
      - max_mireds
      - icon
      - order
      - color_mode
    tap_action: more-info
```

This is a powerful feature, as Floorplan 'copies' the default actions to all rules within the configuration.

To disable one of the defaults for a specific rule, the relevant action must be set to `false` within that rule.

```yaml
      - entity: switch.fan
        tap_action: false
```

Use `hover_info_filter` to filter unnecessary atrributes being displayed on hover. Note that this will impact hover-info on all entities.

More information about [rules](#rules) and [actions](#actions) can be found in the sections below.

## Rules

At the heart of Floorplan is the concept of rules. Rules are used to describe how entities should be displayed on the floorplan, along with how user interactions should be handled.

Floorplan rules can be configured using the `rules` setting, which represents a list of rule objects.

Each rule object contains the following parts:

- Subjects - entities / SVG elements to observe for changes, and to use in service calls
- Action triggers (i.e. HA entity state change)
  - Action (i.e. call a service)
  - Service to call (i.e. toggle HA entity state)
  - Service data (i.e. HA entity)

Below is an example of a simple rule.

```yaml
  - element: button.power
    entity: media_player.tv
    tap_action:
      action: call-service
      service: homeassistant.toggle
      service_data:
        entity_id: media_player.tv
```

The above rule can be described as follows:

- Subjects:
  - Observe the SVG `button.power` element for user interactions
  - Observe the HA `media_player.tv` entity for state changes
- Action triggers:
  - When the SVG element (i.e. `button.power`) is tapped / clicked, call the `homeassistant.toggle` service for the HA `media_player.tv` entity

### Rule Simplification

The above rule can be simplified as shown below, since Floorplan uses `call-service` as the default action. Also, Floorplan automatically includes the entity as part of the service data when calling the service.

```yaml
  - element: button.power
    entity: media_player.tv
    tap_action: homeassistant.toggle
```

### Subjects

The following types of items can be used as subjects within a rule.

| Subject    | Description               |
| ---------- | ------------------------- |
| `entity`   | Single HA entity          |
| `entities` | List of HA entities       | 
| `groups`   | List of HA group entities |
| `element`  | Single SVG element        |
| `elements` | List of SVG elements      |

The special case `entity: '*'` represents all HA entities. It can be used in rules that need to run whenever the state of any HA entity changes.

### Action Triggers

Floorplan supports the same action triggers used in [Lovelace](https://www.home-assistant.io/lovelace/actions) (`tap_action`, `hold_action`, `double_tap_action`). In addition to these, Floorplan adds two of its own action triggers.

| Action Trigger       | Triggered When                              |
| -------------------- | ------------------------------------------- |
| `state_action`       | Home Assistant entity state is changed                  |
| `hover_action`       | SVG element is hovered over                 |

### Actions

When an action trigger is executed, Floorplan can perform any of the available [Lovelace actions](https://www.home-assistant.io/lovelace/actions) (`call-service`, `more-info`, `toggle`, `navigate`, etc.). Floorplan expands on the `call-service` action, allowing it to run both Home Assistant and Floorplan services.

#### call-service

Example of a standard rule using `call-service`.

```yaml
  - entity: light.kitchen
    tap_action:
      action: call-service
      service: homeassistant.toggle
      service_data:
        entity_id: light.kitchen
```

Simplified version of the rule, where `entity_id` defaults to `light.kitchen`.

```yaml
  - entity: light.kitchen
    tap_action:
      action: call-service
      service: homeassistant.toggle
```

Even further simplified version of the rule, where `action` defaults to `call-service`.

```yaml
  - entity: light.kitchen
    tap_action: homeassistant.toggle
```

### Services

Floorplan supports calling all [services](https://www.home-assistant.io/docs/scripts/service-calls) exposed by Home Assistant, as well services that are exposed by Flooorplan.

Below are the services that are specific to Floorplan.

| Floorplan Service           | Description                                      | Service Data Properties |
| --------------------------- | ------------------------------------------------ | ----------------------- |
| `floorplan.class_toggle`    | Toggle a CSS class of the SVG element(s)         | `class` (string)        |
| `floorplan.class_set`       | Set the CSS class of the SVG element(s)          | `class` (string)        |
| `floorplan.style_set`       | Set the CSS style of the of the SVG element(s)   | `style` (string)        |
| `floorplan.text_set`        | Set the text of the SVG element(s)               | `text` (string)         |
| `floorplan.image_set`       | Set the image of the SVG element(s)              | `image` (string)<br />`image_refresh_interval` (number)<br />`cache` (boolean) |

Service data can be dynamically constructed using JavaScript code. Below is the full set of objects that are available when writing code.

| Object                   | Description                            |
| ------------------------ | -------------------------------------- |
| `config`                 | Floorplan configuration                |
| `util`                   | [Utility library](#utility-library)    |
| `functions`              | [Custom functions](#custom-functions)  |
| `entity`                 | State object for the HA current entity |
| `entities` (or `states`) | State objects for all HA entities      |
| `hass`                   | Home Assistant [hass](https://home-assistant.io/developers/development_hass_object/) object |
| `element`                | current SVG element                    |
| `elements`               | current SVG elements                   |

Below is an example of using JavaScript [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) to dynamically evaluate the CSS class to use.

```yaml
  - entities:
      - binary_sensor.kitchen
      - binary_sensor.laundry
    state_action:
      action: call-service
      service: floorplan.class_set
      service_data:
        class: '${(entity.state === "on") ? "motion-on" : "motion-off"}'
```

The following example shows how the style is generated using a block of JavaScript code that spans multiple lines.

```yaml
  - entity: sensor.moisture_level
    state_action:
      action: call-service
      service: floorplan.style_set
      service_data:
        element: moisture-level-clip-path
        style: |
          >
          var height = Math.ceil(elements['sensor.moisture_level'].getBBox().height);
          return `transform: translate(0, ${height - Math.floor(entity.attributes.level / (100 / height))}px)`;
```

Service calls can be simplified. More information can be found in the section on [rule simplification](#rule-simplification).

## Advanced Topics

### Custom Functions

Floorplan supports user-defined custom functions, which can be configured using the `functions` setting.

```yaml
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

```yaml
  - entity: sensor.ring_salon_battery
    state_action:
      - service: floorplan.style_set
        service_data: ${functions.someFunctionA(entity)}
```

The [Ring](/ha-floorplan/docs/example-ring) example shows how `functions` can be used.

### Utility Library

Floorplan exposes a library of utility functions, which are available to JavaScript code within rules. The following functions are available. (Note: This list is expected to grow over time).

| Function                 | Description                               | Parameters        | Return Type  |
| ------------------------ | ----------------------------------------- | ----------------- | ------------ |
| `util.color.miredToRGB`  | Convert mired (light temperature) to RGB  | `mired` (number)  | `number[]`   |
| `util.color.kelvinToRGB` | Convert kelvin (light temperature) to RGB | `kelvin` (number) | `number[]`   |
| `util.date.strftime`     | Format datetime (Python style)<br />[NPM package](https://www.npmjs.com/package/strftime) | `format` (string), `date` (Date) | `string`     |
| `util.date.timeago `     | Format datetime as 'time ago' (i.e. 2 hours ago) <br />[NPM package](https://www.npmjs.com/package/timeago.js) | `date` (Date) | `string`     |

The [Light](/ha-floorplan/docs/example-light) example shows how the utility library's `util.color.miredToRGB()` function can be used.

## Troubleshooting

If you're running into any difficulties with Floorplan, below is a list of things you can try.

- First of all, check the indentation of the floorplan config to ensure the YAML is valid.

- The recommended Web browser to use is Google Chrome. Pressing F12 displays the Developer Tools. When you press F5 to reload your floorplan page, the Console pane will show any errors that may have occurred. Also check the Network tab to see if any of the files failed to load.

- If you're not seeing latest changes that you've made, try clearing the Web browser cache. This can also be done in the Chrome Developer Tools. Select the Network tab, right click and select Clear browser cache.

- If you're not able to access the floorplan in your Web browser at all, it could be that you've been locked out of Home Assistant due to too many failed login attempts. Check the file `ip_bans.yaml` in the root Home Assistant config directory and remove your IP address if it's in there.

- If you encounter any issues with your entities not appearing, or not correctly showing state changes, firstly make sure you enable [logging](#logging) in  your floorplan config. It will report any SVG elements that are missing, misspelt, etc.

- If you're adding your own CSS classes for styling your entities, make sure you escape the dot character in the id, by prefixing it with a backlash:

  ```css
  #light\.hallway:hover {
  }
  ```
