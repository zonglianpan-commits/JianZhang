# 见账 · JianZhang Ledger

一个本地优先、移动端优先的个人财务记账工具，支持可选的账号同步。资产、负债、收入、支出、还款和账户转账都在同一本账中完成。**初次打开不包含任何个人数据。**

## 已实现（V1.0）

| 功能 | 说明 |
|---|---|
| 资产 | 现金、银行卡、微信、支付宝、投资、其他资产；支持开户余额、编辑、账户余额自动计算 |
| 负债 | 登记当前未还本金和债权人；记录还款后自动更新剩余本金 |
| 收支分类 | 餐饮、出行、社交人情、购物、工作成本、生活缴费、烟酒、还款 |
| 收入记录 | 工资、副业、投资、其他收入 |
| 还款 | 本金不算消费；利息算当月支出；资产减少本金+利息，负债减少本金 |
| 转账 | 账户之间移动资金，不改变总资产和净资产 |
| 统计 | 月度收入、支出、余额、分类比例、本金、利息 |
| 数据 | 本机 localStorage；JSON 全量备份与导入；CSV 流水导出；删除流水后重新计算 |
| PWA | 支持 PWA 的浏览器添加到主屏幕；HTTPS 环境下静态资源可离线缓存 |

## 六个交互动效

1. 完成反馈：按键变圆、对勾、粒子飞散。
2. 待办勾选：数字、进度条、完成配色即时联动。
3. 叠卡展开：资产 / 负债 / 净资产三层错位叠放、展开收起。
4. 时间线：横向滚动自动居中吸附，停稳后再逐段画线。
5. 月份滚轮：拖动或鼠标滚轮带惯性，超过边界会弹性回弹。
6. 页面切换：从点按位置做圆形扩散揭示。尊重系统“减少动态效果”偏好。

## 本地运行

该项目没有需要安装的 JS 依赖。解压后在项目文件夹执行：

```bash
python -m http.server 8000
```

浏览器访问 `http://localhost:8000`。此时就能记账。直接双击 `index.html` 也可能工作，但 `file://` 模式下不同浏览器的本地存储规则不一致，不建议正式使用。

## App 下载和安装网页

- 官网安装页：https://zonglianpan-commits.github.io/JianZhang/download.html
- 记账网页版：https://zonglianpan-commits.github.io/JianZhang/
- 当前提供的是 PWA 网页应用，尚无 Android APK / iOS IPA 文件。
- Android 使用 Chrome 的「安装应用 / 添加到主屏幕」；Safari iPhone 使用分享菜单的「添加到主屏幕」。
- 安装页不会收集账本记录；个人财务数据仍只保存在设备浏览器本地，清除数据或卸载可能丢失记录。

## Android APK（测试预览版）

