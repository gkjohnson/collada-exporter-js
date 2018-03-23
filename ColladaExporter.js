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

        // Convert the urdf xml into a well-formatted, indented format
        function format(urdf) {
            const IS_END_TAG = /^<\//;
            const IS_SELF_CLOSING = /(^<\?)|(\/>$)/;
            const pad = (ch, num) => (num > 0 ? ch + pad(ch, num - 1) : '');
            
            let tagnum = 0;
            return urdf
                .match(/<[^>]+>/g)
                .map(tag => {
                    if (!IS_SELF_CLOSING.test(tag) && IS_END_TAG.test(tag)) {
                        tagnum --;
                    }

                    const res = `${pad('  ', tagnum)}${tag}`;

                    if (!IS_SELF_CLOSING.test(tag) && !IS_END_TAG.test(tag)) {
                        tagnum ++;
                    }

                    return res;
                })
                .join('\n');        
        }

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

            res += '</asset></COLLADA>';

        return format(res);

    }

}