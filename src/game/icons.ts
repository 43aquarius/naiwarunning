/* 内联 SVG 图标库（手绘卡通风格） */
const PATHS: Record<string, string> = {
  coin: '<circle cx="32" cy="32" r="26" fill="#f2a30c"/><circle cx="32" cy="32" r="22" fill="#ffdc2f" stroke="#fffa82" stroke-width="4"/><path d="m32 15 5 11 12 2-9 8 2 13-10-6-11 6 3-13-10-8 13-2z" fill="#fff18a" stroke="#e8a329" stroke-width="2"/>',
  crown: '<path d="m7 19 10 12 14-23 13 23 13-14-7 33H15z" fill="#ffd737" stroke="#ffef91" stroke-width="3"/><path d="M16 43h34v10H16z" fill="#f5b82e"/><path d="m31 28 6 7-6 8-6-8z" fill="#ef7870"/><g fill="#fff4a1"><circle cx="7" cy="17" r="5"/><circle cx="31" cy="8" r="5"/><circle cx="57" cy="17" r="5"/></g>',
  trophy: '<path d="M18 9h28v16c0 12-6 19-14 19S18 37 18 25z" fill="#ffce2f" stroke="#fff09a" stroke-width="3"/><path d="M17 14H7v8c0 10 6 12 13 12m27-20h10v8c0 10-6 12-13 12" fill="none" stroke="#efaf27" stroke-width="6"/><path d="M28 42h8v11H23v6h23v-6H36" fill="#ffdb49"/><path d="m32 17 3 7 8 1-6 5 1 8-6-4-7 4 2-8-6-5 8-1z" fill="#ffed94"/>',
  music: '<path d="M23 14v33m0-31 28-7v33m-28-16 28-7" stroke="#78eeec" stroke-width="8" fill="none" stroke-linejoin="round"/><ellipse cx="15" cy="49" rx="12" ry="9" fill="#62d9f2"/><ellipse cx="43" cy="44" rx="12" ry="9" fill="#91eaff"/><path d="M26 16 48 10" stroke="#fff6b2" stroke-width="4"/>',
  flag: '<path d="M15 58V8" stroke="#ffe7a0" stroke-width="5"/><path d="M18 9q12-9 23 0t17 0v27q-8 7-18-1t-22-1z" fill="#f2635e" stroke="#ffd286" stroke-width="3"/><path d="m35 12 4 7 8 1-6 5 2 8-8-4-7 4 1-8-6-5 8-1z" fill="#ffe45c"/><path d="m7 58 17-1" stroke="#69cbde" stroke-width="5"/>',
  chest: '<path d="M8 29h49v28H8z" fill="#efad23" stroke="#ffec89" stroke-width="3"/><path d="M8 29V20q0-13 23-13t26 13v9z" fill="#268fca" stroke="#a4e2e8" stroke-width="3"/><path d="M18 11v46m26-45v45M8 31h49" stroke="#ffd452" stroke-width="6"/><rect x="26" y="26" width="12" height="17" rx="2" fill="#ffe68a"/><circle cx="32" cy="34" r="3" fill="#996b28"/>',
  shirt: '<path d="m22 9-16 9 8 15 7-4v30h24V29l7 4 8-15-17-9-10 8z" fill="#5cbded" stroke="#fff3b1" stroke-width="3"/><path d="M25 9q7 14 15 0" stroke="#2271ac" stroke-width="6" fill="none"/><ellipse cx="33" cy="38" rx="10" ry="12" fill="#ffdf3d"/><ellipse cx="33" cy="41" rx="7" ry="7" fill="#fff1c6"/><circle cx="29" cy="32" r="2" fill="#294d54"/><circle cx="37" cy="32" r="2" fill="#294d54"/>',
  gear: '<path d="m27 3 11 1 2 9 8 4 9-2 5 10-7 6 1 9 5 7-8 8-9-4-8 3-4 8-11-3-1-10-7-5-9 1-3-11 8-5 1-9-3-8 9-6 8 5z" fill="#7bbce3" stroke="#d8f5ff" stroke-width="3"/><circle cx="32" cy="32" r="14" fill="#3986ba"/><circle cx="32" cy="32" r="8" fill="#ffd559"/>',
  board: '<path d="M11 58Q0 51 10 37L37 6Q48-5 59 8q7 9-3 21L28 58q-8 9-17 0z" fill="#f66568" stroke="#fff0ad" stroke-width="4"/><path d="M18 48 49 15" stroke="#efb354" stroke-width="4"/><path d="m20 59 8-8m-16-4 8-8M47 25l8-9" stroke="#ffd467" stroke-width="3"/><circle cx="10" cy="49" r="4" fill="#4dbfe1"/><circle cx="49" cy="7" r="4" fill="#4dbfe1"/>',
  map: '<path d="m5 12 18-6 19 7 18-7v46l-18 6-19-7-18 7z" fill="#71c5da" stroke="#e2f3be" stroke-width="3"/><path d="M23 6v44m19-37v44" stroke="#399bba" stroke-width="3"/><path d="M13 40q20-30 34-15" fill="none" stroke="#ffe764" stroke-width="5" stroke-dasharray="6 3"/><path d="M49 8c-10 0-14 7-11 14l11 13 10-13c4-8-2-14-10-14" fill="#f37555" stroke="#ffe399" stroke-width="2"/><circle cx="49" cy="18" r="5" fill="#fff1b7"/>',
  shield: '<path d="m32 5 24 10-4 30-20 15L12 45 8 15z" fill="#34bdea" stroke="#c3f7ff" stroke-width="4"/><path d="M32 14v34m-12-19h25" stroke="#fff099" stroke-width="7"/>',
  magnet: '<path d="M12 11v25c0 28 40 28 40 0V11H38v25c0 10-12 10-12 0V11z" fill="#f05b60" stroke="#fff1a4" stroke-width="3"/><path d="M12 11h14v12H12zm26 0h14v12H38z" fill="#c9f0ef"/>',
  star: '<path d="m32 6 8 17 19 2-14 13 4 19-17-10-17 10 4-19L5 25l19-2z" fill="#ffd444" stroke="#fff2b0" stroke-width="3"/>',
  heart: '<path d="M32 56S6 42 6 24C6 12 16 6 24 6c5 0 8 3 8 3s3-3 8-3c8 0 18 6 18 18 0 18-26 32-26 32z" fill="#f2635e" stroke="#ffd6c8" stroke-width="3"/>',
  pause: '<rect x="16" y="12" width="12" height="40" rx="4" fill="#fff"/><rect x="36" y="12" width="12" height="40" rx="4" fill="#fff"/>',
  play: '<path d="M18 8v48l36-24z" fill="#fff"/>',
  home: '<path d="M8 32 32 10l24 22h-7v22H15V32z" fill="#fff"/><rect x="26" y="38" width="12" height="16" fill="#5cbded"/>',
  refresh: '<path d="M12 32a20 20 0 0 1 34-14l8-6v22H32l6-8a12 12 0 0 0-20 6z" fill="#fff" transform="rotate(12 32 32)"/><path d="M52 32a20 20 0 0 1-34 14l-8 6V30h22l-6 8a12 12 0 0 0 20-6z" fill="#fff" transform="rotate(12 32 32)" opacity=".85"/>',
};

