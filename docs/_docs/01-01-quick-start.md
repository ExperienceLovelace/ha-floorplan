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
---


{% capture workinprogress-notice-1 %}
#### Work in progress...

The "Quick Start guide is **NOT READY YET**, but there are a few tips which can help you on the way...

We'll refine this part, but feel free to use it "as is". If you have any suggestion to the docs in generel, feel free to use the [Discussion-area](https://github.com/ExperienceLovelace/ha-floorplan/discussions). Create pull requests too, if you like to provide even more.

{% endcapture %}

<div class="notice--warning">{{ workinprogress-notice-1 | markdownify }}</div>



## HACS
The **H**ome **A**ssistant **C**ommunity **S**tore (HACS) are one of the best out there, and ha-floorplan has full support for it. Therefore, we recommend installing our integration through this. And, why wouldn't you use [HACS](https://hacs.xyz/)? It's one of the best things out there!

  1. Ensure that [HACS is installed](https://hacs.xyz/docs/installation/installation).
  2. Go to HACS > Integrations > Frontend.
  3. Select "Explore & Add Repositories".
  4. Find "Ha Floorplan" and install it.
  5. Remember to add the `/hacsfiles/ha-floorplan/floorplan.js` as a module to your resource file - like you do with other modules.
  6. Follow [this step by step guide](https://community.home-assistant.io/t/floorplan-now-available-as-a-lovelace-card/115489/323?u=exetico), to add your first Floorplan. There's plenty of ways of doing this, but this is the best "beginner"-way. If you generally use YAML in HA, you'd like to move on to the "examples" pages.
 
 
{% include gallery id="hacs_images_gallery" caption="Here's a few images from the installation of ha-floorplan with [HACS](https://hacs.xyz/)." %}

                
## Manual

We don't want to make you frustrated, but it's better to go the HACS way. 

If you still think it's better to do it manually, feel free to grab the latest version from the [/dist](https://github.com/ExperienceLovelace/ha-floorplan/tree/master/dist) directory. (Almost) stable releases can be found [here](https://github.com/ExperienceLovelace/ha-floorplan/releases).

  1. Download the required resources.
  2. Add references to the new module you just added.
  3. Use ha-lovelace in a card. Move ahead to our examples if you need inspiration.


