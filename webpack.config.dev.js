const webpack = require( 'webpack' );
const nodeExternals = require( 'webpack-node-externals' );
const StringReplacePlugin = require( 'string-replace-webpack-plugin' );

exportedConfig = {  
	entry: ( __dirname + '/index.ts' ),
	target: 'node',
	devtool: 'inline-source-map',
	externals: [
		nodeExternals()
	],
	mode: 'development',
	resolve: {
		extensions: [ '.webpack.js', '.web.js', '.ts', '.js' ]
	},
	output: {
		path: ( __dirname + '/dist' ),
		filename: 'index.js',
		sourceMapFilename: 'index.js.map',
		libraryTarget: "umd",
	},
	resolveLoader: {
		modules: [
			( __dirname + '/node_modules' )
		]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: [
					{
						loader: 'ts-loader',
						options: {
							configFile: __dirname + '/tsconfig.json'
						}
					},
					StringReplacePlugin.replace( {
						replacements: [
							{
								pattern: /^\s*(import .* as ([a-zA-Z0-9_-]+) from .*((\.css)|(\.less)).*$)/gm,
								replacement: function( match, p1, p2, p3, p4, p5, offset, string ) {
									let result = p1 + '	/* Generated forced initialization (only dev mode): */ ;' + 'let ' + p2 + '_forceInit = ' + p2 + ';';
									return result;
								}
							}
						]
					} )
				]
			}
		]
	}
};

module.exports = exportedConfig;
