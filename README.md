# rainy-talk-api

To install dependencies:

```bash
yarn install
```

To run:

```bash
yarn dev
```

build docker image

```
yarn docker:build
```

push docker image

```
yarn docker:push
```

## GCE

show logs

```
# /var/log/rainy-talk-api/log.logにログが出力される
tail -n 1000 -f /var/log/rainy-talk-api/log.log
```

show log size

```
# logのファイルサイズを出力
du -h /var/log/rainy-talk-api/log.log
```
