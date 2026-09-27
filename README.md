# 奶蛙快跑 · 阳光漫游 —— 单文件 HTML 版

主项目（Next.js + Three.js 复刻版）的**单 HTML 复刻**：双击 `naiwa-running.html` 即可离线游玩，无需安装任何依赖、无需网络。

## 文件说明

| 文件 | 说明 |
|------|------|
| `naiwa-running.html` | 完整游戏（约 25.7MB），浏览器直接打开即玩 |
| `build/` | 构建脚本与入口源码（见下） |

## 内嵌内容

- **游戏全部代码**：React + Three.js 引擎、确定性 3 车道跑酷模拟、10 国地图、20 种障碍、程序化纹理与音效
- **角色资产**：奶蛙/公牛/小狗原版蒙皮网格（characters.pack + manifest，位元级一致）、9 张 PBR 贴图（重编码至视觉无感，PSNR 37~41dB）
- **72 套服装**：全部原版服装网格包（可购买/试穿/穿戴）
- **奶蛙桌宠**：四形态雪碧图 + 音效，主菜单可拖拽甩飞、连点大笑，游戏中情绪联动

资产通过 base64 虚拟文件系统（VFS）内嵌：补丁拦截 `fetch` 与 `Image.src`，游戏代码与主项目**零差异**。

## 玩法

- `← →` 换道　`↑ / 空格` 跳跃　`↓` 滑铲　`P / Esc` 暂停
- 触屏：划动手势操作
- 金币可在商城购买服装；七秒内连撞两次会被追兵抓住

## 如何构建

在主项目根目录（Next.js 工程）执行：

```bash
# 1. 重编码角色贴图（3.6MB → 253KB）
python3 scripts/single_html_textures.py

# 2. 编译 Tailwind CSS
bun scripts/build_single_html_css.mjs

# 3. 打包 JS（React + Three.js + 游戏代码 → IIFE）
bun build src/single-html/main.tsx --outfile build-single/game.js \
  --format=iife --target=browser --production

# 4. 组装单 HTML（注入 VFS + CSS + JS）
python3 scripts/build_single_game_html.py
```

构建入口 `src/single-html/`：
- `main.tsx`：安装 VFS → createRoot 挂载 GameShell
- `vfs-install.ts`：fetch / Image.src 拦截器

## 版本

- 对应主项目：奶蛙快跑复刻版（v6.4.0 官方蒙皮网格资产）
- 生成时间：2026-09
