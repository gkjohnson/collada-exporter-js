/**
 * @author Garrett Johnson / http://gkjohnson.github.io/
 * https://github.com/gkjohnson/collada-exporter-js
 *
 * Usage:
 *  var exporter = new THREE.ColladaArchiveExporter();
 *
 *  var data = exporter.parse(mesh);
 *
 * Format Definition:
 *  https://www.khronos.org/collada/
 */

THREE.ColladaArchiveExporter = function () {};

THREE.ColladaArchiveExporter.prototype = {

	constructor: THREE.ColladaArchiveExporter,

	parse: function ( object, onDone, options ) {

		if ( THREE.ColladaExporter == null ) {

			console.error( 'ColladaArchiveExporter : THREE.ColladaExporter is required to pack a Collada archive file.' );
			return;

		}

		if ( window.JSZip == null ) {

			console.error( 'ColladaArchiveExporter : JSZip is required to pack a Collada archive file.' );
			return;

		}

		// Force the version to 1.5.0
		options = Object.assign( {}, options, { version: '1.5.0' } );

		// TODO: we should be able to handle the async and sync versions of
		// jszip now that we have an onDone function
		var files = ( new THREE.ColladaExporter() ).parse( object, null, options );
		var daename = `${ object.name || 'model' }.dae`;
		var manifest =
			'<?xml version="1.0" encoding="utf-8"?>' +
			`<dae_root>./${ daename }</dae_root>`;

		var zip = new JSZip();
		zip.file( 'manifest.xml', manifest );
		zip.file( daename, files.data );
		files.textures.forEach( tex => zip.file( `${ tex.directory }${ tex.name }.${ tex.ext }`, tex.data ) );

		var res = zip.generate( { type: 'uint8array' } );

		if ( typeof onDone === 'function' ) {

			requestAnimationFrame( () => onDone( res ) );

		}

		return res;

	}

};
