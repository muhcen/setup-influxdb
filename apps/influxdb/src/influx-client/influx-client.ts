import { InfluxDB } from '@influxdata/influxdb-client';
import { ConfigService } from '@nestjs/config';
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
