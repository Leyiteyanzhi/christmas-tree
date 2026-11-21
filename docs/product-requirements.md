# christmas tree game · Product Requirements

Version 0.2 · November 19, 2026

## Product positioning

A mobile-first 2D Christmas tree decorating game. Players enter a snowy cottage, pick a tree, finish a composition with ornaments and lights, and save a holiday photo. A session can be a few hangings or a careful zoomed-in arrangement.

The first release validates three things: whether players can hang the first ornament on their own, whether they can adjust a small ornament after zooming, and whether turning the lights on makes them want to save, tweak, or try another tree.

## Design tradeoffs

| Approach | Strengths and cost | Decision |
| --- | --- | --- |
| 2D layers | Front layout, precise zoom, reusable transparent art, direct export. Tree can cover hang points | Used for v1 |
| 2.5D multi-angle | Fixed angle switches. Every tree image needs matching hang points and occlusion | Evaluate when fixed-angle showcase is needed |
| True 3D | Walk around the tree and decorate the back. Needs models, picking, camera, light paths, and mobile performance checks | If players repeatedly ask to decorate around the tree, prototype one tree with hang points first |

A lightweight 2.5D preview is available in the studio: background parallax only, with the tree and ornaments locked together.

## User flow

1. Enter the studio directly. Start with a full-pine starter layout, or begin from an empty tree.
2. Switch among three trees. Each tree keeps its own layout and restores when you return.
3. Pick an ornament from the tray and tap the crown to place it. The current item stays selected for repeats. After Done placing or Esc, select, move, rotate, recolor, or delete placed ornaments. Press and hold on overlaps to pick a lower item.
4. Zoom with canvas buttons, mouse wheel, or pinch. Pinch also pans; on desktop, drag empty space. Zoom and reset only change the view.
5. Switch among Snowy Cabin, Village Market, and Gingerbread Bakery. Optionally open a skippable vintage gold-and-red tip, then try warm white, colored, or off lights.
6. For photos, choose Full view or Current view, preview the crop, download a PNG, and return to editing.

## First-release scope

| Module | Requirement |
| --- | --- |
| Trees and scenes | Freely pair Snowy Cabin, Village Market, and Gingerbread Bakery. Full pine, tall fir, and snowy spruce have different crowns and valid areas |
| Materials | 28 ornaments: 6 baubles, 13 hangings, 3 toppers, and 6 floor pieces. Shown by category; toppers are unique per tree, others may repeat |
| Placement | Hangings use real hang-point checks with light snap near needles. Toppers snap to the tip, one per tree. Gifts and floor pieces align along the ground. Drag preview matches release |
| Editing | Move, rotate, and delete placed items; baubles have six color swaps. Undo, redo, and overlap picking. Empty and starter layouts can be undone |
| Lights | Each tree has a preset string path. Off, warm, and color modes; photos show the current look |
| Drafts | Same browser stores each tree’s ornaments, order, lights, and scene. Refresh restores the active tree and work. Undo history is session-only |
| Photos | Full view includes the full scene and floor gifts. Current view crops to the canvas; export includes scene, layout, and lights |
| Responsive | Desktop: trees left, materials right, scene center. On phones, trees and materials stay reachable in a stacked layout without horizontal overflow |

Timers, scoring, currency, unlocks, free string wrapping, animation audio, accounts, online share links, user uploads, and full 3D wait for later validation. One browser keeps three tree drafts in v1; multiple slots per tree shape and copy come later.

## Follow-up validation

- If players bounce between material categories often, add Recently used for alternating red and gold baubles.
- Add gingerbread and silver-blue theme cards. Watch whether themes change material choices and negative space.
- If sharing matters, evaluate vertical photos, multiple slots per tree shape, and editable share links. Links need storage and access design.
- Collect time to first hang, success after zoom, photo saves, and willingness to decorate again. First round from live observation and playtests.

## Art direction

Use a vintage picture-book look. Soft-clay can feel toy-like but needs consistent gloss and shadow across assets. Realistic shop-window looks photograph well but needle detail and highlights hurt small-ornament readability.

UI uses a wine-card ground, pine-green panels, warm gold frames, and lit pine branches. Scenes use cool-green cabin, indigo village, and warm bakery for different light moods. Tree silhouettes create placement variety; ornaments read by silhouette and value in full view. Depth comes from background, tree base, light string, ornaments, and local needle occlusion. Check small ornaments in phone full view, then at zoomed edges.

Art is generated with built-in ImageGen for scenes, pine branches, trees, and ornament sheets, then cut to independent WebP files. Bulbs, glow, and hang logic are drawn in code. Specs live in [art notes](art-direction.md).

## Acceptance

- On a phone-size canvas, hang a bow and a bauble so they partly overlap. Zoom, select the lower bauble, move it, undo, then return to full view.
- Tap far outside the crown; normal hangings stay put. Near the tip and floor, check star and gift snapping.
- Decorate all three trees, switch among them, refresh, and confirm ornaments, tree, lights, and scene restore.
- Open Photo and confirm Full view and Current view previews; the downloaded PNG matches, including top and floor.
- Check materials, button focus, and canvas on desktop and mobile widths. Simulate pinch zoom and pan; real-device playtests come later for feel.
