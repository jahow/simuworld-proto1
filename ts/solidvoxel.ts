interface SolidVoxelType {
	empty?: boolean;		// if true, no mesh displayed
	color?: BABYLON.Color3;
}

class SolidVoxel {

	// const
	static SIZE = 0.25;		// 4 voxels make up one meter

	// types
	static TYPE_EMPTY: SolidVoxelType = {
		empty: true
	};
	static TYPE_DIRT: SolidVoxelType = {
		color: new BABYLON.Color3(0.9, 0.9, 0.4)
	};
	static TYPE_ROCK: SolidVoxelType = {
		color: new BABYLON.Color3(0.4, 0.35, 0.15)
	};
	static TYPE_GRASS: SolidVoxelType = {
		color: new BABYLON.Color3(0.2, 0.95, 0.3)
	};

}