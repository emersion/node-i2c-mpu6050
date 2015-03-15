var async = require('async');

// Registers
var POWER_MGMT_1 = 0x6b,
	POWER_MGMT_2 = 0x6c;
var ACCEL_XOUT = 0x3b,
	ACCEL_YOUT = 0x3d,
	ACCEL_ZOUT = 0x3f;
var TEMP_OUT = 0x41;
var GYRO_XOUT = 0x43,
	GYRO_YOUT = 0x45,
	GYRO_ZOUT = 0x47;

var ACCEL_LSB_SENSITIVITY = 16384,
	GYRO_LSB_SENSITIVITY = 131;

function toDegrees(angle) {
  return angle * (180 / Math.PI);
}

function dist(a, b) {
	return Math.sqrt((a*a)+(b*b));
}

function getXRotation(x, y, z) {
	var radians = Math.atan2(y, dist(x, z));
	return -toDegrees(radians);
}

function getYRotation(x, y, z) {
	var radians = Math.atan2(x, dist(y, z));
	return -toDegrees(radians);
}

function scaleData(data, factor) {
	var scaled = {};
	for (var name in data) {
		scaled[name] = data[name] / factor;
	}
	return scaled;
}


function Sensor(bus, address) {
	if (!(this instanceof Sensor)) {
		return new Sensor(bus, address);
	}

	this.bus = bus;
	this.address = address;

	// Now wake the MPU6050 up as it starts in sleep mode
	bus.writeByteSync(address, POWER_MGMT_1, 0);
}

Sensor.prototype.readWord = function (cmd, done) {
	var high, low;
	var that = this;
	async.series([
		function (cb) {
			that.bus.readByte(that.address, cmd, function (err, value) {
				high = value;
				cb(err);
			});
		},
		function (cb) {
			that.bus.readByte(that.address, cmd + 1, function (err, value) {
				low = value;
				cb(err);
			});
		}
	], function (err) {
		if (err) return done(err);

		var value = (high << 8) + low;
		done(null, value);
	});
};

Sensor.prototype.readWordSync = function (cmd) {
	var high = this.bus.readByteSync(this.address, cmd);
	var low = this.bus.readByteSync(this.address, cmd+1);
	var value = (high << 8) + low;
	return value;
};

Sensor.prototype.readWord2c = function (cmd, done) {
	this.readWord(cmd, function (err, value) {
		if (err) return done(err);

		if (value >= 0x8000) {
			done(null, -((65535 - value) + 1));
		} else {
			done(null, value);
		}
	});
};

Sensor.prototype.readWord2cSync = function (cmd) {
	var value = this.readWordSync(cmd);
	if (value >= 0x8000) {
		return -((65535 - value) + 1);
	} else {
		return value;
	}
};

Sensor.prototype.readGyro = function (done) {
	var data = {};

	var that = this;
	async.series([
		function (cb) {
			that.readWord2c(GYRO_XOUT, function (err, value) {
				data.x = value;
				cb(err);
			});
		},
		function (cb) {
			that.readWord2c(GYRO_YOUT, function (err, value) {
				data.y = value;
				cb(err);
			});
		},
		function (cb) {
			that.readWord2c(GYRO_ZOUT, function (err, value) {
				data.z = value;
				cb(err);
			});
		}
	], function (err) {
		if (err) return done(err);
		done(null, scaleData(data, GYRO_LSB_SENSITIVITY));
	});
};

Sensor.prototype.readGyroSync = function () {
	return scaleData({
		x: this.readWord2cSync(GYRO_XOUT),
		y: this.readWord2cSync(GYRO_YOUT),
		z: this.readWord2cSync(GYRO_ZOUT)
	}, GYRO_LSB_SENSITIVITY);
};

Sensor.prototype.readAccel = function (done) {
	var data = {};

	var that = this;
	async.series([
		function (cb) {
			that.readWord2c(ACCEL_XOUT, function (err, value) {
				data.x = value;
				cb(err);
			});
		},
		function (cb) {
			that.readWord2c(ACCEL_YOUT, function (err, value) {
				data.y = value;
				cb(err);
			});
		},
		function (cb) {
			that.readWord2c(ACCEL_ZOUT, function (err, value) {
				data.z = value;
				cb(err);
			});
		}
	], function (err) {
		if (err) return done(err);
		done(null, scaleData(data, ACCEL_LSB_SENSITIVITY));
	});
};

Sensor.prototype.readAccelSync = function () {
	return scaleData({
		x: this.readWord2cSync(ACCEL_XOUT),
		y: this.readWord2cSync(ACCEL_YOUT),
		z: this.readWord2cSync(ACCEL_ZOUT)
	}, ACCEL_LSB_SENSITIVITY);
};

Sensor.prototype.readTemp = function (done) {
	this.readWord2c(TEMP_OUT, function (err, value) {
		if (err) return done(err);
		var temp = value / 340 + 36.53; // In degrees Celcius
		done(null, temp);
	});
};

Sensor.prototype.readTempSync = function () {
	return this.readWord2cSync(TEMP_OUT) / 340 + 36.53;
};

Sensor.prototype.readRotation = function (done) {
	this.readAccel(function (err, accel) {
		if (err) return done(err);

		done(null, {
			x: getXRotation(accel.x, accel.y, accel.z),
			y: getYRotation(accel.x, accel.y, accel.z)
		});
	});
};

Sensor.prototype.readRotationSync = function (accel) {
	if (!accel) {
		accel = this.readAccelSync();
	}

	return {
		x: getXRotation(accel.x, accel.y, accel.z),
		y: getYRotation(accel.x, accel.y, accel.z)
	};
};

Sensor.prototype.readSync = function () {
	var gyro = this.readGyroSync();
	var accel = this.readAccelSync();
	var rotation = this.readRotationSync(accel);
	var temp = this.readTempSync();

	return {
		gyro: gyro,
		accel: accel,
		rotation: rotation,
		temp: temp
	};
};

Sensor.prototype.read = function (done) {
	var gyro, accel, rotation, temp;
	var that = this;
	async.series([
		function (cb) {
			that.readGyro(function (err, data) {
				gyro = data;
				cb(err);
			});
		},
		function (cb) {
			that.readAccel(function (err, data) {
				accel = data;
				cb(err);
			});
		},
		function (cb) {
			that.readTemp(function (err, data) {
				temp = data;
				cb(err);
			});
		}
	], function (err) {
		if (err) return done(err);

		rotation = that.readRotationSync(accel);

		done(null, {
			gyro: gyro,
			accel: accel,
			rotation: rotation,
			temp: temp
		});
	});
};

module.exports = Sensor;
