/// <reference path="app.ts"/>
/// <reference path="meshbuilder.ts"/>
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
	chunk_data: number[][][];

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
				me._rebuildVisibleChunkMesh();

				resolve();
			}, 0);
		});

	}

	// does the actual chunk rebuilding
	private _rebuildVisibleChunkMesh() {

		//console.log("rebuilding mesh at x:"+me.tfor_x+" z:"+me.tfor_z);
		Timer.start();

		// clear existing mesh
		if(this.visible_mesh) { this.visible_mesh.dispose(); }

		// temp vars
		var d0;					// which axis we're on
		var d1, d2;				// secondary axis
		var mask: Uint8Array;	// each value holds if there is a visible voxel as back_type and/or front_type
		var dims = [			// chunk dimensions
			this.chunk_data.length,
			this.chunk_data[0][0].length,
			this.chunk_data[0].length
		];
		var i = [0, 0, 0];		// current voxel indices
		var j, k, l, m;
		var inc = [0, 0, 0];	// increment on main axis
		var type_current, type_forward, type_backward, type_other;	// these are numbers
		var width, height;		// dimension of the current quad
		var byte_mask;
		var s = SolidVoxel.SIZE;	// shortcut
		var du = [0, 0, 0], dv = [0, 0, 0];		// used to build the quads
		var ou = [0, 0, 0], ov = [0, 0, 0];		// offset for quads
		var do_break: boolean;

		var v1 = new BABYLON.Vector3(0, 0, 0);
		var v2 = new BABYLON.Vector3(0, 0, 0);
		var v3 = new BABYLON.Vector3(0, 0, 0);
		var v4 = new BABYLON.Vector3(0, 0, 0);
		var v_shift = new BABYLON.Vector3(0, 0, 0);
		var normal = new BABYLON.Vector3(0, 0, 0);

		// start mesh building, planning 40 quads min
		MeshBuilder.startMesh(160, 80);

		// loop on 3 axis
		for(d0 = 0; d0 < 3; d0++) {

			// compute secondary directions
			d1 = (d0+1)%3; d2 = (d0+2)%3;

			// compute increment on main axis
			inc[d0] = 1;
			inc[d1] = 0;
			inc[d2] = 0;

			// traverse the chunk in the current axis
			for(i[d0] = 0; i[d0] < dims[d0]; i[d0]++) {

				// init mask
				mask = new Uint8Array(dims[d1]*dims[d2]);

				// fill up the mask
				for(i[d1] = 0; i[d1] < dims[d1]; i[d1]++) {
				for(i[d2] = 0; i[d2] < dims[d2]; i[d2]++) {
					type_current = this._getVoxelType(i[0], i[1], i[2]);
					type_forward = this._getVoxelType(i[0]+inc[0], i[1]+inc[1], i[2]+inc[2]);
					type_backward = this._getVoxelType(i[0]-inc[0], i[1]-inc[1], i[2]-inc[2]);
					mask[i[d1] * dims[d2] + i[d2]] =
						(type_current && !type_forward ? 1 : 0)
						| (type_current && !type_backward ? 2 : 0);
				}
				}

				// generate quads based on mask
				for(j = 0; j < dims[d1]; j++) {
				for(k = 0; k < dims[d2]; k++) {

				// handle mask for forward and backward values
				for(byte_mask = 1; byte_mask <= 2; byte_mask++) {

					// skip if mask is unset here
					if( !(mask[j * dims[d2] + k] & byte_mask) ) { continue; }

					i[d1] = j; i[d2] = k;
					type_current = this._getVoxelType(i[0], i[1], i[2]);

					// extend width
					width = 1;
					while(j+width < dims[d1] && (mask[(j+width)*dims[d2]+k] & byte_mask) ) {

						// check that type is consistent
						i[d1] = j+width; i[d2] = k;
						type_other = this._getVoxelType(i[0], i[1], i[2]);
						if(type_other != type_current) { break; }

						width++;
					}

					// extend height
					height = 1;
					while(k+height < dims[d2]) {
						// check if line is still valid
						do_break = false;
						for(l = j; l < j+width; l++) {
							if( !(mask[l*dims[d2]+k+height] & byte_mask) ) { do_break = true; break; }

							// check that type is consistent
							i[d1] = l; i[d2] = k+height;
							type_other = this._getVoxelType(i[0], i[1], i[2]);
							if(type_other != type_current) { do_break = true; break; }
						}
						if(do_break) { break;}
						height++;
					}

					// generate quad
					i[d1] = j; i[d2] = k;
					ou[d0] = 0; 	ou[d1] = 0; 		ou[d2] = -s*0.5;
					ov[d0] = 0; 	ov[d1] = -s*0.5; 	ov[d2] = 0;
					du[d0] = 0; 	du[d1] = 0; 			du[d2] = s*(height-0.5);
					dv[d0] = 0; 	dv[d1] = s*(width-0.5); dv[d2] = 0;
					v1.copyFromFloats( s*i[0]+ou[0]+ov[0],	s*i[1]+ou[1]+ov[1], 	s*i[2]+ou[2]+ov[2]	);
					v2.copyFromFloats( s*i[0]+du[0]+ov[0], 	s*i[1]+du[1]+ov[1], 	s*i[2]+du[2]+ov[2]	);
					v3.copyFromFloats( s*i[0]+du[0]+dv[0],	s*i[1]+du[1]+dv[1],		s*i[2]+du[2]+dv[2] 	);
					v4.copyFromFloats( s*i[0]+ou[0]+dv[0],	s*i[1]+ou[1]+dv[1],		s*i[2]+ou[2]+dv[2]	);

					v_shift.copyFromFloats(s*inc[0]*0.5, s*inc[1]*0.5, s*inc[2]*0.5);
					normal.copyFromFloats(inc[0], inc[1], inc[2]);

					// shift and assign vertices according to direction
					if(byte_mask == 1) {
						v1.addInPlace(v_shift);
						v2.addInPlace(v_shift);
						v3.addInPlace(v_shift);
						v4.addInPlace(v_shift);
						MeshBuilder.addQuad(v1, v2, v3, v4,
							SolidVoxel.getTypeData(type_current).color,
							normal);
					}
					else {
						normal.scaleInPlace(-1);
						v1.subtractInPlace(v_shift);
						v2.subtractInPlace(v_shift);
						v3.subtractInPlace(v_shift);
						v4.subtractInPlace(v_shift);
						MeshBuilder.addQuad(v1, v4, v3, v2,
							SolidVoxel.getTypeData(type_current).color,
							normal);
					}

					// zero out region
					for(l = j; l < j+width; l++) {
					for(m = k; m < k+height; m++) {
						mask[l * dims[d2] + m] = mask[l * dims[d2] + m] & ~byte_mask;
					}
					}

				}

				}
				}


			}

		}

		this.visible_mesh = MeshBuilder.endMesh("chunk", scene, TerrainChunk.common_root);
		this.visible_mesh.position.x = this.tfor_x;
		this.visible_mesh.position.z = this.tfor_z;
		this.visible_mesh.isPickable = true;

		//console.log("rebuilding mesh at x:"+me.tfor_x+" z:"+me.tfor_z+" -- END");
		Timer.end('chunk_rebuild');

	}

	// this rebuilds the navigation mesh
	rebuildNavigationMesh() {

		// todo

	}

	// helpers
	private _getVoxelType(x, y, z): number {
		if(x < 0 || x >= this.chunk_data.length ||
			z < 0 || z >= this.chunk_data[0].length ||
			y < 0 || y >= this.chunk_data[0][0].length) {
			return SolidVoxel.TYPE_EMPTY;
		}
		return this.chunk_data[x][z][y];
	}

}


// this object handles the queueing of chunk rebuilds
//var chunkRebuildManager = { };
var chunkRebuildPromise: Promise<void>;



// temporary vars
var tmp0=0, tmp1=0, tmp2=0, tmp3=0, tmp4=0;
var tmpX=0, tmpY=0, tmpZ=0;
var tmpArray = [];
