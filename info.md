{% if prerelease %}
<p style="color:darkorange;font-weight:bold;font-size:1.3em;text-align:center;width:100%;display:block;">ATTENTION: This is a pre-version of HA Floorplan!</p>
{% endif %}

<img style="max-width: 200px;width: 100%;text-align:center;display:block;margin:0 auto;background: transparent;" src="https://github.com/ExperienceLovelace/ha-floorplan/blob/master/docs/assets/images/logo-200x200.png?raw=true" alt="HA Floorplan Logo">

# HA Floorplan

**Floorplan for Home Assistant - your imagination (almost) defines the limits**

<br>

<hr>

<br>

### 📚 Read the <a href="https://experiencelovelace.github.io/ha-floorplan/" target="_blank">documentation</a> 📚

You'll find information about:
- Installation
- Usage
- Examples
- _And more..._


### Features

- Make Floorplan(s) with SVG-files
- Trigger states, visualize states and more
- Call services and more, for even more options
- Use as Lovelace-card, or as a panel
- _It's hard to mention everything in a list like this, so **give it a try**_ 🥳

<img style="border: 1px solid #26c7fb;border-radius: 3px;max-width: 350px;width: 100%;box-sizing: border-box;margin:0 auto;display:block;text-align:center;" src="https://user-images.githubusercontent.com/3549445/293683054-a110a5fe-72d3-4004-970b-1e07159e5577.png" alt="SVG Preview">

<hr>


#### Ressource template for Home Assistant

```yaml
resources:
  - url: /hacsfiles/ha-floorplan/floorplan.js
    type: module
```