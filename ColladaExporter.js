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

	parse: function ( object, options = {} ) {

		options = Object.assign( {
			version: '1.4.1',
			author: null
		}, options );

		var version = options.version;
		if ( version !== '1.4.1' && version !== '1.5.0' ) {

			console.warn( `ColladaExporter : Version ${ version } not supported for export. Only 1.4.1 and 1.5.0.` );
			return null;

		}

		// Convert the urdf xml into a well-formatted, indented format
		function format( urdf ) {

			var IS_END_TAG = /^<\//;
			var IS_SELF_CLOSING = /(\?>$)|(\/>$)/;
			var HAS_TEXT = /<[^>]+>[^<]*<\/[^<]+>/;

			var pad = ( ch, num ) => ( num > 0 ? ch + pad( ch, num - 1 ) : '' );

			var tagnum = 0;
			return urdf
				.match( /(<[^>]+>[^<]+<\/[^<]+>)|(<[^>]+>)/g )
				.map( tag => {

					if ( ! HAS_TEXT.test( tag ) && ! IS_SELF_CLOSING.test( tag ) && IS_END_TAG.test( tag ) ) {

						tagnum --;

					}

					var res = `${ pad( '  ', tagnum ) }${ tag }`;

					if ( ! HAS_TEXT.test( tag ) && ! IS_SELF_CLOSING.test( tag ) && ! IS_END_TAG.test( tag ) ) {

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

			return new arr.constructor( arr.buffer, st * arr.BYTES_PER_ELEMENT, ct );

		}

		// Returns the string for a geometry's attribute
		function getAttribute( attr, name, params, type ) {

			var array = attr.array;
			var res =
					`<source id="${ name }">` +

					`<float_array id="${ name }-array" count="${ array.length }">` +
					array.join( ' ' ) +
					'</float_array>' +

					'<technique_common>' +
					`<accessor source="#${ name }-array" count="${ Math.floor( array.length / attr.itemSize ) }" stride="${ attr.itemSize }">` +

					params.map( n => `<param name="${ n }" type="${ type }" />` ).join( '' ) +

					'</accessor>' +
					'</technique_common>' +
					'</source>';

			return res;

		}

		// Returns the string for a node's transform information
		var transMat;
		function getTransform( o ) {

			// ensure the object's matrix is up to date
			// before saving the transform
			o.updateMatrix();

			transMat = transMat || new THREE.Matrix4();
			transMat.copy( o.matrix );
			transMat.transpose();
			return `<matrix>${ transMat.toArray().join( ' ' ) }</matrix>`;

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

				var indexCount =
					processGeom.index ?
						processGeom.index.array.length :
						processGeom.attributes.position.count;

				var groups =
					processGeom.groups != null && processGeom.groups.length !== 0 ?
						processGeom.groups :
						[ { start: 0, count: indexCount, materialIndex: 0 } ];

				var gnode = `<geometry id="${ meshid }" name="${ g.name }"><mesh>`;

				// define the geometry node and the vertices for the geometry
				var posName = `${ meshid }-position`;
				var vertName = `${ meshid }-vertices`;
				gnode += getAttribute( processGeom.attributes.position, posName, [ 'X', 'Y', 'Z' ], 'float' );
				gnode += `<vertices id="${ vertName }"><input semantic="POSITION" source="#${ posName }" /></vertices>`;

				// NOTE: We're not optimizing the attribute arrays here, so they're all the same length and
				// can therefore share the same triangle indices. However, MeshLab seems to have trouble opening
				// models with attributes that share an offset.
				// MeshLab Bug#424: https://sourceforge.net/p/meshlab/bugs/424/

				// serialize normals
				var triangleInputs = `<input semantic="VERTEX" source="#${ vertName }" offset="0" />`;
				if ( 'normal' in processGeom.attributes ) {

					var normName = `${ meshid }-normal`;
					gnode += getAttribute( processGeom.attributes.normal, normName, [ 'X', 'Y', 'Z' ], 'float' );
					triangleInputs += `<input semantic="NORMAL" source="#${ normName }" offset="0" />`;

				}

				// serialize uvs
				if ( 'uv' in processGeom.attributes ) {

					var uvName = `${ meshid }-texcoord`;
					gnode += getAttribute( processGeom.attributes.uv, uvName, [ 'S', 'T' ], 'float' );
					triangleInputs += `<input semantic="TEXCOORD" source="#${ uvName }" offset="0" set="0" />`;

				}

				// serialize colors
				if ( 'color' in processGeom.attributes ) {

					var colName = `${ meshid }-color`;
					gnode += getAttribute( processGeom.attributes.color, colName, [ 'X', 'Y', 'Z' ], 'uint8' );
					triangleInputs += `<input semantic="COLOR" source="#${ colName }" offset="0" />`;

				}

				for ( var i = 0, l = groups.length; i < l; i ++ ) {

					var group = groups[ i ];

					if ( processGeom.index != null ) {

						var subarr = subArray( processGeom.index.array, group.start, group.count );
						var polycount = subarr.length / 3;
						gnode += `<triangles material="MESH_MATERIAL_${ group.materialIndex }" count="${ polycount }">`;
						gnode += triangleInputs;

						gnode += `<p>${ subarr.join( ' ' ) }</p>`;
						gnode += '</triangles>';

					} else {

						var polycount = group.count / 3;
						gnode += `<triangles material="MESH_MATERIAL_${ group.materialIndex }" count="${ polycount }">`;
						gnode += triangleInputs;

						// Fill an index array mapping to incrementing triangle indices
						var indexArray = new Array( group.count );
						var groupStart = group.start;
						for ( var j = 0, lj = indexArray.length; j < lj; j ++ ) indexArray[ j ] = j + groupStart;

						gnode += `<p>${ indexArray.join( ' ' ) }</p>`;
						gnode += '</triangles>';

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

				texid = `image-${ libraryImages.length + 1 }`;

				var ext = 'png';
				var name = tex.name || texid;
				var imageNode = `<image id="${ texid }" name="${ name }">`;

				if ( version === '1.5.0' ) {

					imageNode += `<init_from><ref>${ name }.${ ext }</ref></init_from>`;

				} else {

					// version image node 1.4.1
					imageNode += `<init_from>${ name }.${ ext }</init_from>`;

				}

				imageNode += '</image>';

				libraryImages.push( imageNode );
				imageMap.set( tex.image, texid );
				textures.push( {
					name,
					ext,
					data: imageToData( tex.image, ext )
				} );

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

				// Do not export and alpha map for the reasons mentioned in issue (#13792)
				// in THREE.js alpha maps are black and white, but collada expects the alpha
				// channel to specify the transparency
				var transparencyNode = m.opacity < 1.0 ?
					'<transparent><float>1</float></transparent>' +
					`<transparency><float>${ m.opacity }</float></transparency>` :
					'';

				var techniqueNode = `<technique><${ type }>` +

					'<emission>' +

					(
						m.emissiveMap ?
							'<texture texture="emissive-sampler" texcoord="TEXCOORD" />' :
							`<color sid="emission">${ emissive.r } ${ emissive.g } ${ emissive.b } 1</color>`
					) +

					'</emission>' +

					'<diffuse>' +

					(
						m.map ?
							'<texture texture="diffuse-sampler" texcoord="TEXCOORD" />' :
							`<color sid="diffuse">${ diffuse.r } ${ diffuse.g } ${ diffuse.b } 1</color>`
					) +

					'</diffuse>' +

					`<specular><color sid="specular">${ specular.r } ${ specular.g } ${ specular.b } 1</color></specular>` +

					'<shininess>' +

					(
						m.specularMap ?
							'<texture texture="specular-sampler" texcoord="TEXCOORD" />' :
							`<float sid="shininess">${ shininess }</float>`
					) +

					'</shininess>' +

					`<reflective><color>${ diffuse.r } ${ diffuse.g } ${ diffuse.b } 1</color></reflective>` +

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
							'<newparam sid="diffuse-sampler"><sampler2D><source>diffuse-surface</source></sampler2D></newparam>' :
							''
					) +

					(
						m.specularMap ?
							'<newparam sid="specular-surface"><surface type="2D">' +
							`<init_from>${ processTexture( m.specularMap ) }</init_from>` +
							'</surface></newparam>' +
							'<newparam sid="specular-sampler"><sampler2D><source>specular-surface</source></sampler2D></newparam>' :
							''
					) +

					(
						m.emissiveMap ?
							'<newparam sid="emissive-surface"><surface type="2D">' +
							`<init_from>${ processTexture( m.emissiveMap ) }</init_from>` +
							'</surface></newparam>' +
							'<newparam sid="emissive-sampler"><sampler2D><source>emissive-surface</source></sampler2D></newparam>' :
							''
					) +

					techniqueNode +

					(
						m.side === THREE.DoubleSide ?
							`<extra><technique><double_sided sid="double_sided" type="int">1</double_sided></technique></extra>` :
							''
					) +

					'</profile_COMMON>' +

					'</effect>';

				libraryMaterials.push( `<material id="${ matid }" name="${ m.name }"><instance_effect url="#${ matid }-effect" /></material>` );
				libraryEffects.push( effectnode );
				materialMap.set( m, matid );

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
							'<bind_material><technique_common>' +
							matids.map( ( id, i ) =>

								`<instance_material symbol="MESH_MATERIAL_${ i }" target="#${ id }" >` +

								// TODO: This isn't needed in all cases. processMaterial could return more information
								// so this can be properly conditional
								'<bind_vertex_input semantic="TEXCOORD" input_semantic="TEXCOORD" input_set="0" />' +

								'</instance_material>'
							).join( '' ) +
							'</technique_common></bind_material>' :
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
			`<COLLADA xmlns="https://www.khronos.org/collada/" version="${ version }">` +
			'<asset>' +
			(
				'<contributor>' +
				'<authoring_tool>THREE.js Collada Exporter</authoring_tool>' +
				( options.author !== null ? `<author>${ options.author }</author>` : '' ) +
				'</contributor>' +
				`<created>${ ( new Date() ).toISOString() }</created>` +
				'<up_axis>Y_UP</up_axis>'
			) +
			'</asset>';

		res += `<library_images>${ libraryImages.join( '' ) }</library_images>`;

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
