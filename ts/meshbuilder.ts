/// <reference path="../bower_components/babylonjs/dist/babylon.2.2.d.ts"/>

// This is a utility class that produces a mesh by building it
// step by step with simple operations: add quad, etc.

class MeshBuilder {

	// singleton pattern
	private static _inst: MeshBuilder;
	private static _getInstance(): MeshBuilder {
		if(!MeshBuilder._inst) { MeshBuilder._inst = new MeshBuilder(); }
		return MeshBuilder._inst;
	}

	// current mesh data
	private _positions: number[];
	private _colors: number[];
	private _normals: number[];
	private _indices: number[];
	private _vertex_position: number;	// positions in the arrays
	private _triangle_position: number;

	// temporary vars
	private _v1 = new BABYLON.Vector3(0, 0, 0);
	private _v2 = new BABYLON.Vector3(0, 0, 0);
	private _v3 = new BABYLON.Vector3(0, 0, 0);
	private _i1 = 0;
	private _i2 = 0;
	private _i3 = 0;


	// vertex and index counts are used to allocate an array large enough if possible
	// if unknown, leave blank
	public static startMesh(vertex_count?, triangle_count?) {
		var builder = MeshBuilder._getInstance();
		if(!vertex_count) { vertex_count = 0; }
		if(!triangle_count) { triangle_count = 0; }

		// init
		builder._positions = new Array<number>(vertex_count * 3);
		builder._normals = new Array<number>(vertex_count * 3);
		builder._colors = new Array<number>(vertex_count * 4);
		builder._indices = new Array<number>(triangle_count * 3);
		builder._vertex_position = 0;
		builder._triangle_position = 0;

	}

	// finalize mesh and return it
	public static endMesh(name: string, scene: BABYLON.Scene, parent?: BABYLON.Node): BABYLON.Mesh {
		var builder = MeshBuilder._getInstance();
		var mesh = new BABYLON.Mesh(name, scene, parent);

		mesh.setIndices(builder._indices);
		mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, builder._positions);
		mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, builder._colors);
		mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, builder._normals);

		return mesh;
	}


	// MESH BUILDING

	public static addVertex(pos: BABYLON.Vector3, norm: BABYLON.Vector3,
							col?: BABYLON.Color4 | BABYLON.Color3) {
		if(!col) { col = new BABYLON.Color4(1, 1, 1, 1); }

		var builder = MeshBuilder._getInstance();
		builder._addToArray(builder._positions,
			[pos.x, pos.y, pos.z], builder._vertex_position*3);
		builder._addToArray(builder._normals,
			[norm.x, norm.y, norm.z], builder._vertex_position*3);
		builder._addToArray(builder._colors,
			[col.r, col.g, col.b, (col['a'] ? col['a'] : 1)], builder._vertex_position*4);
		builder._vertex_position += 1;
	}

	// normals are perpendicular to the triangle
	// anti-clockwise: v1, v2, v3
	public static addTriangle(v1: BABYLON.Vector3, v2: BABYLON.Vector3,
						v3: BABYLON.Vector3, color?: BABYLON.Color4 | BABYLON.Color3) {
		var builder = MeshBuilder._getInstance();
		builder._i1 = builder._vertex_position;
		builder._v1.copyFrom(v3).subtractInPlace(v1);
		builder._v2.copyFrom(v2).subtractInPlace(v1);
		BABYLON.Vector3.CrossToRef(builder._v1, builder._v2, builder._v3);
		builder._v3.normalize();

		MeshBuilder.addVertex(v1, builder._v3, color);
		MeshBuilder.addVertex(v2, builder._v3, color);
		MeshBuilder.addVertex(v3, builder._v3, color);
		builder._addToArray(builder._indices,
			[builder._i1, builder._i1+1, builder._i1+2], builder._triangle_position*3);
		builder._triangle_position += 1;
	}

	// normals a perpendicular to the vectors v1v2 and v1v4
	// anti-clockwise: v1, v2, v3, v4
	// normal is optional
	public static addQuad(v1: BABYLON.Vector3, v2: BABYLON.Vector3,
						v3: BABYLON.Vector3, v4: BABYLON.Vector3,
						color?: BABYLON.Color4 | BABYLON.Color3,
						normal?: BABYLON.Vector3) {

		var builder = MeshBuilder._getInstance();
		builder._i1 = builder._vertex_position;
		if(!normal) {
			builder._v1.copyFrom(v4).subtractInPlace(v1);
			builder._v2.copyFrom(v2).subtractInPlace(v1);
			BABYLON.Vector3.CrossToRef(builder._v1, builder._v2, builder._v3);
			builder._v3.normalize();
			normal = builder._v3;
		}

		MeshBuilder.addVertex(v1, normal, color);
		MeshBuilder.addVertex(v2, normal, color);
		MeshBuilder.addVertex(v3, normal, color);
		MeshBuilder.addVertex(v4, normal, color);
		builder._addToArray(builder._indices,
			[	builder._i1, builder._i1+1, builder._i1+2,
				builder._i1, builder._i1+2, builder._i1+3	],
			builder._triangle_position*3);
		builder._triangle_position += 2;

	}


	// helper
	private _addToArray(array: number[], values: number | number[], index) {

		if(typeof values === "number") {
			if(array.length <= index) { array.push(values); }
			else { array[index] = values; }
			return;
		}

		if(values instanceof Array) {
			for(var i=0; i<values.length; i++) {
				this._addToArray(array, values[i], index+i);
			}
			return;
		}
	}

}