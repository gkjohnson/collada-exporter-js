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
	// saveData( zip.generate( { type: 'uint8Array' } ), 'colladaexample.zip' );

};

// create the geometry
// var geometry = new THREE.SphereBufferGeometry( 5, 10, 10 );
// var material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
// var mesh = new THREE.Mesh( geometry, material );
// var obj = new THREE.Object3D();

// obj.add( mesh );
// parseAndDownload( obj );

// Visualize the processed model
customElements.define( 'model-viewer', ModelViewer );

var el = document.querySelector( 'model-viewer' );
loader.load( './testmodels/pump/pump.dae', res => {

	// wait 1 second to make sure the textures have downloaded
	setTimeout( () => {

		var data = exp.parse( res.scene );
		var daeurl = URL.createObjectURL( new Blob( [ data.data ] ) ) + '#.dae';
		el.loadingManager.setURLModifier( url => {

			const tex = Object
				.keys( data.textures )
				.filter( n => url.indexOf( data.textures[ n ].name ) !== - 1 )
				.pop();

			if ( ! tex ) return url;
			else return URL.createObjectURL( new Blob( [ data.textures[ tex ].data ] ) );

		} );

		el.src = daeurl;

	}, 1000 );

} );
