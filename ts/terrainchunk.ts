/// <reference path="app.ts"/>
/// <reference path="es6-promise.d.ts"/>

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
	static WIDTH = 4;			// in meters
	static HEIGHT = 16;
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
		for(var x = 0; x < count_wide; x++) {
			this.chunk_data[x] = new Array(count_wide);
			voxel_x = x * SolidVoxel.SIZE + tfor_x;
			for(var z = 0; z < count_wide; z++) {
				this.chunk_data[x][z] = new Array(count_high);
				voxel_z = z * SolidVoxel.SIZE + tfor_z;
				for(var y = 0; y < count_high; y++) {
					voxel_y = y * SolidVoxel.SIZE;
					this.chunk_data[x][z][y] = generator.getSolidVoxelType(voxel_x, voxel_y, voxel_z);
				}
			}
		}

		// build chunk meshes for the first time
		this.askChunkMeshRebuild();
	}

	static common_root;

	// indices are coordinates x, z, y (altitude)
	// data is the solid voxel type (empty is 0) of the current voxel
	chunk_data: SolidVoxelType[][][];

	// these are particles currently located in the chunk
	particles: any[];

	// this is the visible chunk mesh
	visible_mesh: BABYLON.Mesh;

	// this mesh is build according to voxels in the chunk
	// used for entity navigation (invisible)
	navigation_mesh: BABYLON.Mesh;

	// launches the rebuild task asynchronously
	askChunkMeshRebuild() {
		var me = this;
		// setTimeout(function() {
		// 	me._rebuildChunkMeshAsync();
		// }, 0);

		if(!chunkRebuildPromise) {
			// initialize the promise
			chunkRebuildPromise = this._rebuildChunkMeshPromise();
		} else {
			// queue the rebuild operation
			chunkRebuildPromise.then(function () {
				me._rebuildChunkMeshPromise();
			});
		}
	}

	// this rebuilds the visible mesh; returns a promise
	private _rebuildChunkMeshPromise(): Promise<void> {
		var me = this;

		return new Promise<void>(function (resolve, reject) {
			setTimeout(function () {
				me._rebuildChunkMesh();
				resolve();
			}, 0);
		});

	}

	// does the actual chunk rebuilding; must be wrapped in a promise
	private _rebuildChunkMesh() {

		//console.log("rebuilding mesh at x:"+me.tfor_x+" z:"+me.tfor_z);
		Timer.start();

		// clear existing mesh
		if(this.visible_mesh) { this.visible_mesh.dispose(); }

		var meshes = [];	// list of meshes to merge
		var voxel_mesh: BABYLON.Mesh;
		var base_type: SolidVoxelType, current_type: SolidVoxelType;
		var base_y, current_y;

		// mesh building is done in columns

		for(var x = 0; x < this.chunk_data.length; x++) {
			for(var z = 0; z < this.chunk_data[x].length; z++) {

				// starting at y=0, check for how long the voxel type is similar
				base_y = 0;
				base_type = this.chunk_data[x][z][base_y];

				for(current_y = 0; current_y < this.chunk_data[x][z].length; current_y++) {

					current_type = this.chunk_data[x][z][current_y];

					// voxels are different (or we reached the top of the chunk): generate a mesh
					if(current_type != base_type || current_y == this.chunk_data[x][z].length - 1) {

						// only generate mesh if it's not empty
						if(base_type != SolidVoxel.TYPE_EMPTY) {
							voxel_mesh = BABYLON.Mesh.CreateBox("chunk", SolidVoxel.SIZE, scene);
							voxel_mesh.scaling.y = current_y - base_y;
							voxel_mesh.position.x = SolidVoxel.SIZE * (x + 0.5);
							voxel_mesh.position.y = SolidVoxel.SIZE * (base_y + (current_y - base_y) * 0.5);
							voxel_mesh.position.z = SolidVoxel.SIZE * (z + 0.5);
							voxel_mesh.bakeCurrentTransformIntoVertices();
							setMeshColor(voxel_mesh, base_type.color);
							meshes.push(voxel_mesh);
						}

						// save new base type
						base_type = current_type;
						base_y = current_y;

					}

				}

			}
		}

		var mesh = BABYLON.Mesh.MergeMeshes(meshes, true, true);
		mesh.parent = TerrainChunk.common_root;

		this.visible_mesh = mesh;
		this.visible_mesh.position.x = this.tfor_x;
		this.visible_mesh.position.z = this.tfor_z;

		//console.log("rebuilding mesh at x:"+me.tfor_x+" z:"+me.tfor_z+" -- END");
		Timer.end('chunk_rebuild');

	}

	// this rebuilds the navigation mesh
	rebuildNavigationMesh() {

		// todo

	}

}


// this object handles the queueing of chunk rebuilds
//var chunkRebuildManager = { };

var chunkRebuildPromise: Promise<void>;
