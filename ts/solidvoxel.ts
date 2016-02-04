interface SolidVoxelData {
	empty?: boolean;		// if true, no mesh displayed
	color?: BABYLON.Color3;
}


class SolidVoxel {

	// const
	static SIZE = 0.25;		// 4 voxels make up one meter

	// types
	static TYPE_EMPTY = 0;
	static TYPE_DIRT = 1;
	static TYPE_ROCK = 2;
	static TYPE_GRASS = 3;

	// type data
	private static types_data: SolidVoxelData[] = [

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

	static getTypeData(type: number): SolidVoxelData { return SolidVoxel.types_data[type]; }

}