// Power management registers
var POWER_MGMT_1 = 0x6b,
	POWER_MGMT_2 = 0x6c;

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
	this.bus = bus;
	this.address = address;

	// Now wake the MPU6050 up as it starts in sleep mode
	bus.writeByteSync(address, POWER_MGMT_1, 0);
}

Sensor.prototype.readWordSync = function (cmd) {
	var high = this.bus.readByteSync(this.address, cmd);
	var low = this.bus.readByteSync(this.address, cmd+1);
	var val = (high << 8) + low;
	return val;
};

Sensor.prototype.readWord2cSync = function (cmd) {
	var val = this.readWordSync(cmd);
	if (val >= 0x8000) {
		return -((65535 - val) + 1);
	} else {
		return val;
	}
};

Sensor.prototype.readGyroSync = function () {
	return scaleData({
		x: this.readWord2cSync(0x43),
		y: this.readWord2cSync(0x45),
		z: this.readWord2cSync(0x47)
	}, 131);
};

Sensor.prototype.readAccelSync = function () {
	return scaleData({
		x: this.readWord2cSync(0x3b),
		y: this.readWord2cSync(0x3d),
		z: this.readWord2cSync(0x3f)
	}, 16384);
};

Sensor.prototype.readTempSync = function () {
	return this.readWord2cSync(0x41) / 340 + 36.53; // In degrees Celcius
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

module.exports = Sensor;
