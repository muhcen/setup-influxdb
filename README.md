# influxdb setup

for get token we should run this command

`openssl rand -hex 32`

and we get token and set in `.env` file

in the env file we have some property that is necessary for connect to `influxdb` image.

> - DOCKER_INFLUXDB_INIT_MODE=setup
> - DOCKER_INFLUXDB_INIT_HOST=influxdb
> - DOCKER_INFLUXDB_INIT_PORT=8086
> - INFLUXDB_URL=http://influxdb:8086
> - DOCKER_INFLUXDB_INIT_USERNAME=admin
> - DOCKER_INFLUXDB_INIT_PASSWORD=password
> - DOCKER_INFLUXDB_INIT_ORG=my-org
> - DOCKER_INFLUXDB_INIT_BUCKET=my-bucket
> - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=3b598732389a2440683c5c2fb87c68a9af7340a459049e28b90a1d3ef4fdf020
> - DOCKER_INFLUXDB_INIT_RETENTION=4d

## influxdb client

we use this package **`@influxdata/influxdb-client`** for connect to the influxdb node.

### What properties do we need?

- url (host address)
- token (ensure secure interaction between InfluxDB and clients)
- org (An organization is a workspace for a group of users)
- bucket (a named location where time series data is stored)

code example:

```
  const InfluxDBClient = new InfluxDB({
    url,
    token,
  });
  const queryApi = InfluxDBClient.getQueryApi(org);
  const writeApi = InfluxDBClient.getWriteApi(org, bucket);
```

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

.

.

> - all data in InfluxDB have timestamp column and the collection of field-key and field-value pairs and tag keys and tag values(Tags are optional).
> - note: it’s generally a good idea to make use of tags because, unlike fields, tags are indexed.
> - The measurement acts as a container for tags, fields, and the time column. a measurement is conceptually similar to a table
> - A retention policy describes how long InfluxDB keeps data (DURATION) and how many copies of this data is stored in the cluster (REPLICATION).
> - a series is a collection of points that share a measurement, tag set, and field key

# tag or field

Your queries should guide what data you store in tags and what you store in fields :

Store commonly-queried and grouping (group() or GROUP BY) metadata in tags **(like SQL)**.
Store data in fields if each data point contains a different value.
Store numeric values as fields (tag values only support string values).

> **wery important:**
>
> > to reduce memory consumption, consider storing high-cardinality values in field values rather than in tags or field keys.

> **note**: You cannot store more than one point with the same timestamp in a series. If you write a point to a series with a timestamp that matches an existing point, the field set becomes a union of the old and new field set

> note: In InfluxDB you don’t have to define schemas up front.

### point

A point represents a single data record that has four components: a measurement, tag set, field set, and a timestamp.

point example:

```
name: census
-----------------
time butterflies honeybees location scientist
2015-08-18T00:00:00Z 1 30 1 perpetua
```

.

**An InfluxDB database is similar to traditional relational databases. InfluxDB is a schemaless database which means it’s easy to add new measurements, tags, and fields at any time like nosql database.**

.

## important concept in influxdb

**batch**: A collection of data points in InfluxDB line protocol format, separated by newlines (0x0A).

**bucket**: A bucket is a named location where time series data is stored in InfluxDB

**continuous query (CQ)**: An InfluxQL query that runs automatically and periodically within a database.

**database**: A logical container for users, retention policies, continuous queries, and time series data.

**duration**: The attribute of the retention policy that determines how long InfluxDB stores data. Data older than the duration are automatically dropped from the database.

**identifier**: Tokens that refer to continuous query names, database names, field keys, measurement names, retention policy names, subscription names, tag keys, and user names.

**replication factor**: The attribute of the retention policy that determines how many copies of data to concurrently store (or retain) in the cluster. Replicating copies ensures that data is available when a data node (or more) is unavailable.

**retention policy (RP)**: Describes how long InfluxDB keeps data (duration), how many copies of the data to store in the cluster (replication factor), and the time range covered by shard groups (shard group duration). RPs are unique per database and along with the measurement and tag set define a series.

**schema**: How the data are organized in InfluxDB.

**selector**: An InfluxQL function that returns a single point from the range of specified points.

**shard**: A shard contains the actual encoded and compressed data, and is represented by a TSM file on disk.

.

### Timing is everything

**In InfluxDB, a timestamp identifies a single point in any given data series. This is like an SQL database table where the primary key is pre-set by the system and is always time.**

### join in influxDB

SQL JOINs aren’t available for InfluxDB is like an SQL table where the primary index is always pre-set to time. InfluxDB timestamps must be in UNIX epoch (January 1st, 1970 at 00:00:00 UTC).

.

### InfluxDB supports multiple query languages:

#### Flux

**_Flux_** is a data scripting language designed for querying, analyzing, and acting on time series data. Beginning with InfluxDB 1.8.0, Flux is available for production use along side InfluxQL.

#### InfluxQL

InfluxQL is an SQL-like query language for interacting with InfluxDB. It has been crafted to feel familiar to those coming from other SQL or SQL-like environments while also providing features specific to storing and analyzing time series data.

```
SELECT \* FROM "foodships" WHERE "planet" = 'Saturn' AND time > '2015-04-16 12:00:01'
```

.

### InfluxDB is not CRUD

- To update a point, insert one with the same measurement, tag set, and timestamp.
- You can drop or delete a series, but not individual points based on field values. As a workaround, you can search for the field value, retrieve the time, then DELETE based on the time field.
- You can’t update or rename tags yet - see GitHub issue #4157 for more information.
- To modify the tag of a series of points, find the points with the offending tag value, change the value to the desired one, write the points back, then drop the series with the old tag value.
- You can’t delete tags by tag key (as opposed to value) - see GitHub issue #8604.

.
.
.

\***\*Below is a list of some of those design insights that lead to tradeoffs:\*\***

- For the time series use case, we assume that if the same data is sent multiple times, it is the exact same data that a client just sent several times.

- Deletes are a rare occurrence. When they do occur it is almost always against large ranges of old data that are cold for writes.

- Updates to existing data are a rare occurrence and contentious updates never happen. Time series data is predominantly new data that is never updated.

- The vast majority of writes are for data with very recent timestamps and the data is added in time ascending order.

- Scale is critical. The database must be able to handle a high volume of reads and writes.

- Being able to write and query the data is more important than having a strongly consistent view.

- Many time series are ephemeral. There are often time series that appear only for a few hours and then go away, e.g. a new host that gets started and reports for a while and then gets shut down.

- No one point is too important.
