# 奶蛙快跑 · 阳光漫游（复刻版）

致敬原作 [naiwa-kuaipao.pages.dev](https://naiwa-kuaipao.pages.dev) 的 3D 三车道无尽跑酷游戏，基于 **Next.js 16 + React 19 + Three.js** 全部重写实现。

![奶蛙快跑](public/logo.svg)

## 玩法

- **三车道跑酷**：← → / A D 换道，↑ / W / 空格 跳跃，↓ / S 滑铲（移动端滑动手势）
- **追兵机制**：受伤后 7 秒内再次受击会被公牛和小狗抓住，累计距离与金币
- **车顶坡道**：跳上卡车车顶可获得高处视野与专属路段
- **道具**：金币、磁铁、护盾
- **街区轮换**：60 秒切换国家主题，10 国建筑风格轮转（埃及 / 中国 / 印度 / 巴西 / 日本 / 美国 / 摩洛哥 / 希腊 / 墨西哥 / 挪威）
- **换装系统**：72 套官方蒙皮网格服装（西装 / Lolita / 宇航服 / 和服 / 汉服 …），bodyCoverage 顶点遮罩，无穿模
- **奶蛙桌宠**：主菜单与结算界面可拖拽甩飞，游戏中实时情绪陪伴（受击哭泣 / 金币微笑 / 破纪录大笑）
- **任务 / 排行榜 / 图鉴 / 商城 / 设置**：localStorage 本地档案

## 技术架构

```
src/
├── app/                 # Next.js 入口（layout / page / globals.css）
├── components/
│   ├── GameShell.tsx    # 全部游戏 UI（菜单、HUD、商城、结算…）
│   ├── NaiwaPet.tsx     # 奶蛙桌宠组件（帧动画 + 甩飞物理）
│   └── ui/toast*        # shadcn/ui Toast（唯一使用的 UI 组件）
└── game/
    ├── stage.ts         # 游戏主控：场景装配、渲染循环、输入、状态机
    ├── engine.ts        # 确定性跑酷模拟（种子随机、20 种障碍、14 种关卡模式）
    ├── character.ts     # 奶蛙/公牛/小狗蒙皮网格 + 72 套换装系统
    ├── animator.ts      # 程序化骨骼动画（跑步/跳跃/滑铲/四足步态）
    ├── art.ts           # 手绘卡通程序纹理系统（13 种 canvas 纹理）
    ├── obstacles.ts     # 全部障碍建模 + 材质合并烘焙
    ├── world.ts         # 24 米街区块系统、轨道、水岸、预制体缓存
    ├── countries.ts     # 10 国建筑生成器 + 地标 + 装饰
    ├── camera.ts        # 追逐相机（摇臂 / 车顶升降 / 受击震动）
    ├── audio.ts         # WebAudio 程序化音效（12 种）+ 合成音乐
    ├── wardrobe.ts      # localStorage 档案、任务、排行榜
    ├── outfit-catalog.ts# 73 套服装目录（与官方 manifest 一致）
    ├── pet.ts           # 桌宠四形态素材清单与加载器
    └── icons.ts         # 内联 SVG 图标
```

## 资产

```
public/assets/
├── characters.bin/.pack      # 三角色蒙皮网格（2962 顶点 / 16 骨骼）
├── character-manifest.json   # 资产清单
├── models/                   # 三角色 PBR 贴图（albedo/normal/metallicRoughness）
├── outfits/                  # 72 套服装网格包
└── pet/                      # 桌宠四形态雪碧图 + 音效
```

## 开发

```bash
bun install        # 或 npm install
bun run dev        # 开发服务器 http://localhost:3000
bun run build      # 生产构建（standalone 输出）
bun run lint       # ESLint
```

## 相关项目

- 桌宠独立版（React 组件 + 单 HTML 复刻）：[43aquarius/naiwa · desktop-pet 分支](https://github.com/43aquarius/naiwa/tree/desktop-pet)
- 角色建模素材复用包（奶蛙/牛/狗 + 72 套服装）：[43aquarius/naiwa · character-models 分支](https://github.com/43aquarius/naiwa/tree/character-models)
