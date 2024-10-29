---
permalink: /docs/usage/
title: 'Usage'
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

For supporting multiple Floorplan images based on the current window size, `image` can be set to an object that contains a list of image sizes.

In the example below, the first image will be used if the window width is less than 1024 pixels, and the second image will be used if the window widths is greater than that.

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

From v1.0.45 and onwards, Floorplan will use the [window inner width](https://developer.mozilla.org/en-US/docs/Web/API/Window/innerWidth) in the calculations. If you have specific needs, it's still possible to enforce the usage of [screen width](https://developer.mozilla.org/en-US/docs/Web/API/Screen/width), by setting the `use_screen_width: true` key, on the image property. Please stick to the default option, whenever possible.

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

| Action Trigger | Triggered When                         |
| -------------- | -------------------------------------- |
| `state_action` | Home Assistant entity state is changed |
| `hover_action` | SVG element is hovered over            |

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

| Floorplan Service        | Description                                    | Service Data Properties                                                        |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `floorplan.class_toggle` | Toggle a CSS class of the SVG element(s)       | `class` (string)                                                               |
| `floorplan.class_set`    | Set the CSS class of the SVG element(s)        | `class` (string)                                                               |
| `floorplan.dataset_set`  | Set a data attribute of the SVG element(s)     | `key` (string)<br /> `value` (string)                                          |
| `floorplan.style_set`    | Set the CSS style of the of the SVG element(s) | `style` (string)                                                               |
| `floorplan.text_set`     | Set the text of the SVG element(s)             | `text` (string)<br />`shift_y_axis: 2em`                                                               |
| `floorplan.image_set`    | Set the image of the SVG element(s)            | `image` (string)<br />`image_refresh_interval` (number)<br />`cache` (boolean) |
| `floorplan.execute`      | Execute your own JS, defined in service_data   | `<all>` (array)                                                                |

Service data can be dynamically constructed using JavaScript code. Below is the full set of objects that are available when writing code.

| Object                   | Description                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `config`                 | Floorplan configuration                                                                     |
| `util`                   | [Utility library](#utility-library)                                                         |
| `functions`              | [Custom functions](#custom-functions)                                                       |
| `entity`                 | State object for the HA current entity                                                      |
| `entities` (or `states`) | State objects for all HA entities                                                           |
| `hass`                   | Home Assistant [hass](https://home-assistant.io/developers/development_hass_object/) object |
| `element`                | current SVG element                                                                         |
| `elements`               | current SVG elements                                                                        |
| `action`                 | Make action-executions to ha-floorplan |

#### Using `class_set` to define a entity-state related class

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

#### Using `text_set` to render mulitple tspans on linebreakes

If text_set spots a newline-character (`\n`), the text will be broken into multiple tspans. Find the related example [here](https://experiencelovelace.github.io/ha-floorplan/docs/example-multi-floor/). By providing `shift_y_axis: 2em` as a key, you'll be able to control the offset of each tspan. If a x or/an y offset are defined on the tspan, but not on the text-element, we'll secure that the offset of the tspan, will be used on the text-element.

```yaml
- entities:
    - binary_sensor.kitchen
    - binary_sensor.laundry
  state_action:
    action: call-service
    service: floorplan.text_set
    service_data:
      element: sample.multilinegroup_text
      shift_y_axis: 1.5em
      text: |
        > /* Note that this is a JavaScript block, where you normally can do cool stuff like console.log()*/
        return 'Multiline\nTSPAN-Print';
```

`shift_y_axis: 2em`

#### Using `hover_action` to set a class while mouse hovering a element

By moving your cursor over a element, you can also trigger over hover action. With the hover_action, it's easy to toggle a `hover` class on a given elemen if needed. Here our element will get a `hover-over` class added, if the mouse hovers over the element related to the entity.

```yaml
- entities:
    - binary_sensor.garage
  hover_action:
    - service: floorplan.class_set
      service_data: '${element.matches(":hover") ? "hover-over" : ""}'
```

#### Using `dataset_set` to add data-keys to the DOM-element

Following is an example of using dataset and JavaScript [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) to dynamically evaluate data attribute to use.

```yaml
  - entities:
      - binary_sensor.kitchen
      - binary_sensor.laundry
    state_action:
      action: call-service
      service: floorplan.dataset_set
      service_data:
        key: motion
        value: ${entity.state}
      #or alternatively
      service_data: 'motion:${entity.state}'
```

#### Using `style_set` with a block of JavaScript code

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

#### Using `execute` with browser_mod

The following example shows how to use the `execute` service, where we also use the 3rd-party solution called [browser_mod](https://github.com/thomasloven/hass-browser_mod) (Can be found in [HACS](https://hacs.xyz/)).

```yaml
hold_action:
  - service: floorplan.execute
    service_data:
      my_custom_exec_calling_browser_mod: |
        > 
        try{
          // Remember that ha-floorplan exposes a lot of useful properties
          console.log(
            "this",this, "\nentitiy",entity, "\nelements", elements, "\nentities", entities,
            "\nconfig",config, "\nutil", util, "\nelement", element, "\nstates", states);

          // Call browser_mod service
          browser_mod.service('popup',{title: "My custom function with browser-mod call",
          content: 
            {
              // Create vertical stack card
              type: "vertical-stack",
              cards: [
                {
                  // Entities card
                  type: "entities",
                  entities: [
                    // Define each entity
                    { entity: "sensor.time", name: "Time" },
                    { entity: "sun.sun", name: "Sun" }
                  ]
                }
              ]
            }
          })
        }catch(e){
          console.log("Well.. That didn't go as planned",e);
        }
```

Service calls can be simplified. More information can be found in the section on [rule simplification](#rule-simplification).

#### Using `execute` with `action`

As of v1.0.45 we're exposing the function called `action`, which allow you to execute a limitless amount of actions, inside other executes JavaScript.

Let's say you'd like to run a specific action, but on basis of some other entity-states, or similar.

The solution are primary made to be used in the `execute` service, however, it's possible to use `action` on all other action calls, too.

Please note that each `execute` request are fired through events, so you don't have to wait for the execution to be done. 

The following shows how I'm sending a "navigate" request, but also requests ha-floorplan to send another action, where I'm pausing the current playback on a media_player. 

```yaml
element: rooms-restroom
entities:
  - media_player.sonos_restroom
tap_action:
  action: navigate
  navigation_path: |
    > // Simple example where navigate_path are set with code
    const target = "/default-overview/alarm#" + element.id;
    // With "action" I'm able to make another action, too
    const action-data = {
      action: 'call-service',
      service: 'media_player.media_play_pause',
      service_data: {
        entity_id: 'media_player.sonos_stue'
      }
    };
    action(action_data);
    return target;
```

Below you'll find another example where a random action are executed, triggered by a `tap_action`.

```yaml
tap_action:
  service: floorplan.execute
  service_data:
    execute_fnc_num_1_test: |
      > 
      try{
        // Remember that ha-floorplan exposes a lot of useful properties!
        console.log(
          "this",this, "\nentitiy",entity, "\nelements", elements, "\nentities", entities,
          "\nconfig",config, "\nutil", util, "\nelement", element, "\nstates", states, "\naction", action);

        const actions = {
          act1: {
            action: 'call-service',
            service: 'media_player.media_play_pause',
            service_data: {
              entity_id: 'media_player.sonos_badevaerelse'
            }
          },
          act2: {
            service: 'light.toggle',
            service_data: {
              entity_id: 'light.sonoff1'
            }
          },
          act3: {
            action: 'call-service',
            service: 'floorplan.style_set',
            service_data: {
              element: element,
              style: 'opacity: 0.4'
            }
          },
          act4: {
            action: 'call-service',
            service: 'homeassistant.toggle',
            service_data: {
              entity_id: 'light.sonoff1'
            }
          },
          act5: {
            action: 'navigate',
            navigation_path: '/default-overview/alarm'
          },
          act6: {
            service: 'floorplan.image_set',
            service_data: {
              image: "https://<PATH_TO_SVG>",
            }
          }
        };

        // Set a random action on basis of number of actions
        const random_action = actions[`act${Math.floor(Math.random() * Object.keys(actions).length) + 1}`]
        console.log("Running random action:", random_action);
        action(random_action);
      }catch(e){
        console.log("Well.. That didn't go as planned",e);
      }
```

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

| Function                 | Description                                                                                                    | Parameters                       | Return Type |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------- |
| `util.color.miredToRGB`  | Convert mired (light temperature) to RGB                                                                       | `mired` (number)                 | `number[]`  |
| `util.color.kelvinToRGB` | Convert kelvin (light temperature) to RGB                                                                      | `kelvin` (number)                | `number[]`  |
| `util.date.strftime`     | Format datetime (Python style)<br />[NPM package](https://www.npmjs.com/package/strftime)                      | `format` (string), `date` (Date) | `string`    |
| `util.date.timeago `     | Format datetime as 'time ago' (i.e. 2 hours ago) <br />[NPM package](https://www.npmjs.com/package/timeago.js) | `date` (Date)                    | `string`    |

The [Light](/ha-floorplan/docs/example-light) example shows how the utility library's `util.color.miredToRGB()` function can be used.

## Troubleshooting

If you're running into any difficulties with Floorplan, below is a list of things you can try.

- First of all, check the indentation of the floorplan config to ensure the YAML is valid.

- The recommended Web browser to use is Google Chrome. Pressing F12 displays the Developer Tools. When you press F5 to reload your floorplan page, the Console pane will show any errors that may have occurred. Also check the Network tab to see if any of the files failed to load.

- If you're not seeing latest changes that you've made, try clearing the Web browser cache. This can also be done in the Chrome Developer Tools. Select the Network tab, right click and select Clear browser cache.

- If you're not able to access the floorplan in your Web browser at all, it could be that you've been locked out of Home Assistant due to too many failed login attempts. Check the file `ip_bans.yaml` in the root Home Assistant config directory and remove your IP address if it's in there.

- If you encounter any issues with your entities not appearing, or not correctly showing state changes, firstly make sure you enable [logging](#logging) in your floorplan config. It will report any SVG elements that are missing, misspelt, etc.

- If you're adding your own CSS classes for styling your entities, make sure you escape the dot character in the id, by prefixing it with a backlash:

  ```css
  #light\.hallway:hover {
  }
  ```
