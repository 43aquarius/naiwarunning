/* 单 HTML 版入口：安装资产 VFS → 挂载 GameShell。
 * import 顺序即执行顺序 —— vfs-install 必须在最前。 */
import './vfs-install';
import { createRoot } from 'react-dom/client';
import GameShell from '@/components/GameShell';

const mount = document.getElementById('root');
if (mount) {
  createRoot(mount).render(<GameShell />);
}
