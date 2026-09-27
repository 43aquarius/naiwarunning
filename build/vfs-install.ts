/* 单 HTML 版资产虚拟文件系统：把 fetch / Image.src 拦截到内嵌 base64 资产。
 * 该模块必须在一切游戏模块之前执行（main.tsx 中置于首个 import）。 */

export const VFS_KEY = '__NAIWA_VFS__';

interface VfsTable { [path: string]: string }

function table(): VfsTable {
  return (window as unknown as Record<string, VfsTable>)[VFS_KEY] ?? {};
}

function extOf(p: string): string {
  const i = p.lastIndexOf('.');
  return i < 0 ? '' : p.slice(i + 1).toLowerCase();
}

const MIME: Record<string, string> = {
  json: 'application/json',
  pack: 'application/gzip',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  bin: 'application/octet-stream',
};

function b64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function installVfs(): void {
  if ((window as unknown as Record<string, boolean>).__NAIWA_VFS_ON__) return;
  (window as unknown as Record<string, boolean>).__NAIWA_VFS_ON__ = true;

  /* fetch：/assets/** → 内嵌数据 */
  const V = table();
  const origFetch = window.fetch?.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url ?? '';
    const path = url.split('?')[0];
    const hit = V[path];
    if (hit != null) {
      return Promise.resolve(new Response(b64ToBuffer(hit), {
        status: 200,
        headers: { 'Content-Type': MIME[extOf(path)] || 'application/octet-stream' },
      }));
    }
    if (!origFetch) return Promise.reject(new Error('网络不可用且未内嵌该资源: ' + path));
    return origFetch(input as RequestInfo, init);
  }) as typeof window.fetch;

  /* Image.src：/assets/** → data: URI */
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (desc?.set && desc.get) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set(this: HTMLImageElement, v: string) {
        const path = String(v).split('?')[0];
        const hit = V[path];
        if (hit != null) {
          desc.set!.call(this, 'data:' + (MIME[extOf(path)] || 'application/octet-stream') + ';base64,' + hit);
        } else {
          desc.set!.call(this, v);
        }
      },
    });
  }
}
