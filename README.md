# node-i2c-mpu6050

Read data from MPU6050 with i2c.

```js
var i2c = require('i2c-bus');
var MPU6050 = require('i2c-mpu6050');

var address = 0x68;
var i2c1 = i2c.openSync(1);

var sensor = new MPU6050(i2c1, address);

var data = sensor.readSync();
console.log(data);
```

## Docs

* MPU6050 datasheet: http://www.invensense.com/mems/gyro/documents/RM-MPU-6000A-00v4.2.pdf
* How to set up i2c:https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c
* Allow i2c to be used without root privileges: `sudo usermod -G i2c pi` then logout and login
