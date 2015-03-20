module.exports = function (grunt) {

	grunt.initConfig({
		node_tap: {
		  default_options: {
			  options: {
				  outputType: 'failures',
				  outputTo: 'console'
			  },
			  files: {
				  'test': ['./test/test.js']
			  }
		  }
		},
		uglify: {
			options: {
				compress: true,
				mangle: true,
				preserveComments: 'some'
			},
			oe: {
				src: 'src/observe_evented.js',
				dest: 'src/observe_evented.min.js'
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-node-tap');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	
	grunt.registerTask('default', ['node_tap', 'uglify']);
};