/// <reference path="noise.d.ts"/>

// Terrain generators are objects that answer the question:
// "what voxel is there at coordinates x,y,z?"
// They just give the 'natural' state of the world, ie before modifications

class TerrainGenerator {

	constructor() {

	}

	// returns a SolidVoxel.TYPE_* constant
	// coordinates are in the Terrain Frame of Reference (TFOR)
	getSolidVoxelType(x: number, y: number, z: number) : number {


		// under altitude, return dirt and rock
		// else, return empty

		var altitude = 1.0 + 0.8 * noise.perlin2(x * 0.2, z * 0.2);

		if (y > altitude) { return SolidVoxel.TYPE_EMPTY; }
		else {

			if (y < altitude * 0.8) { return SolidVoxel.TYPE_ROCK; }
			else { return SolidVoxel.TYPE_DIRT; }

		}
	}

}