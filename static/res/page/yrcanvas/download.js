var fs = require('fs'),
	request = require('request'),
	parseString = require('xml2js').parseString,
	exec = require('child_process').exec;

var bounds = [-270000, 5870000, 1380000, 8100000],
	res = 2000,
	width = (bounds[2] - bounds[0]) / res,
	height = (bounds[3] - bounds[1]) / res;

var getImage = function (time, filename, callback) {
	var url = 'http://public-wms.met.no/verportal/verportal.map?LAYERS=radar_precipitation_intensity&FORMAT=image%2Fpng&TIME=' + encodeURIComponent(time) + '&EXCEPTIONS=application%2Fvnd.ogc.se_xml&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&SRS=EPSG%3A32633&BBOX=' + bounds.join() + '&WIDTH=' + width + '&HEIGHT=' + height;

	request(url).pipe(fs.createWriteStream(filename)).on('close', function () {
		console.log("Saved", filename);
		callback(filename);
	});
};

var getImageSeries = function (times) {
	var count = 0,
		files = [];

	for (var i = 0; i < times.length; i++) {
		var time = times[i],
			filename = 'images/' + time.replace(':', '-') + '.png';

		files.push(filename);

		getImage(time, filename, function(file) {
			if (++count === times.length) {
				montage(files, 'images/combined/' + times[times.length - 1].replace(':', '-') + '.png');
			} 
		});
	}
};

// Reguires brew install ImageMagick
var montage = function (files, filename) {
	exec('montage -background none -geometry 100% ' + files.join(' ') + ' ' + filename, function (err, stdout, stderr) {
		if (err) throw err;
		console.log('Saved', filename);
	});
};

var saveImage = function (buffer, filename, callback) {
	fs.writeFile('images/' + filename, buffer, 'binary', callback);	
};

// Get available times from WMS capabilities document
request('http://public-wms.met.no/verportal/verportal.map?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities', function (err, response, body) {
	if (!err && response.statusCode == 200) {
		parseString(body, function (err, result) {
			// NB! Use better XML parsing in production!
	 	 	getImageSeries(result.WMT_MS_Capabilities.Capability[0].Layer[0].Layer[11].Extent[0]['_'].split(','));
  		});
	}
});