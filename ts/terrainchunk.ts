// Chunks are small pieces of land
// they consist of one mesh and thus are drawn by a single call
// they hold raw voxel data and maintain a mesh built according to those data
// they also hold a navigatable mesh that sits "on top" of the voxels
// solid voxels are stored in the chunk_data array
// particles (liquid voxels) are stored in the particles array

// chunk meshes are attached to a common root, and positioned according
// to their coordinates in the terrain frame of reference (TFOR)



class TerrainChunk {

	// constants
	static WIDTH = 2;			// in meters
	static HEIGHT = 8;
	static SUBDIVISIONS = 4;	// used for walkable mesh

	// coordinates in the TFOR
	constructor(public tfor_x: number, public tfor_z: number, generator: TerrainGenerator) {

		// common root initialization
		if(!TerrainChunk.common_root) {
			TerrainChunk.common_root = new BABYLON.Mesh("chunks_root", scene)
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
		this.rebuildChunkMesh();
	}

	static common_root;

	// indices are coordinates x, z, y (altitude)
	// data is the solid voxel type (empty is 0) of the current voxel
	chunk_data: number[][][];

	// these are particles currently located in the chunk
	particles: any[];

	// this is the visible chunk mesh
	visible_mesh: BABYLON.Mesh;

	// this mesh is build according to voxels in the chunk
	// used for entity navigation (invisible)
	navigation_mesh: BABYLON.Mesh;

	// this rebuilds the visible mesh
	rebuildChunkMesh() {

		// temp
		/*
		var mesh = BABYLON.Mesh.CreateBox("chunk", TerrainChunk.WIDTH, scene, TerrainChunk.common_root);
		mesh.position.x = TerrainChunk.WIDTH / 2;
		mesh.position.z = TerrainChunk.WIDTH / 2;
		mesh.position.y = TerrainChunk.WIDTH / 2;
		mesh.bakeCurrentTransformIntoVertices();
		*/

		var meshes = [];	// list of meshes to merge
		var voxel_mesh: BABYLON.Mesh;

		for (var x = 0; x < this.chunk_data.length; x++) {
			for (var z = 0; z < this.chunk_data[x].length; z++) {
				for (var y = 0; y < this.chunk_data[x][z].length; y++) {
					if (this.chunk_data[x][z][y] == SolidVoxel.TYPE_EMPTY) { continue; }

					voxel_mesh = BABYLON.Mesh.CreateBox("chunk", SolidVoxel.SIZE, scene);
					voxel_mesh.position.x = SolidVoxel.SIZE * (x + 0.5);
					voxel_mesh.position.y = SolidVoxel.SIZE * (y + 0.5);
					voxel_mesh.position.z = SolidVoxel.SIZE * (z + 0.5);
					voxel_mesh.bakeCurrentTransformIntoVertices();
					meshes.push(voxel_mesh);
				}
			}
		}

		var mesh = BABYLON.Mesh.MergeMeshes(meshes, true, true);
		mesh.parent = TerrainChunk.common_root;

		this.visible_mesh = mesh;
		this.visible_mesh.position.x = this.tfor_x;
		this.visible_mesh.position.z = this.tfor_z;
	}

	// this rebuilds the navigation mesh
	rebuildNavigationMesh() {

		// todo

	}

}
