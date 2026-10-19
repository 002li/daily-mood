# Android 安装包与本地构建

应用显示名称：Mood；版本：0.1.0；versionCode：1；包名：`com.moodplanet.daily`。源码与浏览器预览复用同一套业务逻辑，但存储空间相互独立。

## 当前状态

APK 正在构建。本机首次依赖下载较慢，项目所有者已确认改用 GitHub Actions 的标准 Linux 环境编译，再下载到本地签名。完成后在此记录真实文件、架构、SHA-256 和签名核验结果。现有 74 项测试、类型检查及 Web/Android JavaScript 导出不能替代 APK 或真机验证。

## 手动 GitHub Actions 构建

打开仓库 Actions 中的 `Build Android APK`，手动执行 `Run workflow`。工作流只读源码，运行类型检查和测试，使用 Java 17 及对应 Android SDK 编译；动作版本固定到已核对的官方提交。没有 push、定时触发或自动发布，也不使用签名私钥。

成功产物为 `mood-android-unsigned`，保留 7 天。它是未签名 APK，不能直接当作可安装版分发；下载后按下文对齐、签名并验证。最终签名包另行放入 Release。工作流文件为 `.github/workflows/android-apk.yml`。

## 构建环境

本地准备使用 Windows、Node.js 22、Microsoft OpenJDK 21 启动 Gradle，Java 17 作为插件编译工具链，以及 Google Android SDK。工具放在项目专用的英文构建目录中，没有改系统 PATH、全局 Java 或系统代理。下列工具同时用于下载产物后的本地核验和签名。

- Android SDK Platform 36 / Build Tools 36.0.0
- NDK 27.1.12297006 / CMake 3.22.1
- Gradle 9.3.1，随当前 Expo Android 模板生成
- Android 最低版本和 ABI 以最终 APK 清单为准

本轮依赖校验提示 `expo ~57.0.30`、`@expo/metro-runtime ~57.0.17` 有可用补丁；当前锁定版本分别为 57.0.28 与 57.0.16。为区分首次原生打包与依赖升级，本轮未自动升级，依赖校验不计为通过。

Android SDK 使用前需要阅读并接受 [Google 的许可](https://developer.android.com/studio#terms-and-conditions)。本轮已由项目所有者确认接受。

## 复现步骤

安装上述工具、配置当前终端的 `JAVA_HOME` / `ANDROID_HOME`，再执行：

```sh
npm ci
npm run typecheck
npm test
npx expo prebuild --platform android --no-install
```

Expo SDK 57 的 Prebuild 默认重新生成原生工程，`--no-clean` 可复用已有原生目录。`android/` 是生成物，不提交 Git。

在 Windows 上建议把构建副本及 SDK 放在英文短路径下。若本机 Node 的目录复制遇到 Access denied，可将 `node_modules/expo/template.tgz` 的 `package/android` 解压到构建副本的 `android/`，再执行 `npx expo prebuild --platform android --no-install --no-clean` 应用配置；不要覆盖手写的原生工程。

生成工程默认可能用开发调试证书签名 Release，不能把它当作正式签名。当前产物将先移除生成工程 Release 中的 `signingConfig signingConfigs.debug`，构建 unsigned Release，再用本地独立证书签名：

```powershell
cd android
.\gradlew.bat :app:assembleRelease --no-daemon --max-workers 2 --console plain "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
```

签名前先用 Android Build Tools 的 `zipalign` 检查/对齐，再使用 `apksigner sign`。密码应从本地受保护文件或环境读取，不要写入命令日志、源码或公开的 Gradle 配置。随后执行：

```sh
apksigner verify --verbose --print-certs Mood-0.1.0.apk
aapt dump badging Mood-0.1.0.apk
```

产物应包含主程序 DEX、Hermes JS bundle、天气图片图集和相应原生库；不是只包含 JS 的导出文件。Release 的 JS/素材内置，打开应用无需 Metro。

## 签名与更新

本轮签名材料保留在工作区被 Git 忽略的 `.codex-tmp/apk-signing/`，不会上传 GitHub。请单独妥善备份密钥及其密码；后续覆盖更新需要使用相同包名和证书，并递增 versionCode。

公开仓库不包含签名密钥、密码、本地 SDK、依赖缓存或 APK。安装包应作为 GitHub Release 附件发布，并附 SHA-256。自行重新打包的证书若不同，不能直接覆盖此 APK。

当前功能不使用相册、外部文件或悬浮窗；`app.json` 已阻止模板合入这三类权限。应用仍保留网络声明及触觉反馈所需振动声明，最终权限以 APK 清单核验为准。

## 真机验收清单

1. 安装后不连接电脑，首次取名，依次选择四种心情。
2. 关闭并重开、必要时重启手机，检查昵称和今天心情。
3. 设置改名，检查保存、取消、键盘遮挡与回车。
4. 今天、轨迹、日历、统计往返及快速点击，检查实体返回键。
5. 检查前后台切换、系统减少动态、大字号、安全区及动画帧率。

如安装失败，请记录手机型号、Android 版本和系统给出的错误。构建与签名核验成功不代表上述真机体验已经通过。
