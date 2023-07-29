import { Point } from '@influxdata/influxdb-client';

export function generateBTC(startPrice) {
  let currentPrice = startPrice;
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);

  let records = [];
  for (let index = 0; index < 24 * 60 * 60; index++) {
    let priceChange = Math.floor(Math.random() * 100);

    if (Math.random() > 0.508) priceChange *= -1;
    currentPrice += priceChange;

    currentDate.setSeconds(currentDate.getSeconds() + 1);

    const point = new Point('btcusd')
      .tag('location', 'server')
      .tag('pairs', 'BTCUSD')
      .floatField('price', currentPrice)
      .timestamp(new Date(currentDate));

    records.push(point);
  }

  return records;
}
