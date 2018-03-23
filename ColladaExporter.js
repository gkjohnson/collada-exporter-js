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
        function format( urdf ) {

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

        function processGeometry ( g, meshid ) {
            // TODO: return the library geometry
        }

        function processEffect ( m, matid ) {
            // TODO: return an effect for the material
        }

        function processMaterial ( m, matid ) {
            // TODO: return the library material
        }

        function processTransform ( o ) {

            var position = o.position;
            var rotation = o.rotation;
            var scale = o.scale;

            var xvec = new THREE.Vector3();
            var yvec = new THREE.Vector3();
            var zvec = new THREE.Vector3();

            (new Matrix4())
                .compose(new THREE.Vector3(0, 0, 0), rot, new THREE.Vector3(1, 1, 1))
                .extractBasis(xvec, yvec, zvec);

            var res =
                `<translate>${ o.position.x } ${ o.position.y } ${ o.position.z }</translate>` +
                `<rotation>${ xvec.x } ${ xvec.y } ${ xvec.z }</rotation>` +
                `<rotation>${ yvec.x } ${ yvec.y } ${ yvec.z }</rotation>` +
                `<rotation>${ zvec.x } ${ zvec.y } ${ zvec.z }</rotation>` +
                `<scale>${ o.scale.x } ${ o.scale.y } ${ o.scale.z }</scale>`;

        }

        function processNode ( o ) {

            var node = `<node name="${child.name}">`;

            node += processTransform( o );

            if ( o instanceof THREE.Mesh && o.geometry ) {

                // TODO: check if the geometry has been produced
                // in the mesh map
                var meshid = `Mesh${ libraryGeometries.length + 1 }`;
                libraryGeometries.push( processGeometry ( o.geometry, meshid ) );

                var matid = `Mat${ libraryEffects.length + 1 }`;
                libraryEffects.push( processMaterial (o.material, matid ) );

                node +=
                    `<instance_geometry url="#${ meshid }">` +
                    '<bind_material><technique_common>' +
                    `<instance_material url="#${ matid }" />` +
                    '</bind_material></technique_common>' +
                    '</instance_geometry>';

            }

            o.children.forEach(c => node += processNode(c));

            node += '</node>';

        }

        var geometryMap = new WeakMap();
        var libraryGeometries = [];
        var libraryEffects = [];
        var libraryMaterials = [];
        var libraryVisualScenes = processNode(o);

        var res = 
            '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>' +
            '<COLLADA xmlns="https://www.khronos.org/collada/" version="1.5.0">' +
            '<asset>' +
            '<contributor><authoring_tool>THREE.js Collada Exporter</authoring_tool></contributor>' +
            `<created>${ (new Date()).toISOString() }</created>` +
            `<modified>${ (new Date()).toISOString() }</modified>` +
            '<revision>1.0</revison>' +
            '<up_axis>Z_UP</up_axis>' +
            '</asset>';

            // include <library_images>

            // include <library_effects>
            res += `<library_effects>${ libraryEffects.join('') }</library_effects>`

            // include <library_materials>
            res += `<library_materials>${ libraryMaterials.join('') }</library_materials>`

            // include <library_geometries>
            res += `<library_geometries>${ libraryGeometries.join('') }</library_geometries>`

            // include <library_visual_scenes>
            res += `<library_visual_scenes><visual_scene id="defaultScene">${ libraryVisualScenes }</visual_scene></library_visual_scenes>`;

            // include <scene>
            res += '<scene><instance_visual_scene url="#DefaultScene"/></scene>'

            res += '</COLLADA>';

        return format(res);

    }

}