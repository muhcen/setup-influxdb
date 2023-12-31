import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Post('write-in-Influx')
  // writeInInflux() {
  //   return this.appService.writeInInflux();
  // }

  @Post('simulate-btc-data')
  simulate() {
    return this.appService.simulateBTC();
  }
  @Get('read-from-Influx')
  readFromInflux() {
    return this.appService.readFromInflux();
  }

  @Get('symbol')
  getSymbol() {
    return this.appService.getSymbol();
  }
}
