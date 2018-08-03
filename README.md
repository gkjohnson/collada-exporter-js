# collada-exporter-js

[![npm version](https://badge.fury.io/js/collada-exporter.svg)](https://www.npmjs.com/package/collada-exporter)

Collada / DAE Format exporter for THREE js geometry. The format is described [here](https://www.khronos.org/collada/).

This exporter is included in the THREE.js examples folder [here](https://github.com/mrdoob/three.js/blob/dev/examples/js/exporters/ColladaExporter.js).

## Use

```js
var geometry, mesh;
// ...create geometry to export...

var exporter = new THREE.ColladaExporter();

// Form the file content based on the mesh
// and geometry within
var { data, textures } = exporter.parse(mesh);

// save the files!
const zip = new JSZip();
zip.file( 'myCollada.dae', data.data );
data.textures.forEach( tex => zip.file( `${ t.directory }${ tex.name }.${ tex.ext }`, tex.data ) );

```

### ColladaExporter.parse(object, onDone, options)

Converts the provided object tree into a collada file and associated textures. Returns the following object:
```js
{
	// Collada file content
	data: "",

	// List of referenced texures
	textures: [{

		// File directory, name, and extension of the texture data
		directory: "",
		name: "",
		ext: "",

		// The texture data and original texture object
		data: [],
		original: <THREE.Texture>
	}, ...]
}
```

#### object

The object to export as a Collada file.

#### onDone

An optional callback for when the model has completed being processed. The same data is returned from the function.

#### options
##### options.version

The Collada file version to export. `1.4.1` and `1.5.0` are the only valid values.

Defaults to `1.4.1`.

##### options.author

The author to include in the header. Excluded if `null`.

Defaults to `null`.

##### options.textureDirectory

The directory relative to the dae file that the textures should be saved to.

Defaults to `''`, or next to the Collada file.

### ColladaArchiveExporter.parse(object, onDone, options)

Writes the processed `dae`, `textures`, and `manifest.xml` file to a zip format to align with the `zae` Collada format. Requires the ColladaExporter and JSZip.

## Limitations

- Can only export model geometry, materials, and textures. Animations, skinning, joints, kinematics and other features are not included ([issue](https://github.com/gkjohnson/collada-exporter-js/issues/4)).
- Only `phong` (default), `lambert`, and `constant` material tags are supported.
- Only diffuse, specular, and emission maps are supported for export.
- Diffuse maps cannot be exported with a tint color (per the spec).
- MeshLab has problems importing attributes with shared index offsets ([issue](https://github.com/gkjohnson/collada-exporter-js/issues/8)).
