# node-i2c-mpu6050

Read data from MPU6050 with i2c.

```js
var i2c = require('i2c-bus');
var MPU6050 = require('./mpu6050');

var address = 0x68;
var i2c1 = i2c.openSync(1);

var sensor = new MPU6050(i2c1, address);

var data = sensor.readSync();
console.log(data);
```

Datasheet: http://www.invensense.com/mems/gyro/documents/RM-MPU-6000A-00v4.2.pdf
