# Mood Planet · 每日心情记录

一个 Android 心情记录 App，用不同天气的琉璃星球呈现每天的状态。

## 下载

**[下载 Android APK](https://github.com/002li/daily-mood/releases/download/v0.1.0/Mood-0.1.0.apk)**

v0.1.0 · 约 43 MB · Android 7.0 及以上 · 已经用户手机实测，可正常使用。

## 功能

- 开心、平静、低落、疲惫四种心情，点选后自动保存。
- 星座轨迹、日历和近 30 天统计，查看过去的记录。
- 琉璃星球与宇宙玻璃舱两种主题，可修改昵称。

无需注册，数据保存在本机。卸载或清除应用数据会丢失记录，目前不支持备份和同步。

## 截图

| 今天 | 轨迹 |
| --- | --- |
| ![今天](docs/art-stage-3b/home.jpg) | ![轨迹](docs/art-stage-3b/records.jpg) |

## 开发

React Native + Expo + TypeScript，使用 Node.js 22 和 npm。

```sh
git clone https://github.com/002li/daily-mood.git
cd daily-mood
npm ci
npm run web
```

Android 开发预览运行 `npm start`，用兼容的 Expo Go 扫码打开。

```sh
npm run typecheck
npm test
```

APK 构建与签名方法见 [构建说明](docs/android-build.md)。
