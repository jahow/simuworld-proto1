/// <reference path="../bower_components/babylonjs/dist/babylon.2.2.d.ts"/>
var canvas;
var engine;
var scene;
var camera;
var time = 0;
var delta_time = 0;
var mouseX = 0;
var mouseY = 0;
var mouseX_world = 0;
var mouseY_world = 0;
window.onload = function () { initGLScene(); };
window.addEventListener("resize", function () { resize(); });
function initGLScene() {
    canvas = document.getElementById("scene");
    engine = new BABYLON.Engine(canvas, true);
    // WebGL not supported
    if (!engine._gl) {
        return;
    }
    scene = new BABYLON.Scene(engine);
    camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, 0, 35, new BABYLON.Vector3(0, 0, 0), scene);
    adjustCameraFov();
    camera.attachControl(canvas);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    var light = new BABYLON.HemisphericLight("light0", new BABYLON.Vector3(0.25, 1, 0), scene);
    light.diffuse = new BABYLON.Color3(1, 1, 1);
    light.groundColor = new BABYLON.Color3(0.12, 0.12, 0);
    light.specular = new BABYLON.Color3(0, 0, 0);
    // add input events
    document.addEventListener("pointerdown", onPointerDown, false);
    document.addEventListener("pointermove", onPointerMove, false);
    document.addEventListener("pointerup", onPointerUp, false);
    document.addEventListener("pointerout", onPointerUp, false);
    // temp
    var generator = new TerrainGenerator();
    for (var i = -6; i < 6; i++) {
        for (var j = -4; j < 4; j++) {
            new TerrainChunk(i * TerrainChunk.WIDTH, j * TerrainChunk.WIDTH, generator);
        }
    }
    // start loop
    BABYLON.Tools.QueueNewFrame(renderLoop);
    scene.registerBeforeRender(update);
}
var renderLoop = function () {
    // Start new frame
    engine.beginFrame();
    scene.render();
    // Present
    engine.endFrame();
    // Register new frame
    BABYLON.Tools.QueueNewFrame(renderLoop);
};
var update = function () {
    delta_time = engine.getDeltaTime() * 0.001;
    time += delta_time;
    // compute mouse world coord
    var pick_info = scene.pick(mouseX, mouseY, function (mesh) { return mesh.name == "floor"; });
    if (pick_info.pickedPoint) {
        mouseX_world = pick_info.pickedPoint.x;
        mouseY_world = pick_info.pickedPoint.z;
    }
    adjustCameraFov();
};
function resize() {
    if (engine) {
        engine.resize();
        adjustCameraFov();
    }
}
function adjustCameraFov() {
    var height = document.documentElement.clientHeight || document.body.clientHeight;
    var ratio = window.devicePixelRatio;
    height /= ratio;
    //camera.fov = 0.58 + (height - 640) / 315 * 0.22;
}
function onPointerMove(evt) {
    mouseX = evt.clientX;
    mouseY = evt.clientY;
}
function onPointerUp(evt) {
}
function onPointerDown(evt) {
}
// TOOLS
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function interpolate(start, end, ratio) {
    var clamp_ratio = clamp(ratio, 0, 1);
    return start * (1 - clamp_ratio) + end * clamp_ratio;
}
var EasingFunctions = {
    // no easing, no acceleration
    linear: function (t) { return t; },
    // accelerating from zero velocity
    easeInQuad: function (t) { return t * t; },
    // decelerating to zero velocity
    easeOutQuad: function (t) { return t * (2 - t); },
    // acceleration until halfway, then deceleration
    easeInOutQuad: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    // accelerating from zero velocity 
    easeInCubic: function (t) { return t * t * t; },
    // decelerating to zero velocity 
    easeOutCubic: function (t) { return (--t) * t * t + 1; },
    // acceleration until halfway, then deceleration 
    easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; },
    // accelerating from zero velocity 
    easeInQuart: function (t) { return t * t * t * t; },
    // decelerating to zero velocity 
    easeOutQuart: function (t) { return 1 - (--t) * t * t * t; },
    // acceleration until halfway, then deceleration
    easeInOutQuart: function (t) { return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t; },
    // accelerating from zero velocity
    easeInQuint: function (t) { return t * t * t * t * t; },
    // decelerating to zero velocity
    easeOutQuint: function (t) { return 1 + (--t) * t * t * t * t; },
    // acceleration until halfway, then deceleration 
    easeInOutQuint: function (t) { return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t; }
};
var SolidVoxel = (function () {
    function SolidVoxel() {
    }
    // const
    SolidVoxel.SIZE = 0.25; // 4 voxels make up one meter
    // types
    SolidVoxel.TYPE_EMPTY = 0;
    SolidVoxel.TYPE_DIRT = 1;
    SolidVoxel.TYPE_ROCK = 2;
    SolidVoxel.TYPE_GRASS = 3;
    return SolidVoxel;
})();
// Chunks are small pieces of land
// they consist of one mesh and thus are drawn by a single call
// they hold raw voxel data and maintain a mesh built according to those data
// they also hold a navigatable mesh that sits "on top" of the voxels
// solid voxels are stored in the chunk_data array
// particles (liquid voxels) are stored in the particles array
// chunk meshes are attached to a common root, and positioned according
// to their coordinates in the terrain frame of reference (TFOR)
var TerrainChunk = (function () {
    // coordinates in the TFOR
    function TerrainChunk(tfor_x, tfor_z, generator) {
        this.tfor_x = tfor_x;
        this.tfor_z = tfor_z;
        // common root initialization
        if (!TerrainChunk.common_root) {
            TerrainChunk.common_root = new BABYLON.Mesh("chunks_root", scene);
        }
        // fill chunk data with generator
        var count_wide = TerrainChunk.WIDTH / SolidVoxel.SIZE;
        var count_high = TerrainChunk.HEIGHT / SolidVoxel.SIZE;
        var voxel_x, voxel_y, voxel_z;
        this.chunk_data = new Array(count_wide);
        for (var x = 0; x < count_wide; x++) {
            this.chunk_data[x] = new Array(count_wide);
            voxel_x = x * SolidVoxel.SIZE + tfor_x;
            for (var z = 0; z < count_wide; z++) {
                this.chunk_data[x][z] = new Array(count_high);
                voxel_z = z * SolidVoxel.SIZE + tfor_z;
                for (var y = 0; y < count_high; y++) {
                    voxel_y = y * SolidVoxel.SIZE;
                    this.chunk_data[x][z][y] = generator.getSolidVoxelType(voxel_x, voxel_y, voxel_z);
                }
            }
        }
        // build chunk meshes for the first time
        this.rebuildChunkMesh();
    }
    // this rebuilds the visible mesh
    TerrainChunk.prototype.rebuildChunkMesh = function () {
        // temp
        /*
        var mesh = BABYLON.Mesh.CreateBox("chunk", TerrainChunk.WIDTH, scene, TerrainChunk.common_root);
        mesh.position.x = TerrainChunk.WIDTH / 2;
        mesh.position.z = TerrainChunk.WIDTH / 2;
        mesh.position.y = TerrainChunk.WIDTH / 2;
        mesh.bakeCurrentTransformIntoVertices();
        */
        var meshes = []; // list of meshes to merge
        var voxel_mesh;
        for (var x = 0; x < this.chunk_data.length; x++) {
            for (var z = 0; z < this.chunk_data[x].length; z++) {
                for (var y = 0; y < this.chunk_data[x][z].length; y++) {
                    if (this.chunk_data[x][z][y] == SolidVoxel.TYPE_EMPTY) {
                        continue;
                    }
                    voxel_mesh = BABYLON.Mesh.CreateBox("chunk", SolidVoxel.SIZE, scene);
                    voxel_mesh.position.x = SolidVoxel.SIZE * (x + 0.5);
                    voxel_mesh.position.y = SolidVoxel.SIZE * (y + 0.5);
                    voxel_mesh.position.z = SolidVoxel.SIZE * (z + 0.5);
                    voxel_mesh.bakeCurrentTransformIntoVertices();
                    meshes.push(voxel_mesh);
                }
            }
        }
        var mesh = BABYLON.Mesh.MergeMeshes(meshes, true, true);
        mesh.parent = TerrainChunk.common_root;
        this.visible_mesh = mesh;
        this.visible_mesh.position.x = this.tfor_x;
        this.visible_mesh.position.z = this.tfor_z;
    };
    // this rebuilds the navigation mesh
    TerrainChunk.prototype.rebuildNavigationMesh = function () {
        // todo
    };
    // constants
    TerrainChunk.WIDTH = 2; // in meters
    TerrainChunk.HEIGHT = 8;
    TerrainChunk.SUBDIVISIONS = 4; // used for walkable mesh
    return TerrainChunk;
})();
/// <reference path="noise.d.ts"/>
// Terrain generators are objects that answer the question:
// "what voxel is there at coordinates x,y,z?"
// They just give the 'natural' state of the world, ie before modifications
var TerrainGenerator = (function () {
    function TerrainGenerator() {
    }
    // returns a SolidVoxel.TYPE_* constant
    // coordinates are in the Terrain Frame of Reference (TFOR)
    TerrainGenerator.prototype.getSolidVoxelType = function (x, y, z) {
        // under altitude, return dirt and rock
        // else, return empty
        var altitude = 1.0 + 0.8 * noise.perlin2(x * 0.2, z * 0.2);
        if (y > altitude) {
            return SolidVoxel.TYPE_EMPTY;
        }
        else {
            if (y < altitude * 0.8) {
                return SolidVoxel.TYPE_ROCK;
            }
            else {
                return SolidVoxel.TYPE_DIRT;
            }
        }
    };
    return TerrainGenerator;
})();
