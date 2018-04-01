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

    parse: function( object, onComplete ) {

        if ( THREE.ColladaExporter == null ) {

            console.error( 'ColladaArchiveExporter : THREE.ColladaExporter is required to pack a Collada archive file.' );
            return;

        }

        if ( window.JSZip == null ) {

            console.error( 'ColladaArchiveExporter : JSZip is required to pack a Collada archive file.' );
            return;

        }

        var files = ( new THREE.ColladaExporter() ).parse( object, '1.5.0' );
        var daename = `${ object.name || 'model' }.dae`;
        var manifest = 
            '<?xml version="1.0" encoding="utf-8"?>' +
            `<dae_root>./${ daename }</dae_root>`;

        var zip = new JSZip();
        zip.file( 'manifest.xml', manifest );
        zip.file( daename, files.data );
        files.textures.forEach( tex => zip.file( `${ tex.name }.${ tex.ext }`, tex.data ) );

        zip
            .generateAsync( { type: "uint8array" } )
            .then( data => onComplete( data ) );

    }

}