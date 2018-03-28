**IN PROGRESS**

# collada-exporter-js

Collada / DAE Format exporter for THREE js geometry. The format is described [here](https://www.khronos.org/collada/).

## Use

```js
var geometry, mesh;
// ...create geometry to export...

var exporter = new THREE.ColladaExporter();

// Form the file content based on the mesh
// and geometry within
var { data, textures } = exporter.parse(mesh);

// save the files!

```

#### ColladaExporter.parse(object)

Converts the provided object tree into a collada file and associated textures. Returns on object with the `dae` file data in `data` and the textures in an array with a name in data in `textures`.

## Limitations

- Can only model geometry, materials, and textures. Animations, skinning, joints, kinematics and other features are not included.
- Only `phong` (default), `lambert`, and `constant` material tags are supported.
- Only diffuse texture maps are support for export.
- Only diffuse texture maps cannot be exported with a tint color (per the spec).

## Resources
[DAE Format Specification](https://www.khronos.org/collada/)

[Example Cube DAE Model](http://gis.zcu.cz/projekty/3DGIS/HelloCube/DAE/dae.html)

[Example Elf DAE Model](https://github.com/mrdoob/three.js/tree/dev/examples/models/collada/elf)
