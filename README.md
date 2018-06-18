# collada-exporter-js

[![npm version](https://badge.fury.io/js/collada-exporter.svg)](https://www.npmjs.com/package/collada-exporter)

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

### ColladaExporter.parse(object, options)

Converts the provided object tree into a collada file and associated textures. Returns on object with the `dae` file data in `data` and the textures in an array with a name in data in `textures`.

##### options.version

The Collada file version to export. `1.4.1` and `1.5.0` are the only valid values.

Defaults to `1.4.1`.

### ColladaArchiveExporter.parse(object, onComplete)

Writes the processed `dae`, `textures`, and `manifest.xml` file to a zip format to align with the `zae` Collada format. Requires the ColladaExporter and JSZip.

## Limitations

- Can only model geometry, materials, and textures. Animations, skinning, joints, kinematics and other features are not included.
- Only `phong` (default), `lambert`, and `constant` material tags are supported ([issue](https://github.com/gkjohnson/collada-exporter-js/issues/4)).
- Only diffuse texture maps are support for export ([issue](https://github.com/gkjohnson/collada-exporter-js/issues/5)).
- Only diffuse texture maps cannot be exported with a tint color (per the spec).
- MeshLab has problems importing attributes with shared index offsets ([issue](https://github.com/gkjohnson/collada-exporter-js/issues/8)).
