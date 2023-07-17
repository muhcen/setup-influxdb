import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import createInfluxDBCLient from './influx-client/influx-client';
import { Iinflux } from './interface/Iinflux';
import { Point } from '@influxdata/influxdb-client';
const { InfluxDB, flux } = require('@influxdata/influxdb-client');

@Injectable()
export class AppService {
  private queryApi;
  private writeApi;

  constructor(private configService: ConfigService) {
    const influx: Iinflux = {
      url: this.configService.get<string>('INFLUXDB_URL'),
      token: this.configService.get<string>('DOCKER_INFLUXDB_INIT_ADMIN_TOKEN'),
      org: this.configService.get<string>('DOCKER_INFLUXDB_INIT_ORG'),
      bucket: this.configService.get<string>('DOCKER_INFLUXDB_INIT_BUCKET'),
    };
    const { queryApi, writeApi } = createInfluxDBCLient(influx);
    this.queryApi = queryApi;
    this.writeApi = writeApi;
  }

  async writeInInflux() {
    try {
      const point = new Point('weatherstation')
        .tag('location', 'San Francisco')
        .floatField('temperature', 23.4)
        .timestamp(new Date());

      console.log(point);
      await this.writeApi.writePoint(point);

      console.log('FINISHED ');

      return 'data stored...';
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }

  async readFromInflux() {
    try {
      const query = flux`from(bucket: "${this.configService.get<string>(
        'DOCKER_INFLUXDB_INIT_BUCKET',
      )}") 
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "weatherstation")`;

      const data = await this.queryApi.collectRows(query);

      return data;
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }
}
