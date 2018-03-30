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
			const IS_TAG = /^<.*>$/;
			const pad = ( ch, num ) => ( num > 0 ? ch + pad( ch, num - 1 ) : '' );

			let tagnum = 0;
			return urdf
				.match( /(<[^>]+>)|([^<]*)/g )
				.map( tag => {

					if ( IS_TAG.test( tag ) && ! IS_SELF_CLOSING.test( tag ) && IS_END_TAG.test( tag ) ) {

						tagnum --;

					}

					const res = `${ pad( '  ', tagnum ) }${ tag }`;

					if ( IS_TAG.test( tag ) && ! IS_SELF_CLOSING.test( tag ) && ! IS_END_TAG.test( tag ) ) {

						tagnum ++;

					}

					return res;

				} )
				.join( '\n' );

		}

		// Convert an image into a png format for saving
		function base64ToBuffer( str ) {

			var b = atob( str );
			var buf = new Uint8Array( b.length );

			for ( var i = 0, l = buf.length; i < l; i ++ ) {

				buf[ i ] = b.charCodeAt( i );

			}

			return buf;

		}

		var canvas, ctx;
		function imageToData( image, ext ) {

			canvas = canvas || document.createElement( 'canvas' );
			ctx = ctx || canvas.getContext( '2d' );

			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;

			ctx.drawImage( image, 0, 0 );

			// Get the base64 encoded data
			var base64data = canvas
						.toDataURL( `image/${ ext }`, 1 )
						.replace( /^data:image\/(png|jpg);base64,/, '' );

			// Convert to a uint8 array
			return base64ToBuffer( base64data );

		}

		// Returns an array of the same type starting at the `st` index,
		// and `ct` length
		function subArray( arr, st, ct ) {

			return new arr.constructor( arr.buffer, st * arr.BYTES_PER_ELEMENT, Math.min( arr.length, ct ) );

		}

		// Returns the string for a geometry's attribute
		function getAttribute( attr, name, params, type, group ) {

			var arr = subArray( attr.array, group.start, group.count );

			var res =
					`<source id="${ name }"><float_array id="${ name }-array" count="${ arr.length }">` +
					arr.join( ' ' ) +
					'</float_array>' +
					`<technique_common><accessor source="#${ name }-array" count="${ Math.floor( arr.length / attr.itemSize ) }" stride="${ attr.itemSize }">` +

					params.map( n => `<param name="${ n }" type="${ type }" />` ).join( '' ) +

					'</accessor></technique_common></source>';

			return res;

		}

		// Returns the string for a node's transform information
		var rotmat;
		function getTransform( o ) {

			var position = o.position;
			var rotation = o.rotation;
			var scale = o.scale;


			var xvec = new THREE.Vector3();
			var yvec = new THREE.Vector3();
			var zvec = new THREE.Vector3();

			var rotmat = rotmat || new THREE.Matrix4();
			rotmat
				.makeRotationFromEuler( rotation )
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

			// convert the geometry to bufferGeometry if it isn't already
			var processGeom = g;
			if ( processGeom instanceof THREE.Geometry ) {

				processGeom = ( new THREE.BufferGeometry() ).fromGeometry( processGeom );

			}

			if ( meshid == null ) {

				meshid = `Mesh${ libraryGeometries.length + 1 }`;

				var groups = processGeom.groups != null && processGeom.groups.length !== 0 ? processGeom.groups : [ { start: 0, count: Infinity, materialIndex: 0 } ];

				var gnode = `<geometry id="${ meshid }" name="${ g.name }"><mesh>`;
				for ( var i = 0, l = groups.length; i < l; i ++ ) {

					var group = groups[ i ];
					var polylistchildren = '';

					var posName = `${ meshid }-position-${ i }`;
					gnode += getAttribute( processGeom.attributes.position, posName, [ 'X', 'Y', 'Z' ], 'float', group );

					// serialize normals
					if ( 'normal' in processGeom.attributes ) {

						var normName = `${ meshid }-normal-${ i }`;
						gnode += getAttribute( processGeom.attributes.normal, normName, [ 'X', 'Y', 'Z' ], 'float', group );
						polylistchildren += `<input semantic="NORMAL" source="#${ normName }" offset="0" />`;

					}

					// serialize uvs
					if ( 'uv' in processGeom.attributes ) {

						var uvName = `${ meshid }-texcoord-${ i }`;
						gnode += getAttribute( processGeom.attributes.uv, uvName, [ 'S', 'T' ], 'float', group );
						polylistchildren += `<input semantic="TEXCOORD" source="#${ uvName }" offset="0" />`;

					}

					// serialize colors
					if ( 'color' in processGeom.attributes ) {

						var colName = `${ meshid }-color-${ i }`;
						gnode += getAttribute( processGeom.attributes.color, colName, [ 'X', 'Y', 'Z' ], 'uint8', group );
						polylistchildren += `<input semantic="COLOR" source="#${ colName }" offset="0" />`;

					}

					var vertName = `${ meshid }-vertices-${ i }`;
					gnode += `<vertices id="${ vertName }"><input semantic="POSITION" source="#${ posName }" /></vertices>`;
					polylistchildren += `<input semantic="VERTEX" source="#${ vertName }" offset="0" />`;

					if ( processGeom.index != null ) {

						var subarr = subArray( processGeom.index.array, group.start, group.count );
						var polycount = subarr.length / 3;
						gnode += `<polylist material="MESH_MATERIAL_${ group.materialIndex }" count="${ polycount }">`;
						gnode += polylistchildren;

						gnode += `<vcount>${ ( new Array( polycount ) ).fill( 3 ).join( ' ' ) }</vcount>`;
						gnode += `<p>${ subarr.join( ' ' ) }</p>`;
						gnode += '</polylist>';

					} else {

						var subarr = subArray( processGeom.attributes.position.array, group.start, group.count );
						var polycount = subarr.length / 3;
						gnode += `<polylist material="MESH_MATERIAL_${ group.materialIndex }" count="${ polycount }">`;
						gnode += polylistchildren;

						// The "vcount" and "p" tags seem to be optional
						// gnode += `<vcount>${ ( new Array( polycount ) ).fill( 3 ).join( ' ' ) }</vcount>`;
						// gnode += `<p>${ ( new Array( subarr.length ) ).fill().map( ( v, i ) => i ).join( ' ' ) }</p>`;
						gnode += '</polylist>';

					}

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

			var texid = imageMap.get( tex.image );
			if ( texid == null ) {
				
				texid = `Image${ libraryImages.length + 1 }`;

				var ext = 'png';
				var name = tex.name || texid;
				var imageNode = `<image id="${ texid }" name="${ name }">`;
				imageNode += `<init_from>${ name }.${ ext }</init_from>`;
				imageNode += '</image>';


				libraryImages.push( imageNode );
				imageMap.set( tex.image, texid );
				textures.push({
					name,
					ext,
					data: imageToData( tex.image, ext )
				})

			}

			return texid;
		}

		// Process the given material into the material and effect libraries
		// Returns the material id
		function processMaterial( m ) {

			var matid = materialMap.get( m );

			if ( matid == null ) {

				matid = `Mat${ libraryEffects.length + 1 }`;

				var type = 'phong';

				if ( m instanceof THREE.MeshLambertMaterial ) {

					type = 'lambert';

				} else if ( m instanceof THREE.MeshBasicMaterial ) {

					type = 'constant';

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

				var techniqueNode = `<technique><${ type }>` +

					`<emission><color>${ emissive.r } ${ emissive.g } ${ emissive.b }</color></emission>` +

					'<diffuse>' +
					
					(
						m.map ? 
						`<texture texture="diffuse-sampler" texcoord="TEXCOORD" />` :
						`<color>${ diffuse.r } ${ diffuse.g } ${ diffuse.b }</color>`
					) +

					'</diffuse>' +

					`<specular><color>${ specular.r } ${ specular.g } ${ specular.b }</color></specular>` +

					`<shininess><float>${ shininess }</float></shininess>` +

					`<reflective><color>${ diffuse.r } ${ diffuse.g } ${ diffuse.b }</color></reflective>` +

					`<reflectivity><float>${ reflectivity }</float></reflectivity>` +

					transparencyNode +

					`</${ type }></technique>`;

				var effectnode =
					`<effect id="${ matid }-effect">` +
					'<profile_COMMON>' +

					(
						m.map ?
						'<newparam sid="diffuse-surface"><surface type="2D">' +
						`<init_from>${ processTexture( m.map ) }</init_from>` +
						'</surface></newparam>' +
						'<newparam sid="diffuse-sampler><sampler2D><source>diffuse-surface</source></sampler2D></newparam>' :
						''
					) +

					techniqueNode +

					'</profile_COMMON>' +
					'</effect>';

				libraryMaterials.push( `<material id="${ matid }" name="${ m.name }"><instance_effect url="#${ matid }-effect" /></material>` );
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

				var matids = null;
				if ( o.material != null ) {

					var materials = Array.isArray( o.material ) ? o.material : [ o.material ];
					matids = materials.map( m => processMaterial( m ) );

				}

				node +=
					`<instance_geometry url="#${ meshid }">` +

					(
						matids != null ?
							matids.map( ( id, i ) =>
								'<bind_material><technique_common>' +
								`<instance_material symbol="MESH_MATERIAL_${ i }" target="#${ id }" >` +

								// TODO: This isn't needed in all cases. processMaterial could return more information
								// so this can be properly conditional
								'<bind_vertex_input semantic="TEXCOORD" input_semantic="TEXCOORD" input_set="0" />' +
								
								'</instance_material>' +
								'</technique_common></bind_material>'
							).join( '' ) :
							''
					) +

					'</instance_geometry>';

			}

			o.children.forEach( c => node += processObject( c ) );

			node += '</node>';

			return node;

		}

		var geometryMap = new WeakMap();
		var materialMap = new WeakMap();
		var imageMap = new WeakMap();
		var textures = [];

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
			'<revision>1.0</revision>' +
			'<up_axis>Y_UP</up_axis>' +
			'</asset>';

		// include <library_images>

		res += `<library_effects>${ libraryEffects.join( '' ) }</library_effects>`;

		res += `<library_materials>${ libraryMaterials.join( '' ) }</library_materials>`;

		res += `<library_geometries>${ libraryGeometries.join( '' ) }</library_geometries>`;

		res += `<library_visual_scenes><visual_scene id="Scene" name="scene">${ libraryVisualScenes }</visual_scene></library_visual_scenes>`;

		res += '<scene><instance_visual_scene url="#Scene"/></scene>';

		res += '</COLLADA>';

		return {
			data: format( res ),
			textures
		};

	}

};
