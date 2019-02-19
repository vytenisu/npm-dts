
const findNodeModules = require( 'find-node-modules' );
const fs = require( 'fs' );
const path = require( 'path' );

module.exports = {
	
	find: function( address, requiredModule ) {
		
		let paths = findNodeModules( path.resolve( address ) );
		
		if ( requiredModule ) {
			
			for ( let i in paths ) {
				
				let pathItem = path.resolve( address, paths[i] );
				
				if ( fs.existsSync( path.resolve( pathItem, requiredModule ) ) ) {
					return pathItem;
				}
				
			}
			
		} else {
			
			if ( !paths ) {
				throw new Error( 'Build scripts could not find location of node_modules.' );
			}
			
			for ( let i in paths ) {
				paths[i] = path.resolve( address, paths[i] );
			}
			
			return paths;
			
		}
		
		throw new Error( 'Could not locate node_modules containing module: ' + requiredModule.toString() );
		
	}
	
};