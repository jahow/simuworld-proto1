/// <reference path="../bower_components/babylonjs/dist/babylon.2.2.d.ts"/>

var canvas: HTMLCanvasElement;
var engine: BABYLON.Engine;
var scene: BABYLON.Scene;
var camera: BABYLON.Camera;
var time = 0;
var delta_time = 0;
var mouseX = 0;
var mouseY = 0;
var mouseX_world = 0;
var mouseY_world = 0;


window.onload = function() { initGLScene(); };
window.addEventListener("resize", function() { resize(); });

function initGLScene() {
    canvas = <HTMLCanvasElement>document.getElementById("scene");
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

var renderLoop = function() {
    // Start new frame
    engine.beginFrame();
    scene.render();
    // Present
    engine.endFrame();
    // Register new frame
    BABYLON.Tools.QueueNewFrame(renderLoop);
};

var update = function() {
    delta_time = engine.getDeltaTime() * 0.001;
    time += delta_time;

    // compute mouse world coord
    var pick_info = scene.pick(mouseX, mouseY, function(mesh) { return mesh.name == "floor"; });
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

function onPointerMove(evt: any) {
    mouseX = evt.clientX;
    mouseY = evt.clientY;
}
function onPointerUp(evt: any) {
}
function onPointerDown(evt: any) {
}


// TOOLS
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

function interpolate(start: number, end: number, ratio: number) {
    var clamp_ratio = clamp(ratio, 0, 1);
    return start * (1 - clamp_ratio) + end * clamp_ratio;
}

var EasingFunctions = {
    // no easing, no acceleration
    linear: function(t) { return t; },
    // accelerating from zero velocity
    easeInQuad: function(t) { return t * t; },
    // decelerating to zero velocity
    easeOutQuad: function(t) { return t * (2 - t); },
    // acceleration until halfway, then deceleration
    easeInOutQuad: function(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    // accelerating from zero velocity 
    easeInCubic: function(t) { return t * t * t; },
    // decelerating to zero velocity 
    easeOutCubic: function(t) { return (--t) * t * t + 1; },
    // acceleration until halfway, then deceleration 
    easeInOutCubic: function(t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; },
    // accelerating from zero velocity 
    easeInQuart: function(t) { return t * t * t * t; },
    // decelerating to zero velocity 
    easeOutQuart: function(t) { return 1 - (--t) * t * t * t; },
    // acceleration until halfway, then deceleration
    easeInOutQuart: function(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t; },
    // accelerating from zero velocity
    easeInQuint: function(t) { return t * t * t * t * t; },
    // decelerating to zero velocity
    easeOutQuint: function(t) { return 1 + (--t) * t * t * t * t; },
    // acceleration until halfway, then deceleration 
    easeInOutQuint: function(t) { return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t; }
};