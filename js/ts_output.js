var SolidVoxel = (function () {
    function SolidVoxel() {
    }
    SolidVoxel.getTypeData = function (type) { return SolidVoxel.types_data[type]; };
    // const
    SolidVoxel.SIZE = 0.25; // 4 voxels make up one meter
    // types
    SolidVoxel.TYPE_EMPTY = 0;
    SolidVoxel.TYPE_DIRT = 1;
    SolidVoxel.TYPE_ROCK = 2;
    SolidVoxel.TYPE_GRASS = 3;
    // type data
    SolidVoxel.types_data = [
        // EMPTY
        {
            empty: true
        },
        //DIRT
        {
            color: new BABYLON.Color3(0.9, 0.9, 0.4)
        },
        // ROCK
        {
            color: new BABYLON.Color3(0.4, 0.35, 0.15)
        },
        // GRASS
        {
            color: new BABYLON.Color3(0.2, 0.95, 0.3)
        }
    ];
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
    for (var i = -10; i < 10; i++) {
        for (var j = -10; j < 10; j++) {
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
    // picking
    var pickResult = scene.pick(scene.pointerX, scene.pointerY);
    if (pickResult.hit) {
    }
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
/// <reference path="../bower_components/babylonjs/dist/babylon.2.2.d.ts"/>
// This is a utility class that produces a mesh by building it
// step by step with simple operations: add quad, etc.
var MeshBuilder = (function () {
    function MeshBuilder() {
        // temporary vars
        this._v1 = new BABYLON.Vector3(0, 0, 0);
        this._v2 = new BABYLON.Vector3(0, 0, 0);
        this._v3 = new BABYLON.Vector3(0, 0, 0);
        this._i1 = 0;
        this._i2 = 0;
        this._i3 = 0;
    }
    MeshBuilder._getInstance = function () {
        if (!MeshBuilder._inst) {
            MeshBuilder._inst = new MeshBuilder();
        }
        return MeshBuilder._inst;
    };
    // vertex and index counts are used to allocate an array large enough if possible
    // if unknown, leave blank
    MeshBuilder.startMesh = function (vertex_count, triangle_count) {
        var builder = MeshBuilder._getInstance();
        if (!vertex_count) {
            vertex_count = 0;
        }
        if (!triangle_count) {
            triangle_count = 0;
        }
        // init
        builder._positions = new Array(vertex_count * 3);
        builder._normals = new Array(vertex_count * 3);
        builder._colors = new Array(vertex_count * 4);
        builder._indices = new Array(triangle_count * 3);
        builder._vertex_position = 0;
        builder._triangle_position = 0;
    };
    // finalize mesh and return it
    MeshBuilder.endMesh = function (name, scene, parent) {
        var builder = MeshBuilder._getInstance();
        var mesh = new BABYLON.Mesh(name, scene, parent);
        mesh.setIndices(builder._indices);
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, builder._positions);
        mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, builder._colors);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, builder._normals);
        return mesh;
    };
    // MESH BUILDING
    MeshBuilder.addVertex = function (pos, norm, col) {
        if (!col) {
            col = new BABYLON.Color4(1, 1, 1, 1);
        }
        var builder = MeshBuilder._getInstance();
        builder._addToArray(builder._positions, [pos.x, pos.y, pos.z], builder._vertex_position * 3);
        builder._addToArray(builder._normals, [norm.x, norm.y, norm.z], builder._vertex_position * 3);
        builder._addToArray(builder._colors, [col.r, col.g, col.b, (col['a'] ? col['a'] : 1)], builder._vertex_position * 4);
        builder._vertex_position += 1;
    };
    // normals are perpendicular to the triangle
    // anti-clockwise: v1, v2, v3
    MeshBuilder.addTriangle = function (v1, v2, v3, color) {
        var builder = MeshBuilder._getInstance();
        builder._i1 = builder._vertex_position;
        builder._v1.copyFrom(v3).subtractInPlace(v1);
        builder._v2.copyFrom(v2).subtractInPlace(v1);
        BABYLON.Vector3.CrossToRef(builder._v1, builder._v2, builder._v3);
        builder._v3.normalize();
        MeshBuilder.addVertex(v1, builder._v3, color);
        MeshBuilder.addVertex(v2, builder._v3, color);
        MeshBuilder.addVertex(v3, builder._v3, color);
        builder._addToArray(builder._indices, [builder._i1, builder._i1 + 1, builder._i1 + 2], builder._triangle_position * 3);
        builder._triangle_position += 1;
    };
    // normals a perpendicular to the vectors v1v2 and v1v4
    // anti-clockwise: v1, v2, v3, v4
    // normal is optional
    MeshBuilder.addQuad = function (v1, v2, v3, v4, color, normal) {
        var builder = MeshBuilder._getInstance();
        builder._i1 = builder._vertex_position;
        if (!normal) {
            builder._v1.copyFrom(v4).subtractInPlace(v1);
            builder._v2.copyFrom(v2).subtractInPlace(v1);
            BABYLON.Vector3.CrossToRef(builder._v1, builder._v2, builder._v3);
            builder._v3.normalize();
            normal = builder._v3;
        }
        MeshBuilder.addVertex(v1, normal, color);
        MeshBuilder.addVertex(v2, normal, color);
        MeshBuilder.addVertex(v3, normal, color);
        MeshBuilder.addVertex(v4, normal, color);
        builder._addToArray(builder._indices, [builder._i1, builder._i1 + 1, builder._i1 + 2,
            builder._i1, builder._i1 + 2, builder._i1 + 3], builder._triangle_position * 3);
        builder._triangle_position += 2;
    };
    // helper
    MeshBuilder.prototype._addToArray = function (array, values, index) {
        if (typeof values === "number") {
            if (array.length <= index) {
                array.push(values);
            }
            else {
                array[index] = values;
            }
            return;
        }
        if (values instanceof Array) {
            for (var i = 0; i < values.length; i++) {
                this._addToArray(array, values[i], index + i);
            }
            return;
        }
    };
    return MeshBuilder;
})();
/// <reference path="app.ts"/>
/// <reference path="meshbuilder.ts"/>
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
                me._rebuildVisibleChunkMesh();
                resolve();
            }, 0);
        });
    };
    // does the actual chunk rebuilding
    TerrainChunk.prototype._rebuildVisibleChunkMesh = function () {
        //console.log("rebuilding mesh at x:"+me.tfor_x+" z:"+me.tfor_z);
        Timer.start();
        // clear existing mesh
        if (this.visible_mesh) {
            this.visible_mesh.dispose();
        }
        // temp vars
        var d0; // which axis we're on
        var d1, d2; // secondary axis
        var mask; // each value holds if there is a visible voxel as back_type and/or front_type
        var dims = [
            this.chunk_data.length,
            this.chunk_data[0][0].length,
            this.chunk_data[0].length
        ];
        var i = [0, 0, 0]; // current voxel indices
        var j, k, l, m;
        var inc = [0, 0, 0]; // increment on main axis
        var type_current, type_forward, type_backward, type_other; // these are numbers
        var width, height; // dimension of the current quad
        var byte_mask;
        var s = SolidVoxel.SIZE; // shortcut
        var du = [0, 0, 0], dv = [0, 0, 0]; // used to build the quads
        var ou = [0, 0, 0], ov = [0, 0, 0]; // offset for quads
        var do_break;
        var v1 = new BABYLON.Vector3(0, 0, 0);
        var v2 = new BABYLON.Vector3(0, 0, 0);
        var v3 = new BABYLON.Vector3(0, 0, 0);
        var v4 = new BABYLON.Vector3(0, 0, 0);
        var v_shift = new BABYLON.Vector3(0, 0, 0);
        var normal = new BABYLON.Vector3(0, 0, 0);
        // start mesh building, planning 40 quads min
        MeshBuilder.startMesh(160, 80);
        // loop on 3 axis
        for (d0 = 0; d0 < 3; d0++) {
            // compute secondary directions
            d1 = (d0 + 1) % 3;
            d2 = (d0 + 2) % 3;
            // compute increment on main axis
            inc[d0] = 1;
            inc[d1] = 0;
            inc[d2] = 0;
            // traverse the chunk in the current axis
            for (i[d0] = 0; i[d0] < dims[d0]; i[d0]++) {
                // init mask
                mask = new Uint8Array(dims[d1] * dims[d2]);
                // fill up the mask
                for (i[d1] = 0; i[d1] < dims[d1]; i[d1]++) {
                    for (i[d2] = 0; i[d2] < dims[d2]; i[d2]++) {
                        type_current = this._getVoxelType(i[0], i[1], i[2]);
                        type_forward = this._getVoxelType(i[0] + inc[0], i[1] + inc[1], i[2] + inc[2]);
                        type_backward = this._getVoxelType(i[0] - inc[0], i[1] - inc[1], i[2] - inc[2]);
                        mask[i[d1] * dims[d2] + i[d2]] =
                            (type_current && !type_forward ? 1 : 0)
                                | (type_current && !type_backward ? 2 : 0);
                    }
                }
                // generate quads based on mask
                for (j = 0; j < dims[d1]; j++) {
                    for (k = 0; k < dims[d2]; k++) {
                        // handle mask for forward and backward values
                        for (byte_mask = 1; byte_mask <= 2; byte_mask++) {
                            // skip if mask is unset here
                            if (!(mask[j * dims[d2] + k] & byte_mask)) {
                                continue;
                            }
                            i[d1] = j;
                            i[d2] = k;
                            type_current = this._getVoxelType(i[0], i[1], i[2]);
                            // extend width
                            width = 1;
                            while (j + width < dims[d1] && (mask[(j + width) * dims[d2] + k] & byte_mask)) {
                                // check that type is consistent
                                i[d1] = j + width;
                                i[d2] = k;
                                type_other = this._getVoxelType(i[0], i[1], i[2]);
                                if (type_other != type_current) {
                                    break;
                                }
                                width++;
                            }
                            // extend height
                            height = 1;
                            while (k + height < dims[d2]) {
                                // check if line is still valid
                                do_break = false;
                                for (l = j; l < j + width; l++) {
                                    if (!(mask[l * dims[d2] + k + height] & byte_mask)) {
                                        do_break = true;
                                        break;
                                    }
                                    // check that type is consistent
                                    i[d1] = l;
                                    i[d2] = k + height;
                                    type_other = this._getVoxelType(i[0], i[1], i[2]);
                                    if (type_other != type_current) {
                                        do_break = true;
                                        break;
                                    }
                                }
                                if (do_break) {
                                    break;
                                }
                                height++;
                            }
                            // generate quad
                            i[d1] = j;
                            i[d2] = k;
                            ou[d0] = 0;
                            ou[d1] = 0;
                            ou[d2] = -s * 0.5;
                            ov[d0] = 0;
                            ov[d1] = -s * 0.5;
                            ov[d2] = 0;
                            du[d0] = 0;
                            du[d1] = 0;
                            du[d2] = s * (height - 0.5);
                            dv[d0] = 0;
                            dv[d1] = s * (width - 0.5);
                            dv[d2] = 0;
                            v1.copyFromFloats(s * i[0] + ou[0] + ov[0], s * i[1] + ou[1] + ov[1], s * i[2] + ou[2] + ov[2]);
                            v2.copyFromFloats(s * i[0] + du[0] + ov[0], s * i[1] + du[1] + ov[1], s * i[2] + du[2] + ov[2]);
                            v3.copyFromFloats(s * i[0] + du[0] + dv[0], s * i[1] + du[1] + dv[1], s * i[2] + du[2] + dv[2]);
                            v4.copyFromFloats(s * i[0] + ou[0] + dv[0], s * i[1] + ou[1] + dv[1], s * i[2] + ou[2] + dv[2]);
                            v_shift.copyFromFloats(s * inc[0] * 0.5, s * inc[1] * 0.5, s * inc[2] * 0.5);
                            normal.copyFromFloats(inc[0], inc[1], inc[2]);
                            // shift and assign vertices according to direction
                            if (byte_mask == 1) {
                                v1.addInPlace(v_shift);
                                v2.addInPlace(v_shift);
                                v3.addInPlace(v_shift);
                                v4.addInPlace(v_shift);
                                MeshBuilder.addQuad(v1, v2, v3, v4, SolidVoxel.getTypeData(type_current).color, normal);
                            }
                            else {
                                normal.scaleInPlace(-1);
                                v1.subtractInPlace(v_shift);
                                v2.subtractInPlace(v_shift);
                                v3.subtractInPlace(v_shift);
                                v4.subtractInPlace(v_shift);
                                MeshBuilder.addQuad(v1, v4, v3, v2, SolidVoxel.getTypeData(type_current).color, normal);
                            }
                            // zero out region
                            for (l = j; l < j + width; l++) {
                                for (m = k; m < k + height; m++) {
                                    mask[l * dims[d2] + m] = mask[l * dims[d2] + m] & ~byte_mask;
                                }
                            }
                        }
                    }
                }
            }
        }
        this.visible_mesh = MeshBuilder.endMesh("chunk", scene, TerrainChunk.common_root);
        this.visible_mesh.position.x = this.tfor_x;
        this.visible_mesh.position.z = this.tfor_z;
        this.visible_mesh.isPickable = true;
        //console.log("rebuilding mesh at x:"+me.tfor_x+" z:"+me.tfor_z+" -- END");
        Timer.end('chunk_rebuild');
    };
    // this rebuilds the navigation mesh
    TerrainChunk.prototype.rebuildNavigationMesh = function () {
        // todo
    };
    // helpers
    TerrainChunk.prototype._getVoxelType = function (x, y, z) {
        if (x < 0 || x >= this.chunk_data.length ||
            z < 0 || z >= this.chunk_data[0].length ||
            y < 0 || y >= this.chunk_data[0][0].length) {
            return SolidVoxel.TYPE_EMPTY;
        }
        return this.chunk_data[x][z][y];
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
// temporary vars
var tmp0 = 0, tmp1 = 0, tmp2 = 0, tmp3 = 0, tmp4 = 0;
var tmpX = 0, tmpY = 0, tmpZ = 0;
var tmpArray = [];
/// <reference path="app.ts"/>
/// <reference path="terrainchunk.ts"/>
// This object (singleton) handles generating and releasing terrain chunks on the fly
// It also allows terrain modification spanning across multiple chunks
var Environment = (function () {
    function Environment() {
        // this is a collection of all the loaded chunks
        // keys are string like so: "X:Z" where X and Z are the chunk's coordinates in the terrain frame of ref.
        this.chunks_collection = {};
    }
    Environment._getInstance = function () {
        if (!Environment._inst) {
            Environment._inst = new Environment();
        }
        return Environment._inst;
    };
    Environment.prototype.getChunkAt = function (tfor_x, tfor_z) {
        var inst = Environment._getInstance();
        var chunk_x = Math.floor(tfor_x / TerrainChunk.WIDTH) * TerrainChunk.WIDTH;
        var chunk_z = Math.floor(tfor_z / TerrainChunk.WIDTH) * TerrainChunk.WIDTH;
        var chunk = inst.chunks_collection[chunk_x + ':' + chunk_z];
        return chunk;
    };
    return Environment;
})();
