---
permalink: /docs/how-to-handle-size-and-expand-floorplan/
title: "How to handle size and expand floorplan"
toc: true
---

[ha-floorplan](https://github.com/ExperienceLovelace/ha-floorplan) comes with a build-in way to handle the render size of your floorplan. It's defined as the `full_height`-option, to prevent vertical scollbars. By combining the `full_height`-option with Home Assistant's [panel mode](https://www.home-assistant.io/lovelace/dashboards-and-views/#panel) for views, you're all set.

The `full_height` option should be added in the same level as the `config:` and `type:` definitions (in the root).

## Panel mode with `full_height` in YAML-mode

Here's example where both _panel mode_ and our `full_height` option are used. It's a good idea to wrap your floorplan-card in a vertical and horizontal stack, which allow you to have the proper control of the size.

```yaml
  - title: Floorplan
    icon: 'mdi:floor-plan'
    panel: true
    cards:
      - type: vertical-stack
        cards:
          - type: horizontal-stack  
            cards:
              - config: !include lovelace/floorplan/_config-floorplan1.yaml
                type: 'custom:floorplan-card'
                full_height: true
```

## Panel mode in GUI-mode

Most people joining Home Assistant today, will start using lovelace-cards right away - and most of them, won't go _back_ to YAML-mode. If you're still in the normal edit-mode, you can change the [panel mode](https://www.home-assistant.io/lovelace/dashboards-and-views/#panel) through the GUI.

1. Click the 3 vertical dots to the right of the screen
2. Click ‘Edit Dashboard’
2. Select your page
3. Click the pencil to the right of the page title
4. Select ‘Panel Mode’

After that's done, try and see if everything are working as expected. Else, please add `full_height: true` to your YAML-code, and see if that makes any different.

## Other methods

We'll always recommend you to stick to the default way of handling the floorplan-size, but if you really want to play around, here's a few words about that...

Where's always more than a single way, right? If you're well-known in CSS, you chould try and play around with the size by yourself.

In CSS you'd likely take a look at the options like:
- min-width
- max-width
- min-height
- max-height
- height
- width

Options like `100%` and `100vh` will be good to know, and maybe even the `calc( 100vh - 100px)`-operator, if you haven't tried that before.
