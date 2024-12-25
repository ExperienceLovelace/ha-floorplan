---
permalink: /docs/quick-start/
title: "Quick Start"
toc: true
hacs_images_gallery:
  - url: /assets/images/docs/quick-start/hacs-setup-1.png
    image_path: /assets/images/docs/quick-start/hacs-setup-1.png
    alt: "HACS - Find Ha Floorplan"
  - url: /assets/images/docs/quick-start/hacs-setup-2.png
    image_path: /assets/images/docs/quick-start/hacs-setup-2.png
    alt: "HACS - Install and remember to add ressources"
feature_row:
  - image_path: /assets/images/docs/quick-start/video-getting-started.png
    alt: "Video - Getting Started"
    title: "▶️ Getting Started"
    excerpt: "Add HACS & SVG-files and YAML entity mapping in Home Assistant"
    url: "https://youtu.be/5ue9J4WG2a8"
    btn_label: "Watch now"
    btn_class: "btn--inverse"
  - image_path: /assets/images/docs/quick-start/video-first-floorplan-part1.png
    alt: "Video - Create your first floorplan"
    title: "▶️ Floorplan in Inkscape"
    excerpt: "Create your first floorplan in Inkscape (1/2), including CSS and YAML configuration"
    url: "https://youtu.be/f_3KAPc53hQ"
    btn_label: "Watch now"
    btn_class: "btn--inverse"
---

{% capture workinprogress-notice-1 %}
**Important notice before you begin the ha-floorplan journey**

Please be aware that `ha-floorplan` will require a good amount of your time. Take a look at our [examples](https://experiencelovelace.github.io/ha-floorplan/docs/examples/), if you're getting stuck. Our [Discussion](https://github.com/ExperienceLovelace/ha-floorplan/discussions) area is also a good place to find help, but we're expecting you to read the docs and give it a try, before asking for help. Thank you, for your understanding.

If you've decided to go all in, we recommend you draw your floorplan in Floorplanner or similar tool. After that's done, export as an image. Sadly Floorplanner doesn't support exporting as a SVG-file.

In Inkscape you'll draw on top of the exported image from Floorplan. In other words, doing the drawings (almost) yet another time. If you find that to be a waste of time, it's totally possible to just draw the floorplan in Inkscape without any cool-looking background. That's your choice. In all cases remember to add ID's to all elements in Inkscape, if you're planning to interact with them.

After the SVG-file is done, you're ready to create configs for each room, to match up with each element in Home Assistant. That's another journey - but opens up for a lot of new fancy things for you to do, both with the graphics, but also how you're interacting with the floor plan itself.

We're improving `ha-floorplan` over time, so feel free to add suggestions whenever it's relevant. With that said, we've limited time to spend. For that reason you're very welcome to improve the docs by your own, creating pull-requests and joining the discussion on GitHub.

Head over to the [Discussion area](https://github.com/ExperienceLovelace/ha-floorplan/discussions) whenever you're ready to join the community.

With that said.... Good luck, and let's get started! 🥳

{% endcapture %}

<div class="notice--warning">{{ workinprogress-notice-1 | markdownify }}</div>

## Videos

{% include feature_row %}

## Things required for you to get started

- A running installation of Home Assistant. HACS on top are recommended.
- Inkscape or similar tool
- A good amount of time to spend, for this to play out nice


## Adding ha-floorplan to Home Assistant

Here you'll learn how to add ha-floorplan to Home Assistant. You could go manual, but we recommend you stick to HACS.

### HACS
The **H**ome **A**ssistant **C**ommunity **S**tore (HACS) is a great addition to Home Assistant and ha-floorplan is part of the its ecosystem. Therefore, we recommend installing our integration via HACS. And, why wouldn't you use [HACS](https://hacs.xyz)? It's one of the best things out there!

  1. Ensure that [HACS is installed](https://www.hacs.xyz/docs/use/).
  2. Enter `floor` in the search box
  3. Find 'ha-floorplan' and download it.
  4. Follow [this step by step guide](https://community.home-assistant.io/t/floorplan-now-available-as-a-lovelace-card/115489/323?u=exetico), to add your first Floorplan. There's plenty of ways of doing this, but this is the best way for beginners. If you generally use YAML in HA, you may want to move on to the 'Examples' pages. You'll also find useful links by looking at the [What's next](#whats-next)-section on this page.
 
{% include gallery id="hacs_images_gallery" caption="Here's a few images from the installation of ha-floorplan with [HACS](https://hacs.xyz/)." %}
                
### Manual

To avoid any frustration, installation via HACS is the recommended method.

Nevertheless, if you still prefer to do it manually, feel free to grab the latest version from the [/dist](https://github.com/ExperienceLovelace/ha-floorplan/tree/master/dist) directory. (Almost) stable releases can be found [here](https://github.com/ExperienceLovelace/ha-floorplan/releases).

  1. Download the required resources.
  2. Add references to the new module you just added.
  3. Use ha-lovelace in a card. Move ahead to our examples if you need inspiration.

## What's next?

You'll now need to create your SVG file. It's up to you, if you would like to have a fancy image in the background, of whether you'd like to draw everything in Inkscape.

After that's done, it's time to add the SVG-file to your Home Assistant instance. The CSS-file are almost a must-have for better visuals, too.

We don't have a proper "step-by-step" guide for this part. That's mainly due to limited amount of time, but the process is also changing a bit over time, now that Home Assistant is always under active development.

With that said, here's a few helpful links for you to continue your journey, if you're unsure how to progress.

### How to add ha-floorplan to Home Assistant
If you're unsure on how to get started, we recommend you look at the following post:

[How to setup ha-floorplan in Hass.io](https://community.home-assistant.io/t/floorplan-now-available-as-a-lovelace-card/115489/323?u=exetico)

If you're more a video-person, check this video:

[Getting Started (1) \| Add HACS & SVG-files and YAML entity mapping in Home Assistant](https://www.youtube.com/watch?v=5ue9J4WG2a8)

If you're ready to create your first floorplan, check this video:

[Create your first floorplan in Inkscape (1/2) \| Including CSS and YAML configuration](https://youtu.be/f_3KAPc53hQ)

### How to start using Inkscape with a background image
If you're unsure on how to prepare the SVG-file with your own Floorplanner image, kindly check the following answer:

[First steps in Inkscape, after you've created your Floorplanner image](https://github.com/ExperienceLovelace/ha-floorplan/discussions/131#discussioncomment-1654167)

### How to get started from scratch, but as a video 

We recommend you take a look at this video:

[Getting Started (1) Add HACS & SVG-files and YAML entity mapping in Home Assistant](https://www.youtube.com/watch?v=5ue9J4WG2a8)

Here's another (very) long video, where there's plenty of good tips and tricks:
[Home Assistant Floorplan SVG Inkscape](https://www.youtube.com/watch?v=MCNxgb0mrSA)

### How to bind your Home Assistant elements with SVG elements
If you're still facing problems on how to use your SVG-file, try visiting our live examples, and take a closer look at the YAML and CSS-tabs, to see the actual config for each solution:

[Floorplanner Home Example](https://experiencelovelace.github.io/ha-floorplan/docs/example-floorplanner-home/)


### How to get started with CSS
There's plenty of tutorials related to CSS online. We recommend you give one of them a chance, and maybe even take a look at our examples in the docs.

With that said, here's one very simple video about how to get started with CSS in ha-floorplan:

[Using CSS-selectors \| How CSS-styling works in ha-floorplan and in general](https://youtu.be/oqO4Vx6U1Mo)
