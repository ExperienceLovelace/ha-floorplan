---
layout: splash
permalink: /
header:
  overlay_color: "#5e616c"
  overlay_image: /assets/images/header-frontpage.png
  actions:
    - label: "I'm ready - how do I begin? <i class='fas fa-laugh-beam'></i>"
      url: "/docs/quick-start/"
excerpt: >
  Bring new life to Home Assistant with Floorplan. By mapping entities to SVG images, you’re able to show states, control devices, call services - and much more.
  
  <small>Use your own custom styles to visualize whatever you can think of. Your imagination becomes the new limit.</small>
feature_row:
  - fa_icon: "laugh-beam"
    fa_bg: "#6892ae"
    fa_color: "white"
    fa_size: "3x"
    fa_margin: "20px"
    alt: "Quick Start"
    title: "Quick Start"
    excerpt: "Are you ready to begin? Check our Quick Start guide now!"
    url: "/docs/quick-start/"
    btn_label: "Let's start!"
    btn_class: "btn--primary"

  - fa_icon: "lightbulb"
    fa_bg: "#6892ae"
    fa_color: "white"
    fa_size: "3x"
    fa_margin: "20px"
    alt: "Check our examples"
    title: Check our examples
    excerpt: "It's always easier to start, with a good amount of examples. So, go get them!"
    url: "/docs/examples/"
    btn_label: "Let's get inspired?"
    btn_class: "btn--primary"

  - fa_icon: "tools"
    fa_bg: "#6892ae"
    fa_color: "white"
    fa_size: "3x"
    fa_margin: "20px"
    alt: "Usage"
    title: "Usage"
    excerpt: "There's plenty of options, including long-click, so what are you waiting for?"
    url: "/docs/usage/"
    btn_label: "Let's deep dive!"
    btn_class: "btn--primary"

---

Bring new life to [Home Assistant](https://www.home-assistant.io/) with Floorplan. By mapping entities to SVG images, you're able to show states, control devices, call services - and much more. Use your own custom styles to visualize whatever you can think of. Your imagination becomes the new limit.

And remember: Although it's typically used to represent the floorplan of your home, you can use Floorplan for anything. A music box? No problem. A Ring doorbell? Bring it on. A remote control for your legacy TV with IR control? Yep, that can be done, too.

<br>

{% include feature_row %}

Please join our [Discussion](https://github.com/ExperienceLovelace/ha-floorplan/discussions) area, if you need any help, feedback or any kind of other support, too. We're also on the [Home Assistant's Community](https://community.home-assistant.io/t/floorplan-now-available-as-a-lovelace-card/115489) - but it's way better to join the discussion on GitHub.

Kindly use it for general usage questions, too. Do you have a good idea for Floorplan, or have you faced an issue with the current solution? Create an issue, and remember to provide as much detail as possible. We'll do our best to help you out.


## First steps

First of all, check out the [Quick Start guide](./docs/quick-start/) guide. You'll get an idea of what Floorplan can do, and how to use it with a basic setup.

If you'd like to see interactive examples, head on over to the [Examples](./docs/examples/) page.

Are you searching for a specific feature? Please take a look at the [Usage](./docs/usage/) page. You'll see how to use triggers, actions, and more advanced stuff. We'll do our best to keep it up to date.

<div class="page__hero--overlay" style="padding-left:50px;background-color: #5e616c; background-image: url('/ha-floorplan/assets/images/bg-frontpage.png');">
    <div class="wrapper">
      <h1 id="page-title" class="page__title" itemprop="headline">See it in action</h1>
        <p class="page__lead">Here's a real world example of how to use ha-floorplan, with a floorplan created with Floorplanner. This is just a simple example of how to get started. Use a combination of YAML, CSS and JavaScript to get the most out of it, or take a look at the examples to get inspired.
<small>Use your own custom styles to visualize whatever you can think of. Your imagination becomes the new limit.</small>
</p>
<p>
  
  <div class="example_wrapper">


    <script src="docs/floorplan/floorplan-examples.js"></script>
    <script src="assets/js/tabs.js"></script>
    <link rel="stylesheet" href="assets/css/tabs.css">

    <div class="tab">
      <button class="tablinks active" onclick="showTab(event, 'floorplanner_home-floorplan')">Floorplan</button>
      <button class="tablinks" onclick="showTab(event, 'floorplanner_home-yaml')">YAML</button>
      <button class="tablinks" onclick="showTab(event, 'floorplanner_home-css')">CSS</button>
    </div>

    <div class="tabcontent-container size-auto">

      <div data-tab="floorplanner_home-floorplan" class="tabcontent active">
        <floorplan-examples examplespath="_docs/floorplan/examples" data-include="floorplanner_home"></floorplan-examples>
      </div>

    </div>


</div>
  
  
  
  
  
  
    </p></div>
</div>


## Posts

Here's the latest posts about ha-floorplan, shared here in our documentation.

<div class="grid__wrapper">
  {% for post in site.posts limit:4 %}
    {% include archive-single.html type="grid" %}
  {% endfor %}
</div>

<div style="clear:both"><!-- the frid_wrapper will break the layout, if not cleared --></div>

_We won't post that often, but sometime it's fine to see things created in the past. Right?_


## Feedback

Floorplan has been created for you, but we can't make everyone happy at once. If you have feedback for Floorplan, please create an issue, or join the [discussion](https://github.com/ExperienceLovelace/ha-floorplan/discussions). We'll do our best to assist you.
