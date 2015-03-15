var i2c = require('i2c-bus');
var MPU6050 = require('..');

var address = 0x68;
var i2c1 = i2c.open(1, function (err) {
	if (err) throw err;

	var sensor = MPU6050(i2c1, address);

	(function read() {
		sensor.read(function (err, data) {
			if (err) throw err;
			console.log(data);
			read();
		});
	}());
});