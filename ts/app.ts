/// <reference path="../bower_components/babylonjs/dist/babylon.2.2.d.ts"/>
/// <reference path="terraingenerator.ts"/>
/// <reference path="environment.ts"/>

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
	camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, 0.95, 35, new BABYLON.Vector3(0, 0, 0), scene);
	adjustCameraFov();
	camera.attachControl(canvas);

	scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

	var light = new BABYLON.HemisphericLight("light0", new BABYLON.Vector3(0.25, 1, 0), scene);
	light.diffuse = new BABYLON.Color3(1, 1, 1);
	light.groundColor = new BABYLON.Color3(0.35, 0.35, 0.35);
	light.specular = new BABYLON.Color3(0, 0, 0);

	// add input events
	document.addEventListener("pointerdown", onPointerDown, false);
	document.addEventListener("pointermove", onPointerMove, false);
	document.addEventListener("pointerup", onPointerUp, false);
	document.addEventListener("pointerout", onPointerUp, false);

	//var ssao = new BABYLON.SSAORenderingPipeline("ssao", scene, 2, [camera]);

	// temp
	/*
	var generator = new TerrainGenerator();
	for (var i = -10; i < 10; i++) {
		for (var j = -10; j < 10; j++) {
			new TerrainChunk(i * TerrainChunk.WIDTH, j * TerrainChunk.WIDTH, generator);
		}
	}
	*/
	Environment.init();

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

	Environment.update();

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

	
    // picking
    var pickResult = scene.pick(scene.pointerX, scene.pointerY);
    if(pickResult.hit) {

        // when clicked, destroy a part of the environment
        //Environment.carveTerrain(pickResult.pickedPoint.x, pickResult.pickedPoint.y, pickResult.pickedPoint.z, 0.5);

    }
}
function onPointerUp(evt: any) {
}
function onPointerDown(evt: any) {

    // picking
    var pickResult = scene.pick(scene.pointerX, scene.pointerY);
    if(pickResult.hit) {

        // when clicked, destroy a part of the environment
        //Environment.carveTerrain(pickResult.pickedPoint.x, pickResult.pickedPoint.y, pickResult.pickedPoint.z, 0.5);

    }

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

function setMeshColor(mesh: BABYLON.Mesh, value: BABYLON.Color3) {
	var colors = [];
	var count = mesh.getTotalVertices() * 4;
	var i;
	for(i=0; i<count; i+=4) {
		colors[i] = value.r;
		colors[i+1] = value.g;
		colors[i+2] = value.b;
		colors[i+3] = 1;
	}

	mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
}

class Timer {
	private static _inst;
	private _start_time = -1;

	private _recorded_durations = {};	// key is label, value is an array of int (msec)
	private _recorded_amount = {};   	// key is label, value is an int (count)
	private _recorded_total = {};   	// key is label, value is an int (msec)

	private static _getInstance(): Timer {
		if (!Timer._inst) { Timer._inst = new Timer(); }
		return Timer._inst;
	}

	static start() {
		var timer = Timer._getInstance();
		timer._start_time = new Date().getTime();
	}

	static end(label: string) {
		var timer = Timer._getInstance();
		var delta = new Date().getTime() - timer._start_time;
		//delta *= 0.001;

		// init
		if(!timer._recorded_durations[label]) {
			timer._recorded_durations[label] = [];
			timer._recorded_amount[label] = 0;
			timer._recorded_total[label] = 0;
		}

		// save data
		timer._recorded_durations[label].push(delta);
		timer._recorded_amount[label]++;
		timer._recorded_total[label] += delta;
	}

	// returns a float (msec)
	static getAverage(label: string): number {
		var timer = Timer._getInstance();
		if(!timer._recorded_durations[label]) {
			console.error("Timer: no time saved under label '"+label+"'");
			return 0;
		}
		return timer._recorded_total[label] / timer._recorded_amount[label];
	}
}