var SolidVoxel = (function () {
    function SolidVoxel() {
    }
    // const
    SolidVoxel.SIZE = 0.25; // 4 voxels make up one meter
    // types
    SolidVoxel.TYPE_EMPTY = {
        empty: true
    };
    SolidVoxel.TYPE_DIRT = {
        color: new BABYLON.Color3(0.9, 0.9, 0.4)
    };
    SolidVoxel.TYPE_ROCK = {
        color: new BABYLON.Color3(0.4, 0.35, 0.15)
    };
    SolidVoxel.TYPE_GRASS = {
        color: new BABYLON.Color3(0.2, 0.95, 0.3)
    };
    return SolidVoxel;
})();
/// <reference path="noise.d.ts"/>
/// <reference path="solidvoxel.ts"/>
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
        var altitude = 1.0 + 0.9 * noise.perlin2(x * 0.2, z * 0.2);
        var altitude2 = 0.8 + 0.8 * noise.perlin2(x * 0.1 + 100, z * 0.1 + 100);
        if (y > altitude) {
            return SolidVoxel.TYPE_EMPTY;
        }
        else {
            if (y < altitude2) {
                return SolidVoxel.TYPE_ROCK;
            }
            else {
                return SolidVoxel.TYPE_DIRT;
            }
        }
    };
    return TerrainGenerator;
})();
/// <reference path="../bower_components/babylonjs/dist/babylon.2.2.d.ts"/>
/// <reference path="terraingenerator.ts"/>
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
    for (var i = -4; i < 4; i++) {
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
function setMeshColor(mesh, value) {
    var colors = [];
    var count = mesh.getTotalVertices() * 4;
    var i;
    for (i = 0; i < count; i += 4) {
        colors[i] = value.r;
        colors[i + 1] = value.g;
        colors[i + 2] = value.b;
        colors[i + 3] = 1;
    }
    mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
}
var Timer = (function () {
    function Timer() {
        this._start_time = -1;
        this._recorded_durations = {}; // key is label, value is an array of int (msec)
        this._recorded_amount = {}; // key is label, value is an int (count)
        this._recorded_total = {}; // key is label, value is an int (msec)
    }
    Timer._getInstance = function () {
        if (!Timer._inst) {
            Timer._inst = new Timer();
        }
        return Timer._inst;
    };
    Timer.start = function () {
        var timer = Timer._getInstance();
        timer._start_time = new Date().getTime();
    };
    Timer.end = function (label) {
        var timer = Timer._getInstance();
        var delta = new Date().getTime() - timer._start_time;
        //delta *= 0.001;
        // init
        if (!timer._recorded_durations[label]) {
            timer._recorded_durations[label] = [];
            timer._recorded_amount[label] = 0;
            timer._recorded_total[label] = 0;
        }
        // save data
        timer._recorded_durations[label].push(delta);
        timer._recorded_amount[label]++;
        timer._recorded_total[label] += delta;
    };
    // returns a float (msec)
    Timer.getAverage = function (label) {
        var timer = Timer._getInstance();
        if (!timer._recorded_durations[label]) {
            console.error("Timer: no time saved under label '" + label + "'");
            return 0;
        }
        return timer._recorded_total[label] / timer._recorded_amount[label];
    };
    return Timer;
})();
/// <reference path="app.ts"/>
/// <reference path="es6-promise.d.ts"/>
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
        this.askChunkMeshRebuild();
    }
    // launches the rebuild task asynchronously
    TerrainChunk.prototype.askChunkMeshRebuild = function () {
        var me = this;
        // setTimeout(function() {
        // 	me._rebuildChunkMeshAsync();
        // }, 0);
        if (!chunkRebuildPromise) {
            // initialize the promise
            chunkRebuildPromise = this._rebuildChunkMeshPromise();
        }
        else {
            // queue the rebuild operation
            chunkRebuildPromise.then(function () {
                me._rebuildChunkMeshPromise();
            });
        }
    };
    // this rebuilds the visible mesh; returns a promise
    TerrainChunk.prototype._rebuildChunkMeshPromise = function () {
        var me = this;
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                me._rebuildChunkMesh();
                resolve();
            }, 0);
        });
    };
    // does the actual chunk rebuilding; must be wrapped in a promise
    TerrainChunk.prototype._rebuildChunkMesh = function () {
        //console.log("rebuilding mesh at x:"+me.tfor_x+" z:"+me.tfor_z);
        Timer.start();
        // clear existing mesh
        if (this.visible_mesh) {
            this.visible_mesh.dispose();
        }
        var meshes = []; // list of meshes to merge
        var voxel_mesh;
        var base_type, current_type;
        var base_y, current_y;
        // mesh building is done in columns
        for (var x = 0; x < this.chunk_data.length; x++) {
            for (var z = 0; z < this.chunk_data[x].length; z++) {
                // starting at y=0, check for how long the voxel type is similar
                base_y = 0;
                base_type = this.chunk_data[x][z][base_y];
                for (current_y = 0; current_y < this.chunk_data[x][z].length; current_y++) {
                    current_type = this.chunk_data[x][z][current_y];
                    // voxels are different (or we reached the top of the chunk): generate a mesh
                    if (current_type != base_type || current_y == this.chunk_data[x][z].length - 1) {
                        // only generate mesh if it's not empty
                        if (base_type != SolidVoxel.TYPE_EMPTY) {
                            voxel_mesh = BABYLON.Mesh.CreateBox("chunk", SolidVoxel.SIZE, scene);
                            voxel_mesh.scaling.y = current_y - base_y;
                            voxel_mesh.position.x = SolidVoxel.SIZE * (x + 0.5);
                            voxel_mesh.position.y = SolidVoxel.SIZE * (base_y + (current_y - base_y) * 0.5);
                            voxel_mesh.position.z = SolidVoxel.SIZE * (z + 0.5);
                            voxel_mesh.bakeCurrentTransformIntoVertices();
                            setMeshColor(voxel_mesh, base_type.color);
                            meshes.push(voxel_mesh);
                        }
                        // save new base type
                        base_type = current_type;
                        base_y = current_y;
                    }
                }
            }
        }
        var mesh = BABYLON.Mesh.MergeMeshes(meshes, true, true);
        mesh.parent = TerrainChunk.common_root;
        this.visible_mesh = mesh;
        this.visible_mesh.position.x = this.tfor_x;
        this.visible_mesh.position.z = this.tfor_z;
        //console.log("rebuilding mesh at x:"+me.tfor_x+" z:"+me.tfor_z+" -- END");
        Timer.end('chunk_rebuild');
    };
    // this rebuilds the navigation mesh
    TerrainChunk.prototype.rebuildNavigationMesh = function () {
        // todo
    };
    // constants
    TerrainChunk.WIDTH = 4; // in meters
    TerrainChunk.HEIGHT = 16;
    TerrainChunk.SUBDIVISIONS = 4; // used for walkable mesh
    return TerrainChunk;
})();
// this object handles the queueing of chunk rebuilds
//var chunkRebuildManager = { };
var chunkRebuildPromise;
