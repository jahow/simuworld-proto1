/// <reference path="app.ts"/>
/// <reference path="terrainchunk.ts"/>

// This object (singleton) handles generating and releasing terrain chunks on the fly
// It also allows terrain modification spanning across multiple chunks

class Environment {

	private static _inst;
	private static _getInstance(): Environment {
		if(!Environment._inst) { Environment._inst = new Environment(); }
		return Environment._inst;
	}

	// this is a collection of all the loaded chunks
	// keys are string like so: "X:Z" where X and Z are the chunk's coordinates in the terrain frame of ref.
	private chunks_collection: {[id: string]: TerrainChunk} = {};		

	// this is the center of the displayed area
	private _displayed_center = new BABYLON.Vector3(0, 0, 0);

	// this is what's used to generate terrain
	private _generator = new TerrainGenerator();

	constructor() {

	}

	public static init() {

	}

	public static update() {

		var inst = Environment._getInstance();

		// checks that we loaded chunks around the display center
		var size = 15;
		var start_coord = Environment.getChunkCoordinates(inst._displayed_center.x - size,
			inst._displayed_center.z - size);
		var end_coord = Environment.getChunkCoordinates(inst._displayed_center.x + size,
			inst._displayed_center.z + size);

		var i, j;
		for(i = start_coord.x; i <= end_coord.x; i += TerrainChunk.WIDTH) {
			for(j = start_coord.z; j <= end_coord.z; j += TerrainChunk.WIDTH) {
				inst.generateChunkAt(i, j);
			}			
		}

	}

	// makes sure the chunk exists
	private generateChunkAt(tfor_x: number, tfor_z: number): TerrainChunk {
		var chunk = Environment.getChunkAt(tfor_x, tfor_z);
		if(!chunk) {
			var chunk_coord = Environment.getChunkCoordinates(tfor_x, tfor_z);
			chunk = new TerrainChunk(chunk_coord.x, chunk_coord.z, this._generator);
			this.chunks_collection[chunk_coord.x+':'+chunk_coord.z] = chunk;
				
		}
		return chunk;
	}




	// PUBLIC METHODS

	public static getChunkAt(tfor_x: number, tfor_z: number): TerrainChunk {
		var inst = Environment._getInstance();
		var chunk_x = Math.floor(tfor_x / TerrainChunk.WIDTH) * TerrainChunk.WIDTH;
		var chunk_z = Math.floor(tfor_z / TerrainChunk.WIDTH) * TerrainChunk.WIDTH;
		var chunk = inst.chunks_collection[chunk_x+':'+chunk_z];
		return chunk;
	}

	public static getChunkCoordinates(tfor_x: number, tfor_z: number): { x: number, z: number} {
		return {
			x: Math.floor(tfor_x / TerrainChunk.WIDTH) * TerrainChunk.WIDTH,
			z: Math.floor(tfor_z / TerrainChunk.WIDTH) * TerrainChunk.WIDTH
		}
	}

	public static carveTerrain(x: number, y: number, z: number, radius: number) {

		// find out which chunks are impacted
		var chunks = [];
		var start_coord = Environment.getChunkCoordinates(x - radius, z - radius);
		var end_coord = Environment.getChunkCoordinates(x + radius, z + radius);
		var i, j, chunk;
		for(i = start_coord.x; i <= end_coord.x; i += TerrainChunk.WIDTH) {
			for(j = start_coord.z; j <= end_coord.z; j += TerrainChunk.WIDTH) {
				chunk = Environment.getChunkAt(i, j);
				if(!chunk) { continue; }
				chunks.push(chunk);
			}			
		}

		// for each chunk, do the modification
		for(i=0; i<chunks.length; i++) {
			chunks[i].carveTerrain(x, y, z, radius);
		}
	}
}