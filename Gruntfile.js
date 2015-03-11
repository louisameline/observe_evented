module.exports = function (grunt) {

	grunt.initConfig({
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
	
	grunt.loadNpmTasks('grunt-contrib-uglify');
	
	grunt.registerTask('default', ['uglify']);
};