// https://stackoverflow.com/questions/19327749/javascript-blob-filename-without-link
var saveData = ( function () {

	var a = document.createElement( 'a' );
	document.body.appendChild( a );
	a.style = 'display: none';
	return function ( data, fileName ) {
		var blob = new Blob( [ data ], { type: 'octet/stream' } ),
			url = window.URL.createObjectURL( blob );
		a.href = url;
		a.download = fileName;
		a.click();
		window.URL.revokeObjectURL( url );

	};

} )();


var loader = new THREE.ColladaLoader();
var exp = new THREE.ColladaExporter();
var parseAndDownload = obj => {

	// process into the ASCII file format
	var data = exp.parse( obj );
	console.log( 'Format', data );

	// parse it back to geometry and compare
	var res = loader.parse( data.data );
	// TODO: Validate the parsed example

	const zip = new JSZip();
	zip.file( 'example.dae', data.data );
	data.textures.forEach( tex => zip.file( `${ tex.name }.${ tex.ext }`, tex.data ) );
	// saveData( zip.generateAsync( { type: 'uint8Array' } ), 'colladaexample.zip' );

};

// create the geometry
var geometry = new THREE.SphereBufferGeometry( 5, 10, 10 );
var material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
var mesh = new THREE.Mesh( geometry, material );
var obj = new THREE.Object3D();

obj.add( mesh );
parseAndDownload( obj );

// Load and process and externally loaded collada model
// loader.load( 'elf.dae', res => parseAndDownload( res.scene ) );