- **[直接下载 Android APK](https://github.com/zonglianpan-commits/JianZhang/releases/download/v1.0.0-android-preview/JianZhang-v1.0.0-preview.apk)**
- **[见账 App 安装网页](https://zonglianpan-commits.github.io/JianZhang/download.html)**：安卓支持 APK，iPhone 仍提供 Safari「添加到主屏幕」方式。
- APK 通过 Android 原生 WebView + WebViewAssetLoader 加载打包在应用内部的静态页面，不依赖手机联网。**没有网络权限**。
- APK 与网页 PWA 各自存储财务数据，**不自动同步**。导入迁移需在网页版导出 JSON，再通过 APK「我的」→「导入 JSON」。
- APK 目前使用 **debug 测试签名**，仅作功能测试。后续安装新的不同签名版本前必须导出数据备份；请勿在未备份状态下卸载 APK。
- 正式版需要配置稳定签名密钥，妥善保管，不可上传公开仓库。详见 `android/README.md`。

## GitHub 部署和 Android 安装

1. 在自己的 GitHub 账号创建专用仓库（建议名称 `JianZhang`）。
2. 将本项目根目录内文件上传到仓库根目录。**不要上传任何导出的个人账本 JSON / CSV。**
3. 如需通过 GitHub Pages 使用，在仓库 Settings → Pages 中将构建来源设为 **GitHub Actions**，提交到 `main` 后会触发项目自带的 `pages.yml` 自动部署。不同账号的私有仓库 Pages 权限可能有所不同，**部署出的 Pages 网站可能公开可访问**。
4. 通过 HTTPS 打开发布的网址，在 Android Chrome 的菜单中选择“添加到主屏幕”或“安装应用”（具体措辞因版本而异）。
5. 每次重要财务数据变更后，建议进入“我的”导出 JSON 备份并妥善保管。

## 账务规则与注意事项

- 初始余额只是**建账时点**的基准余额。录入历史收入支出前请确认不会重复计算。
- 期初负债指**当前尚欠本金**，不会自动增加现金账户。如果你同时录入“新借款到账”作为收入，请注意该笔钱是借入资金，不应视作经营收入。V1 暂未提供专门的新增借款到账联动流水类型。
- 已关联流水的账户或负债不能直接删除，防止账本关系断裂。
- 如果余额不足或还款本金超过剩余负债，系统会拒绝创建该流水。
- 部分复杂情形尚未覆盖：应收应付、分期计划、债务利息计提、资产市值变动、多人分账、跨设备实时同步、币种换算。不要用本工具直接替代专业会计软件。

## 隐私与安全

**个人数据仅保存在当前设备/当前浏览器的 localStorage；没有账号系统、数据库、埋点或第三方网络请求。** 托管在 GitHub 的是静态代码，不是你的财务数据。

- V1 本机数据与导出的 JSON **尚未加密**。不要在公用设备中录入敏感财务资料；备份文件要自行加密保管。
- 清除浏览器网站数据、换机、卸载应用或清理 App 数据可能导致不可恢复的数据丢失。定期备份是必要条件。
- PWA 的本机存储与所在网站的**域名**相关。如果更换访问域名，数据不会自动迁移，应使用 JSON 导出 / 导入。
- 代码仓库中不应提交任何真实账号、债务信息和账本备份文件。

## 项目结构

```text
index.html                 页面入口
app.js                     账务引擎、界面逻辑及 6 个动效
styles.css                 深色响应式设计
manifest.webmanifest       可安装 PWA 配置
sw.js                      离线静态资源缓存
cloud-config.js             云端公共配置（初始为空）
cloud-sync.js               账号登录、同步与冲突检测
android/                    Android 原生 WebView APK 工程
ios/                        Apple iOS SwiftUI 工程
docs/                      SQL 数据表与配置教程
icons/                     SVG + PNG 应用图标
.github/workflows/ci.yml     GitHub Actions 基础检查
.github/workflows/pages.yml  GitHub Pages 部署
```

V1.1 · 离线优先 · 云同步按需启用
## V1.1 跨设备账号同步与安装网站

- 安卓 APK 可从 [见账下载站](https://zonglianpan-commits.github.io/JianZhang/download.html) 直接下载，安装包镜像由 GitHub Pages 提供，无需登录 GitHub。
- iPhone 可使用 Safari 打开同一安装站点，点击分享 → 添加到主屏幕；若需原生 IPA/TestFlight 需要 Apple 签名。
- 账号同步客户端已集成，**目前仅提供可配置模块，尚未接入实际云服务，不能直接注册登录**。需创建 Supabase 项目，执行 `docs/supabase.sql` 并配置 `cloud-config.js` 的公开 URL + publishable key。详见 [配置指南](docs/CLOUD_SETUP.md)。
- 登录后数据隔离至对应账号本地账本。云同步使用版本号检测冲突，默认不静默覆盖。
- 离线记账继续可用；云端数据尚未提供端到端加密。**任何公开仓库都不能提交真实账目和机密密钥**。
