/// <reference path="noise.d.ts"/>
/// <reference path="solidvoxel.ts"/>

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

		var altitude = 2.0 + 0.9 * noise.perlin2(x * 0.1, z * 0.1) +
							 0.45 * noise.perlin2(x * 0.2, z * 0.2);
		var altitude2 = 1.1 + 0.5 * noise.perlin2(x * 0.05 + 100, z * 0.05 + 100);
		var grass = noise.perlin2(x * 0.2 + 1000, z * 0.2 + 100) +
					0.33 * noise.perlin2(x * 0.6 + 1000, z * 0.6 + 100) +
					0.167 * noise.perlin2(x * 0.9 + 1000, z * 0.9 + 100);

		if (y > altitude) { return SolidVoxel.TYPE_EMPTY; }
		else {

			if (y < altitude2) { return SolidVoxel.TYPE_ROCK; }
			else {
				if(y > altitude - 0.4 && grass > 0.35) { return SolidVoxel.TYPE_GRASS; }
				return SolidVoxel.TYPE_DIRT;
			}

		}
	}

}