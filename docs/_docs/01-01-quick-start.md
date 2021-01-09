---
permalink: /docs/quick-start/
title: "Quick Start"
toc: true
---


{% capture workinprogress-notice-1 %}
#### Work in progres..

The "Quick Start guide are **NOT READY**, but there's a few tips, which can help you on the way...

We'll refine this part, but fell free to use it "as is". If you have any suggestion to the docs in generel, fell free to use the [Discussion-area](https://github.com/ExperienceLovelace/ha-floorplan/discussions). Create pull requests too, if you like to provide even more.

{% endcapture %}

<div class="notice">{{ workinprogress-notice-1 | markdownify }}</div>



## HACS
The **H**ome **A**ssistant **C**ommunity **S**tore (HACS) are one of the best out there, and ha-floorplan has fully support for it. Therefore, we kindy ask you to install our integration through this. And, why wouldn't you use [HACS](https://hacs.xyz/)? It's one of the best things out there.

1) Secure that [HACS are installed](https://hacs.xyz/docs/installation/installation).
2) Go to HACS > Integrations > Frontend.
3) Select "Explore & Add Repositories".
4) Find "Ha Floorplan" and install it.
5) Remember to add the `/hacsfiles/ha-floorplan/floorplan.js` as a module to your resource file, like you'll do with other modules.
6) Follow [this step by step guide](https://community.home-assistant.io/t/floorplan-now-available-as-a-lovelace-card/115489/323?u=exetico), to add your first Floorplan. There's plenty of ways of doing this, but this is the best "beginner"-way. If you're always use to YAML and HA in general, you'd like to move on to the "examples" pages.

                
## Manual

We don't wan't to make you frustrated, but it's better to go the HACS way. 

If you still think it's better to do it manually, fell free to grap the latest version from the [/dist](https://github.com/ExperienceLovelace/ha-floorplan/tree/master/dist) directory. (Almost) stable releases can be found [here](https://github.com/ExperienceLovelace/ha-floorplan/releases).

1) Download the required resources.
2) Add references to the new module you just added.
3) Use ha-lovelace in a card. Move ahead to our examples, if you need inspiration.


