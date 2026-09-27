#!/usr/bin/env python3
"""组装奶蛙快跑单文件 HTML：
1. 收集全部资产（重编码贴图 + 原始 pack/manifest/服装/桌宠）→ base64 VFS 表
2. 注入 VFS 补丁 + 编译后 CSS + bun 打包的 IIFE bundle
输出：download/奶蛙快跑单文件版/naiwa-running.html
"""
import base64
import json
from pathlib import Path

ROOT = Path('/home/z/my-project')
MODELS = ROOT / 'build-single/models'          # 重编码后的角色贴图
ASSETS = ROOT / 'public/assets'
CSS = ROOT / 'build-single/game.css'
JS = ROOT / 'build-single/game.js'
OUT = ROOT / 'download/奶蛙快跑单文件版/naiwa-running.html'

TITLE = '奶蛙快跑 · 阳光漫游'


def b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode('ascii')


def collect_vfs() -> dict:
    vfs = {}
    # 1. 角色档案 + 蒙皮网格（原版资产，位元级一致）
    vfs['/assets/character-manifest.json'] = b64(ASSETS / 'character-manifest.json')
    vfs['/assets/characters.pack'] = b64(ASSETS / 'characters.pack')
    # 2. 角色贴图（重编码）
    for f in sorted(MODELS.glob('*.webp')):
        vfs[f'/assets/models/{f.name}'] = b64(f)
    # 3. 72 套服装
    for f in sorted((ASSETS / 'outfits').glob('*.pack')):
        vfs[f'/assets/outfits/{f.name}'] = b64(f)
    # 4. 桌宠
    vfs['/assets/pet/naiwa-pet-atlas.webp'] = b64(ASSETS / 'pet/naiwa-pet-atlas.webp')
    vfs['/assets/pet/smile.mp3'] = b64(ASSETS / 'pet/smile.mp3')
    vfs['/assets/pet/laugh.mp3'] = b64(ASSETS / 'pet/laugh.mp3')
    return vfs


VFS_PATCH = r"""(function(){
'use strict';
var V = window.__NAIWA_VFS__ || {};
function ext(p){ var i=p.lastIndexOf('.'); return i<0?'':p.slice(i+1).toLowerCase(); }
var MIME={json:'application/json',pack:'application/gzip',webp:'image/webp',mp3:'audio/mpeg',bin:'application/octet-stream'};
function toBuf(b){ var s=atob(b),n=s.length,u=new Uint8Array(n); for(var i=0;i<n;i++)u[i]=s.charCodeAt(i); return u.buffer; }
window.__NAIWA_VFS_ON__ = true;
var of = window.fetch ? window.fetch.bind(window) : null;
window.fetch = function(input, init){
  var url = typeof input === 'string' ? input : (input && input.url) ? input.url : String(input);
  var path = url.split('?')[0];
  var hit = V[path];
  if (hit != null) return Promise.resolve(new Response(toBuf(hit), {status:200, headers:{'Content-Type': MIME[ext(path)]||'application/octet-stream'}}));
  if (!of) return Promise.reject(new Error('资源未内嵌且网络不可用: ' + path));
  return of(input, init);
};
var d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
if (d && d.set && d.get) {
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true, enumerable: d.enumerable, get: d.get,
    set: function(v){
      var path = String(v).split('?')[0];
      var hit = V[path];
      if (hit != null) d.set.call(this, 'data:' + (MIME[ext(path)]||'application/octet-stream') + ';base64,' + hit);
      else d.set.call(this, v);
    }
  });
}
})();"""


def esc_script(code: str) -> str:
    """内联 <script> 安全化：把 `</script` 转义为 `<\/script`。
    （React DOM 内部含 `innerHTML="<script></script>"`，会提前闭合标签。）"""
    return code.replace('</script', '<\\/script')


def main():
    vfs = collect_vfs()
    css = CSS.read_text(encoding='utf-8').replace('</style', '<\\/style')
    js = esc_script(JS.read_text(encoding='utf-8'))

    vfs_json = json.dumps(vfs, separators=(',', ':'))

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#8ed4f0">
<title>{TITLE}</title>
<style>
{css}
</style>
</head>
<body>
<div id="root"></div>
<script>window.__NAIWA_VFS__ = {vfs_json};</script>
<script>
{VFS_PATCH}
</script>
<script>
{js}
</script>
</body>
</html>
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    size = OUT.stat().st_size
    print(f'已生成 {OUT}')
    print(f'大小: {size/1024/1024:.2f} MB')
    print(f'VFS 条目: {len(vfs)} 个资产')
    for k in ['/assets/character-manifest.json', '/assets/characters.pack', '/assets/models/runner-1.webp',
              '/assets/outfits/lolita.pack', '/assets/pet/naiwa-pet-atlas.webp']:
        print(f'  {k}: {len(vfs[k])/1024:.0f}KB')


if __name__ == '__main__':
    main()
