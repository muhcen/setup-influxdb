import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import createInfluxDBCLient from './influx-client/influx-client';
import { Iinflux } from './interface/Iinflux';
import { FluxTableMetaData, Point } from '@influxdata/influxdb-client';
import { Interface } from 'readline';
const { InfluxDB, flux } = require('@influxdata/influxdb-client');

@Injectable()
export class AppService {
  private queryApi;
  private writeApi;

  private symbol = 'BTCUSD';
  private interval = '5m';

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
      setInterval(() => {
        const side = Math.random() * 10;
        const amount = Math.floor(Math.random() * 100);
        const price = Math.floor(Math.random() * 10000);
        const total = amount * price;

        this.writeApi.useDefaultTags({
          location: 'server',
          pairs: this.symbol,
          side: side > 5 ? 'buy' : 'sell',
        });
        const point = new Point('trade')
          .floatField('amount', amount)
          .floatField('price', price)
          .floatField('total', total)
          .timestamp(new Date());

        this.writeApi.writePoint(point);

        console.log('FINISHED ');
      }, 2000);

      return 'data stored...';
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }

  async readFromInflux() {
    try {
      const bucket = this.configService.get<string>(
        'DOCKER_INFLUXDB_INIT_BUCKET',
      );
      const start = '-1h';
      const end = 'now()';
      const field = 'price';
      const measurement = 'trade';
      const query = `
      from(bucket: "${bucket}") 
      |> range(start: ${start}, stop:${end})
      |> filter(fn: (r) => r["_measurement"] == "${measurement}" and r["pairs"] == "${this.symbol}" and r["_field"] == "${field}")
      |> aggregateWindow(every: ${this.interval}, fn: first)
      |> fill(usePrevious: true)
      |> yield(name:"open")

      from(bucket: "${bucket}") 
      |> range(start: ${start}, stop:${end})
      |> filter(fn: (r) => r["_measurement"] == "${measurement}" and r["pairs"] == "${this.symbol}" and r["_field"] == "${field}")
      |> aggregateWindow(every: ${this.interval}, fn: max)
      |> fill(usePrevious: true)
      |> yield(name:"high")
      
      from(bucket: "${bucket}") 
      |> range(start: ${start}, stop:${end})
      |> filter(fn: (r) => r["_measurement"] == "${measurement}" and r["pairs"] == "${this.symbol}" and r["_field"] == "${field}")
      |> aggregateWindow(every: ${this.interval}, fn: min)
      |> fill(usePrevious: true)
      |> yield(name:"low")

      from(bucket: "${bucket}") 
      |> range(start: ${start}, stop:${end})
      |> filter(fn: (r) => r["_measurement"] == "${measurement}" and r["pairs"] == "${this.symbol}" and r["_field"] == "${field}")
      |> aggregateWindow(every: ${this.interval}, fn: last)
      |> fill(usePrevious: true)
      |> yield(name:"close")

      from(bucket: "${bucket}") 
      |> range(start: ${start}, stop:${end})
      |> filter(fn: (r) => r["_measurement"] == "${measurement}" and r["pairs"] == "${this.symbol}" and r["_field"] == "${field}")
      |> aggregateWindow(every: ${this.interval}, fn: sum)
      |> fill(usePrevious: true)
      |> yield(name:"volume")
      `;

      let rowsCached = {};
      let rows = [];

      for await (const { values, tableMeta } of this.queryApi.iterateRows(
        query,
      )) {
        const o = tableMeta.toObject(values);
        if (!rowsCached[o._time]) rowsCached[o._time] = [];
        rowsCached[o._time].push(o);
      }

      Object.values(rowsCached).forEach((item: any) => {
        if (item.length) {
          const row = {};

          row['time'] = item[0]._time;
          row['pair'] = item[0].pair;

          item.forEach((item) => (row[item.result] = item._value));

          rows.push(row);
        }
      });

      return rows;
    } catch (error) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }

  getSymbol(): string {
    return `symbol (${this.symbol}): timeframe (${this.interval})`;
  }
}
