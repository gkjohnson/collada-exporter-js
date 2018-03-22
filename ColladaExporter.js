/**
 * @author Garrett Johnson / http://gkjohnson.github.io/
 * https://github.com/gkjohnson/collada-exporter-js
 *
 * Usage:
 *  var exporter = new THREE.ColladaExporter();
 *
 *  var data = exporter.parse(mesh);
 *
 * Format Definition:
 *  https://www.khronos.org/collada/
 */

THREE.ColladaExporter = function() {}

THREE.ColladaExporter.prototype = {

    constructor: THREE.ColladaExporter,

    parse: function ( object ) {

        var geometryMap = new WeakMap();

        object.traverse( function ( child ) { 
            


        } );


        var res = 
            '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>' +
            '<COLLADA xmlns="https://www.khronos.org/collada/" version="1.5.0">' +
            '<asset>' +
            '<contributor><authoring_tool>THREE.js Collada Exporter</authoring_tool></contributor>' +
            `<created>${ (new Date()).toISOString() }</created>` +
            `<modified>${ (new Date()).toISOString() }</modified>` +
            '<up_axis>Z_UP</up_axis>';

            // include <library_visual_scenes>

            // include <library_geometries>

            // include <library_materials>

            // include <library_effects>

            // include <scene>

            res += '</COLLADA>';

        return res;

    }

}