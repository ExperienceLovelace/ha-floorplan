---
permalink: /examples/
title: "Examples"
toc: true
---

## Light

{% include floorplan_example_light %}

{% highlight ruby %}

image: /local/floorplan/examples/light/light.svg

defaults:
  on_hover: floorplan.hover_info
  on_click: homeassistant.more_info

rules:
  - entity: light.office
    on_click:
      service: floorplan.window_navigate
      data: /lovelace/music
    on_state:
      service: floorplan.style_set
      data: 'fill: rgb(${entity.attributes.rgb_color[0]},
                        ${entity.attributes.rgb_color[1]},
                        ${entity.attributes.rgb_color[2]}
                      );'

{% endhighlight %}

## Ring

{% include floorplan_example_ring %}

{% highlight ruby %}

image: /local/floorplan/examples/ring/ring.svg
stylesheet: /local/floorplan/examples/ring/ring.css

defaults:
  on_hover: floorplan.hover_info
  on_click: homeassistant.more_info

rules:
  - entity: sensor.ring_salon_battery
    on_state:
      service: floorplan.text_set
      data: '${entity.state ? entity.state + "%" : "unknown"}'

  - entities:
      - binary_sensor.ring_salon_motion
    on_state:
      service: floorplan.class_set
      data:
        class: '${(entity.state === "on") ? "ring-motion" : ""}'

  - entity: binary_sensor.ring_salon_ding
    on_state:
      service: floorplan.class_set
      data:
        class: '>
          if (entity.state === "on") {
            return "ring-ding";
          }
          else {
            return "";
          }
          '

{% endhighlight %}

## Home

{% include floorplan_example_home %}

{% highlight ruby %}

show_side_bar: false;
show_app_header: false;
config:
  image: /local/floorplan/examples/simple/simple.svg
  stylesheet: /local/floorplan/examples/simple/simple.css
  log_level: info
  console_log_level: info

  defaults:
    on_hover: floorplan.hover_info
    on_click: homeassistant.more_info

  rules:
    - entity: light.garage
      element: light.garage
      on_state:
        service: floorplan.image_set
        data: /local/floorplan/examples/simple/light_${entity.state}.svg
      on_click: homeassistant.toggle

    - entity: light.garage
      element: light.garage.background
      on_state:
        service: floorplan.class_set
        data: 'background-${entity.state}'
      on_click:
        service: homeassistant.toggle
        
    - entity: light.garage
      element: light.garage.text
      on_click:
        service: homeassistant.toggle

    - entity: switch.living_area_fan
      on_click: false
      on_state:
        service: floorplan.class_set
        data:
          class: '${(entity.state === "on") ? "spinning" : ""}'

    - entity: switch.living_area_fan
      element: switch.living_area_fan.background
      on_state:
        service: floorplan.class_set
        data: background-${entity.state}
      on_click: false
      on_long_click:
        service: homeassistant.toggle
        data:
          entity_id: switch.living_area_fan

    - entity: switch.living_area_fan
      element: switch.living_area_fan.text
      text: '${entity.state}'
      on_click:
        service: homeassistant.toggle

    - entity: camera.zagreb_ban_jelacic_square
      on_state:
        service: floorplan.image_set
        data:
          image: '${entity.attributes.entity_picture}'
          image_refresh_interval: 10

    - entities:
        - binary_sensor.main_bedroom
        - binary_sensor.living_area
        - binary_sensor.garage
      on_hover: false
      on_state:
        service: floorplan.style_set
        data:
          style: '
            fill: ${ entity.state === "on" ? "#F9D27C" : "#7CB1F9" };
            transition: ${ entity.state === "off" ? "fill 5s ease" : "" };
          '

{% endhighlight %}
