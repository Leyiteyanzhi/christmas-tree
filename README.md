# Snow Window

Decorate a Christmas tree in a picture-book snowy night. Choose from three tree shapes, three scenes, twenty-eight ornaments, zoom and fine placement, lights, browser drafts, and PNG export. Optional 2.5D view adds a gentle background parallax.

## Play locally

From the project folder run `python3 -m http.server 4173 --bind 127.0.0.1`, then open <http://127.0.0.1:4173>. The page uses plain HTML, CSS, JavaScript, and Canvas with bundled assets.

Pick an ornament, then tap the tree to place it. Tap Done placing to edit ornaments already on the tree; press and hold on overlaps to choose one. Desktop supports scroll zoom and dragging empty space; touch supports pinch zoom and pan.

[Product requirements](docs/product-requirements.md) · [Art notes](docs/art-direction.md)

## 3D studio

Open `/studio/` from the same local server. Drag to rotate the tree, pinch or scroll to zoom, and select a material to show available hanging spots. Edit mode lets you move and remove decorations. The studio stores its own local draft and exports the current view as a PNG.

The editable master scene is `art/Snow Window.blend`. To regenerate the meshopt-compressed GLB files, hanging spots, and master scene with Blender 5.2, run `blender --background --factory-startup --python-exit-code 1 --python art/build_studio.py`. The site bundles Three.js 0.180.0, GLTFLoader and MeshoptDecoder locally.
