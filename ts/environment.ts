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

	public getChunkAt(tfor_x: number, tfor_z: number): TerrainChunk {
		var inst = Environment._getInstance();
		var chunk_x = Math.floor(tfor_x / TerrainChunk.WIDTH) * TerrainChunk.WIDTH;
		var chunk_z = Math.floor(tfor_z / TerrainChunk.WIDTH) * TerrainChunk.WIDTH;
		var chunk = inst.chunks_collection[chunk_x+':'+chunk_z];
		return chunk;
	}

}