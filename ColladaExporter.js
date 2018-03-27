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

THREE.ColladaExporter = function () {};

THREE.ColladaExporter.prototype = {

	constructor: THREE.ColladaExporter,

	parse: function ( object ) {

		// Convert the urdf xml into a well-formatted, indented format
		function format( urdf ) {

			const IS_END_TAG = /^<\//;
			const IS_SELF_CLOSING = /(^<\?)|(\/>$)/;
			const pad = ( ch, num ) => ( num > 0 ? ch + pad( ch, num - 1 ) : '' );

			let tagnum = 0;
			return urdf
				.match( /<[^>]+>/g )
				.map( tag => {

					if ( ! IS_SELF_CLOSING.test( tag ) && IS_END_TAG.test( tag ) ) {

						tagnum --;

					}

					const res = `${pad( '  ', tagnum )}${tag}`;

					if ( ! IS_SELF_CLOSING.test( tag ) && ! IS_END_TAG.test( tag ) ) {

						tagnum ++;

					}

					return res;

				} )
				.join( '\n' );

		}

		// Convert an image into a png format for saving
		var canvas, ctx;
		function imageToData( image ) {

			canvas = canvas || document.createElement('canvas');
			ctx = ctx || canvas.getContext('2D');

			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;

			ctx.drawImage(image, 0, 0);

			return canvas
				.toDataURL('image/png')
				.replace(/^data:image\/(png|jpg);base64,/, '');
		
		}

		// Returns the string for a geometry's attribute
		function getAttribute( attr, name, params, type ) {

			var res =
					`<source id="${ name }"><float_array id="${ name }-array">` +
					attr.positions.array.join( ' ' ) +
					'</float_array>' +
					`<technique_common><accessor source="${ name }-array" count="${ attr.positions.array.length }" stride="3">` +

					params.map( n => `<param name="${ n }" type="${ type }" />` ).join( '' ) +

					'</technique_common></source>';

			return res;

		}

		// Returns the string for a node's transform information
		function getTransform( o ) {

			var position = o.position;
			var rotation = o.rotation;
			var scale = o.scale;

			var xvec = new THREE.Vector3();
			var yvec = new THREE.Vector3();
			var zvec = new THREE.Vector3();

			( new THREE.Matrix4() )
				.compose( new THREE.Vector3( 0, 0, 0 ), rotation, new THREE.Vector3( 1, 1, 1 ) )
				.extractBasis( xvec, yvec, zvec );

			var res =
				`<translate>${ position.x } ${ position.y } ${ position.z }</translate>` +
				`<rotation>${ xvec.x } ${ xvec.y } ${ xvec.z }</rotation>` +
				`<rotation>${ yvec.x } ${ yvec.y } ${ yvec.z }</rotation>` +
				`<rotation>${ zvec.x } ${ zvec.y } ${ zvec.z }</rotation>` +
				`<scale>${ scale.x } ${ scale.y } ${ scale.z }</scale>`;

			return res;

		}

		// Process the given piece of geometry into the geometry library
		// Returns the mesh id
		function processGeometry( g ) {

			var meshid = geometryMap.get( g );

			if ( meshid == null ) {

				meshid = `Mesh${ libraryGeometries.length + 1 }`;

				var polylistchildren = '';
				var gnode = `<geometry id="${ meshid }"><mesh>`;

				gnode += getAttribute( g.attributes.position, `${ meshid }-position`, [ 'X', 'Y', 'Z' ], 'float' );

				if ( 'normal' in g.attributes ) {

					gnode += getAttribute( g.attributes.normal, `${ meshid }-normal`, [ 'X', 'Y', 'Z' ], 'float' );
					polylistchildren += `<input semantic="NORMAL" source="#${ meshid }-normal" />`;

				}

				if ( 'color' in g.attributes ) {

					gnode += getAttribute( g.attributes.color, `${ meshid }-color`, [ 'X', 'Y', 'Z' ], 'uint8' );
					polylistchildren += `<input semantic="COLOR" source="#${ meshid }-color" />`;

				}

				gnode += `<vertices id="${ meshid }-vertices"><input semantic="POSITION" source="#${ meshid }-position" /></vertices>`;


				if ( g.indices ) {

					var polycount = g.attributes.position.length / 3;
					gnode += `<polylist material="MESH_MATERIAL" count="${ polycount }">`;
					gnode += polylistchildren;

					gnode += `<vcount>${ ( new Array( polycount ) ).fill( 3 ).join( ' ' ) }</vcount>`;
					gnode += `<p>${ g.attributes.position.array.map( ( v, i ) => i ).join( ' ' ) }</p>`;

				} else {

					var polycount = g.indices.length / 3;
					gnode += `<polylist material="MESH_MATERIAL" count="${ polycount }">`;
					gnode += polylistchildren;

					gnode += `<vcount>${ ( new Array( polycount ) ).fill( 3 ).join( ' ' ) }</vcount>`;
					gnode += `<p>${ g.indices.array.join( ' ' ) }</p>`;

				}

				gnode += `</mesh></geometry>`;

				libraryGeometries.push( gnode );
				geometryMap.set( g, meshid );

			}

			return meshid;

		}

		// Process the given texture into the image library
		// Returns the image library
		function processTexture( tex ) {

			// ...

		}

		// Process the given material into the material and effect libraries
		// Returns the material id
		function processMaterial( m ) {

			// TODO: Process images into the image libraries

			var matid = materialMap.get( m );

			if ( matid == null ) {

				matid = `Mat${ libraryEffects.length + 1 }`;

				var type = 'basic';

				if ( m instanceof THREE.MeshPhongMaterial ) {

					type = 'phong';

				} else if ( m instanceof THREE.MeshLambertMaterial ) {

					type = 'lambert';

				}

				var emissive = m.emissive ? m.emissive : new THREE.Color( 0, 0, 0 );
				var diffuse = m.color ? m.color : new THREE.Color( 0, 0, 0 );
				var specular = m.specular ? m.specular : new THREE.Color( 1, 1, 1 );
				var shininess = m.shininess || 0;
				var reflectivity = m.reflectivity || 0;

				var transparencyNode = m.opacity < 1.0 ?
					'<transparent><float>1</float></transparent>' +
					`<transparency><float>${ m.opacity }</float></transparency>` :
					'';

				var effectnode =
					`<effect id="${ matid }">` +
					'<profile_COMMON><technique>' +

					`<${ type }>` +

					`<emission><color>${ emissive.r } ${ emissive.g } ${ emissive.b }</color></emission>` +

					`<diffuse><color>${ diffuse.r } ${ diffuse.g } ${ diffuse.b }</color></diffuse>` +

					`<specular><color>${ specular.r } ${ specular.g } ${ specular.b }</color></specular>` +

					`<shininess><float>${ shininess }</float></shininess>` +

					`<reflective><color>${ diffuse.r } ${ diffuse.g } ${ diffuse.b }</color></reflective>` +

					`<reflectivity><float>${ reflectivity }</float></reflectivity>` +

					transparencyNode +

					`</${ type }>` +

					'</technique></profile_COMMON>' +
					'</effect>';


				libraryMaterials.push( `<material id="${ matid }"><instance_effect url="#${ matid }-effect" /></material>` );
				libraryEffects.push( effectnode );
				materialMap.set( m, `${ matid }-effect` );

			}

			return matid;

		}

		// Recursively process the object into a scene
		function processObject( o ) {

			var node = `<node name="${ o.name }">`;

			node += getTransform( o );

			if ( o instanceof THREE.Mesh && o.geometry != null ) {

				var meshid = processGeometry( o.geometry, meshid );

				var matid = null;

				if ( o.material != null ) {

					matid = processMaterial( o.material );

				}

				node +=
					`<instance_geometry url="#${ meshid }">` +

					(
						matid != null ?
							'<bind_material><technique_common>' +
							`<instance_material symbol="MESH_MATERIAL" target="#${ matid }" />` +
							'</technique_common></bind_material>' :
							''
					) +

					'</instance_geometry>';

			}

			o.children.forEach( c => node += processObject( c ) );

			node += '</node>';

		}

		var geometryMap = new WeakMap();
		var materialMap = new WeakMap();
		var imageMap = new WeakMap();
		var libraryImages = [];
		var libraryGeometries = [];
		var libraryEffects = [];
		var libraryMaterials = [];
		var libraryVisualScenes = processObject( object );

		var res =
			'<?xml version="1.0" encoding="UTF-8" standalone="no" ?>' +
			'<COLLADA xmlns="https://www.khronos.org/collada/" version="1.5.0">' +
			'<asset>' +
			'<contributor><authoring_tool>THREE.js Collada Exporter</authoring_tool></contributor>' +
			`<created>${ ( new Date() ).toISOString() }</created>` +
			`<modified>${ ( new Date() ).toISOString() }</modified>` +
			'<revision>1.0</revison>' +
			'<up_axis>Z_UP</up_axis>' +
			'</asset>';

		// include <library_images>

		res += `<library_effects>${ libraryEffects.join( '' ) }</library_effects>`;

		res += `<library_materials>${ libraryMaterials.join( '' ) }</library_materials>`;

		res += `<library_geometries>${ libraryGeometries.join( '' ) }</library_geometries>`;

		res += `<library_visual_scenes><visual_scene id="defaultScene">${ libraryVisualScenes }</visual_scene></library_visual_scenes>`;

		res += '<scene><instance_visual_scene url="#DefaultScene"/></scene>';

		res += '</COLLADA>';

		return format( res );

	}

};
