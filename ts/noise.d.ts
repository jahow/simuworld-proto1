declare var noise: {
  simplex2(x: number, y: number): number;
  simplex3(x: number, y: number, z: number): number;
  perlin2(x: number, y: number): number;
  perlin3(x: number, y: number, z: number): number
  seed(val: number): number;
};