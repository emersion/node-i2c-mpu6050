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

	// Now wake the 6050 up as it starts in sleep mode
	bus.writeByteSync(address, POWER_MGMT_1, 0);
}

Sensor.prototype.readWord = function (cmd) {
	var high = this.bus.readByteSync(this.address, cmd);
	var low = this.bus.readByteSync(this.address, cmd+1);
	var val = (high << 8) + low;
	return val;
};

Sensor.prototype.readWord2c = function (cmd) {
	var val = this.readWord(cmd);
	if (val >= 0x8000) {
		return -((65535 - val) + 1);
	} else {
		return val;
	}
};

Sensor.prototype.readGyro = function () {
	return {
		x: this.readWord2c(0x43),
		y: this.readWord2c(0x45),
		z: this.readWord2c(0x47)
	};
};

Sensor.prototype.readAccel = function () {
	return {
		x: this.readWord2c(0x3b),
		y: this.readWord2c(0x3d),
		z: this.readWord2c(0x3f)
	};
};

Sensor.prototype.readRotation = function (accel) {
	if (!accel) {
		accel = this.readAccel();
	}

	accel = scaleData(accel, 16384);

	return {
		x: getXRotation(accel.x, accel.y, accel.z),
		y: getYRotation(accel.x, accel.y, accel.z)
	};
};

Sensor.prototype.read = function () {
	var gyro = this.readGyro();
	var accel = this.readAccel();
	var rotation = this.readRotation(accel);

	return {
		gyro: gyro,
		gyroScaled: scaleData(gyro, 131),
		accel: accel,
		accelScaled: scaleData(accel, 16384),
		rotation: rotation
	};
};

module.exports = Sensor;