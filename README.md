# 每日心情记录小软件 · Mood Planet

一个轻量的 Android 心情记录 App。每天花几秒选择此刻的状态，留下属于自己的情绪星球。

使用 React Native、Expo 和 TypeScript 开发。这是独立手机 App，也提供复用同一套界面与逻辑的 Web 开发预览。

## 预览

| 今天 | 心情星座 |
| --- | --- |
| ![琉璃星球首页](docs/art-stage-3b/home.jpg) | ![星座轨迹](docs/art-stage-3b/records.jpg) |

琉璃主题用不同天气呈现开心、平静、低落和疲惫；原来的宇宙玻璃舱主题保留在设置中。图片为开发预览，实际内容取决于自己的记录。

## 功能

- **每日心情**：开心、平静、低落、疲惫，点选后自动保存，无需填写文字。一天一条，修改时保留首次记录时间。
- **情绪星球**：飞鸟、暖光、水波、落雨与浓雾，配合软胶按压反馈和缓慢动效。
- **心情星座**：左右滑动查看日期，带空间视差；未来 7 天只展示空白星位，不预测心情。
- **日历与近 30 天统计**：从轨迹进入，查看真实日期、心情和次数。历史心情类型保持原样，不强行转换或删除。
- **昵称与主题**：首次取名，设置中可修改；取消或关闭不保存草稿。昵称、心情和主题分别持久存储。
- **页面衔接**：今天与轨迹共用星球拉远/靠近动画，日历与统计采用轻滑移；连续点击保留最后一个目的地。

没有注册登录、应用自建云同步、标签、AI 分析、小组件或数据导出。当前记录保存在应用本地存储；清除应用数据或卸载前请留意尚无应用内备份功能。Web、Expo Go 和独立 APK 的存储空间不同，不会自动互相同步。

## 安装 Android 版本

安装包将放在本仓库的 [Releases](https://github.com/002li/daily-mood/releases)，不放进源代码 Git 历史。当前 APK 构建与核验完成后会补充版本、架构、校验值和下载链接。

独立安装包会内置 JavaScript 和图片素材，无需运行 Metro 或连接这台电脑。安装文件前请核对发布说明；系统可能要求为下载该文件的应用临时允许安装来源。

**验证边界**：Web 检查及 Android JavaScript 导出已通过；APK 构建、签名核验与真机运行是不同检查。真实手机的键盘、返回键、后台恢复、存储和帧率仍待验收。

## 本地开发

要求 Node.js 22 LTS、npm。当前依赖基于 Expo SDK 57 / React Native 0.86，使用锁文件安装：

```sh
git clone https://github.com/002li/daily-mood.git
cd daily-mood
npm ci
npm run web
```

打开终端给出的地址；开发预览通常为 `http://localhost:8081/`，浏览器宽度上限为 430 像素。独立天气动效样板位于 `/motion-preview`，不写入正式记录。

Android 开发预览：

```sh
npm start
```

在兼容当前 SDK 的 Expo Go 中扫码打开。手机需要能够连接开发服务；真机预览与安装独立 APK 是两种不同方式。Expo Go 获取方式见 [Expo 官方页面](https://expo.dev/go)。

## 检查与构建

```sh
npm run typecheck
npm test
npx expo export --platform web --output-dir dist/web
npx expo export --platform android --output-dir dist/android
```

测试覆盖本地保存、昵称校验、旧记录兼容、日期与统计边界、星座范围、导航队列及镜头路径。`expo export --platform android` 仅导出 JS/资源，不产生 APK。

原生 Android 构建需要 JDK、Android SDK、对应 NDK/CMake，并接受 Android SDK 许可。`android/` 是通过 Expo Prebuild 生成的目录，不提交到仓库。完整本地打包步骤与当前产物信息会记录在 [Android 构建说明](docs/android-build.md)。

也提供手动使用的 `eas.json` 预览配置，`android.buildType` 为 `apk`；需要自己的 Expo 账号、项目和签名凭据：

```sh
npx eas-cli build --platform android --profile preview
```

这条命令会上传构建源码到 Expo，并使用相应账户的构建服务。本轮采用已确认的 GitHub Actions 编译、本地签名流程。仓库的 [Build Android APK](https://github.com/002li/daily-mood/actions/workflows/android-apk.yml) 只允许手动触发，运行检查并生成未签名的双 ARM 架构 APK；工作流不使用签名私钥，也不自动发布 Release。下载未签名产物后仍需本地签名才能安装。可参考 [Expo APK 构建说明](https://docs.expo.dev/build-reference/apk/) 和 [本地发布构建说明](https://docs.expo.dev/guides/local-app-production/)。

## 代码结构

```text
App.tsx                  应用入口、主题与状态 Provider
src/screens/             首次取名、今天、轨迹、日历、统计及动效样板
src/components/          星球、天气、心情选择、设置和昵称编辑
src/navigation/          两个主入口、内部四页路由与空间镜头控制
src/state/               心情、昵称及主题状态
src/storage/             独立存储键、读取校验和写入
src/models/              日期、统计和星座计算
src/theme/               琉璃与玻璃舱配色、材质参数
assets/liuli/            已确认的天气星球图集
docs/                    设计过程、阶段验收和构建说明
```

Android 包名为 `com.moodplanet.daily`，应用显示名称仍为 `Mood`，开发包名称为 `app`。修改包名会产生独立应用，无法直接读取旧包名的记录。

## 项目状态与后续

核心功能、两主题、星座轨迹、子页衔接及昵称编辑已实现。优先验证 Android 真机：首次进入、改名、自动保存、关闭重开、快速切换、实体返回键与键盘遮挡；再根据实际体验修复。

- [昵称编辑与验收](docs/nickname-settings/README.md)
- [日历、统计页面衔接](docs/space-stage-3c/README.md)
- [四页美术与陪伴文案](docs/art-stage-3b/README.md)
- [星球拉远与返回](docs/space-pullback/README.md)
- [历史开发记录](docs/development-history.md)：阶段性记录可能包含旧功能描述，以本页和当前源码为准。

项目尚未添加开源许可证。第三方依赖遵循各自许可证。
