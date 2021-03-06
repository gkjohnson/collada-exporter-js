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
	var data = exp.parse( obj, { textureDirectory: 'textures/' } );
	console.log( 'Format', data );

	// parse it back to geometry and compare
	var res = loader.parse( data.data );
	// TODO: Validate the parsed example

	const zip = new JSZip();
	zip.file( 'example.dae', data.data );
	data.textures.forEach( tex => zip.file( `${ tex.directory }${ tex.name }.${ tex.ext }`, tex.data ) );
	// saveData( zip.generate( { type: 'uint8Array' } ), 'colladaexample.zip' );

};




// test that non-buffer geometry can be exported
var geometry = new THREE.SphereGeometry( 5, 10, 10 );
var material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
var mesh = new THREE.Mesh( geometry, material );
exp.parse( mesh );



// Visualize the processed model
customElements.define( 'model-viewer', ModelViewer );

var el = document.querySelector( 'model-viewer' );
loader.load( './testmodels/elf/elf.dae', res => {

	// wait 1 second to make sure the textures have downloaded
	setTimeout( () => {


		var data = exp.parse( res.scene, null, { textureDirectory: 'textures/' } );
		var daeurl = URL.createObjectURL( new Blob( [ data.data ] ) ) + '#.dae';
		el.loadingManager.setURLModifier( url => {

			const tex = data.textures
				.filter( t => url.indexOf( `${ t.directory }${ t.name }.${ t.ext }` ) !== - 1 )
				.pop();

			if ( ! tex ) return url;
			else return URL.createObjectURL( new Blob( [ tex.data ] ) );

		} );

		el.src = daeurl;

	}, 1000 );

} );
