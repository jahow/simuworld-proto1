# Installation

You will need npm and bower installed for this to work.

1. clone repo
- open an invite in the root directory
- install typescript globally with `npm install typescript -g`
- type `npm install`
- type `bower install`

# Compiling and launching

To compile typescript code and concatenate public files, type `gulp dev`. The opened browser window will be synchronized, i.e. any change to the source code will trigger a reload of the page.

If you only need to launch the app, simply type `gulp`. This will launch a local server at port 8080 and open a browser window.

# Usage

Voxels are removed under the cursor (temporary).

Type `scene.debugLayer.show()` in the console to have access to additional info about the rendered scene.

Type `Timer.getAverage('chunk_rebuild')` to see the average time taken by chunks geometry construction (in ms).