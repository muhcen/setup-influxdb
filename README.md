# influxdb

for get token we should run this command

openssl rand -hex 32

in the env file we have some property that is necessary for connect to influxdb image.

DOCKER_INFLUXDB_INIT_MODE=setup

DOCKER_INFLUXDB_INIT_HOST=influxdb
DOCKER_INFLUXDB_INIT_PORT=8086

INFLUXDB_URL=http://influxdb:8086

DOCKER_INFLUXDB_INIT_USERNAME=admin
DOCKER_INFLUXDB_INIT_PASSWORD=password
DOCKER_INFLUXDB_INIT_ORG=my-org
DOCKER_INFLUXDB_INIT_BUCKET=my-bucket
DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=3b598732389a2440683c5c2fb87c68a9af7340a459049e28b90a1d3ef4fdf020
DOCKER_INFLUXDB_INIT_RETENTION=4d

## influxdb client

import { InfluxDB } from '@influxdata/influxdb-client';

import { Iinflux } from '../interface/Iinflux';

const createInfluxDBCLient = (influx: Iinflux) => {
const { url, token, org, bucket } = influx;

const InfluxDBClient = new InfluxDB({
url,
token,
});
const queryApi = InfluxDBClient.getQueryApi(org);
const writeApi = InfluxDBClient.getWriteApi(org, bucket);

return { queryApi, writeApi };
};

export default createInfluxDBCLient;

we use `@influxdata/influxdb-client` for connect to influxdb node.

## api

we write two api for read and write in influxdb.

```
async writeInInflux() {
    try {
      const point = new Point('weatherstation')
        .tag('location', 'San Francisco')
        .floatField('temperature', 23.4)
        .timestamp(new Date());

      this.writeApi.writePoint(point);

      console.log('FINISHED');

      return 'data stored...';
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }
```

```
  async readFromInflux() {
    try {
      const query = flux`from(bucket: "${this.configService.get<string>(
        'DOCKER_INFLUXDB_INIT_BUCKET',
      )}")
      |> range(start: -1d)
      |> filter(fn: (r) => r._measurement == "weatherstation")`;

      const data = await this.queryApi.collectRows(query);

      return data;
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }
```