const gradients = new Map<string, string>();
let defs: SVGSVGElement | null = null;

export function icon(name: string): string {
  const painted = (PATHS[name] ?? PATHS.flag).replace(/fill="#([a-fA-F0-9]{6})"/g, (match, hex) => {
    if (!gradients.has(hex)) {
      const id = 'nw-grad-' + hex;
      const lerp = (target: [number, number, number]) => {
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        return `#${target.map((t, i) => Math.round([r, g, b][i] * (1 - 0.36) + t * 0.36).toString(16).padStart(2, '0')).join('')}`;
      };
      gradients.set(hex, `<linearGradient id="${id}" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="${lerp([255, 255, 233])}"/><stop offset=".45" stop-color="#${hex}"/><stop offset="1" stop-color="${lerp([115, 92, 117])}"/></linearGradient>`);
    }
    return match; // fill 已在下方统一替换
  });
  /* 汇总渐变定义 */
  const gradientDefs = [...gradients.values()].join('');
  const withGrad = painted.replace(/fill="#([a-fA-F0-9]{6})"/g, (match, hex) => {
    return gradients.has(hex) && gradientDefs.includes(`id="nw-grad-${hex}"`)
      ? `fill="url(#nw-grad-${hex})"` : match;
  });
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>${gradientDefs}</defs><g stroke-linejoin="round">${withGrad}</g></svg>`;
}
