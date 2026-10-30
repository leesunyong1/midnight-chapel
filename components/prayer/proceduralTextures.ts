import * as THREE from 'three';

// Texture cache to prevent recreating textures across re-renders
const textureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreateTexture(
  cacheKey: string,
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    drawFn(ctx, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * 1. 고대 석재 바닥 타일 텍스처 (Medieval Flagstone Floor)
 */
export function getStoneFloorTexture(repeatX = 8, repeatY = 8): THREE.CanvasTexture {
  return getOrCreateTexture(
    `stone-floor-${repeatX}-${repeatY}`,
    512,
    512,
    (ctx, w, h) => {
      // 기본 어두운 모르타르(줄눈) 배경
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      const rows = 8;
      const cols = 8;
      const tileW = w / cols;
      const tileH = h / rows;
      const mortar = 4;

      const stoneTones = [
        '#334155',
        '#3b485c',
        '#2d3748',
        '#475569',
        '#384252',
        '#263040',
        '#404c60',
      ];

      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (tileW * 0.5);
        for (let c = -1; c <= cols; c++) {
          const x = c * tileW + offset + mortar * 0.5;
          const y = r * tileH + mortar * 0.5;
          const tw = tileW - mortar;
          const th = tileH - mortar;

          // 랜덤 석재 색상
          const color = stoneTones[(r * 7 + c * 13 + 3) % stoneTones.length];
          ctx.fillStyle = color;
          ctx.fillRect(x, y, tw, th);

          // 석재 표면 미세 노이즈 & 그라데이션
          const grad = ctx.createLinearGradient(x, y, x + tw, y + th);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
          grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, tw, th);

          // 석재 모서리 음영 (Bevel effect)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1, y + 1, tw - 2, th - 2);

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, tw, th);
        }
      }

      // 모래알/석재 표면 질감 노이즈
      for (let i = 0; i < 4000; i++) {
        const nx = Math.random() * w;
        const ny = Math.random() * h;
        const alpha = Math.random() * 0.08;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(nx, ny, 1.5, 1.5);
      }
    },
    repeatX,
    repeatY
  );
}

/**
 * 2. 석조 성당 벽면 텍스처 (Ashlar Masonry Wall)
 */
export function getStoneWallTexture(repeatX = 6, repeatY = 4): THREE.CanvasTexture {
  return getOrCreateTexture(
    `stone-wall-${repeatX}-${repeatY}`,
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#1e293b'; // 깊은 줄눈 색
      ctx.fillRect(0, 0, w, h);

      const rows = 12;
      const rowHeight = h / rows;
      const mortar = 3;

      const blockTones = [
        '#475569',
        '#526075',
        '#3d4858',
        '#5a677d',
        '#434f62',
        '#4b576b',
      ];

      for (let r = 0; r < rows; r++) {
        const y = r * rowHeight + mortar * 0.5;
        const blockWidth = 75 + ((r * 17) % 35);
        const cols = Math.ceil(w / blockWidth) + 2;
        const rowOffset = (r % 2 === 0 ? 0 : blockWidth * 0.45);

        for (let c = -1; c < cols; c++) {
          const x = c * blockWidth + rowOffset;
          const bw = blockWidth - mortar;
          const bh = rowHeight - mortar;

          const tone = blockTones[(r * 5 + c * 11) % blockTones.length];
          ctx.fillStyle = tone;
          ctx.fillRect(x, y, bw, bh);

          // 벽돌 모서리 마모 효과
          const grad = ctx.createLinearGradient(x, y, x, y + bh);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, bw, bh);

          // 세월의 흔적 (수직 웨더링 얼룩)
          if ((c + r) % 4 === 0) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
            ctx.fillRect(x + bw * 0.2, y, bw * 0.6, bh);
          }
        }
      }

      // 표면 노이즈
      for (let i = 0; i < 5000; i++) {
        const nx = Math.random() * w;
        const ny = Math.random() * h;
        const alpha = Math.random() * 0.09;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(nx, ny, 1.2, 1.2);
      }
    },
    repeatX,
    repeatY
  );
}

/**
 * 3. 앤틱 교회 목재 텍스처 (Church Oak / Walnut Wood)
 */
export function getWoodTexture(repeatX = 2, repeatY = 4): THREE.CanvasTexture {
  return getOrCreateTexture(
    `church-wood-${repeatX}-${repeatY}`,
    512,
    512,
    (ctx, w, h) => {
      // 기본 어두운 오크 바탕
      ctx.fillStyle = '#2b1810';
      ctx.fillRect(0, 0, w, h);

      // 세로 방향 나뭇결 라인들
      const numFibers = 120;
      for (let i = 0; i < numFibers; i++) {
        const x = (i / numFibers) * w;
        const shade = Math.sin(i * 0.35) * 18;
        const r = Math.max(30, Math.min(85, 48 + shade));
        const g = Math.max(18, Math.min(55, 28 + shade * 0.6));
        const b = Math.max(10, Math.min(35, 18 + shade * 0.4));
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 1 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        // 은은한 곡선 웨이브
        const cpX = x + (Math.sin(i * 1.5) * 12);
        ctx.quadraticCurveTo(cpX, h * 0.5, x, h);
        ctx.stroke();
      }

      // 옹이(Wood knot) 포인트
      for (let k = 0; k < 3; k++) {
        const kx = (k + 1) * (w / 4) + (Math.random() * 40 - 20);
        const ky = (k * 160 + 90) % h;
        const grad = ctx.createRadialGradient(kx, ky, 2, kx, ky, 28);
        grad.addColorStop(0, '#1a0c06');
        grad.addColorStop(0.4, '#26120a');
        grad.addColorStop(1, 'rgba(43, 24, 16, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(kx, ky, 18, 32, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // 앤틱 바니시 광택 그라데이션
      const varnish = ctx.createLinearGradient(0, 0, w, 0);
      varnish.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
      varnish.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
      varnish.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = varnish;
      ctx.fillRect(0, 0, w, h);
    },
    repeatX,
    repeatY
  );
}

/**
 * 4. 버건디 벨벳 런너 카펫 & 금사 자수 텍스처 (Burgundy Velvet & Gold Embroidery)
 */
export function getCarpetTexture(repeatX = 1, repeatY = 6): THREE.CanvasTexture {
  return getOrCreateTexture(
    `carpet-burgundy-${repeatX}-${repeatY}`,
    512,
    512,
    (ctx, w, h) => {
      // 진한 리터지컬 버건디 베이스
      ctx.fillStyle = '#6b0d2b';
      ctx.fillRect(0, 0, w, h);

      // 벨벳 직조 결 (Woven textile texture)
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = y % 6 === 0 ? 'rgba(0, 0, 0, 0.14)' : 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(0, y, w, 1.5);
      }

      // 중앙 음영 그라데이션 (중앙 하이라이트, 양쪽 끝 깊은 벨벳 음영)
      const centerGrad = ctx.createLinearGradient(0, 0, w, 0);
      centerGrad.addColorStop(0, 'rgba(30, 4, 12, 0.6)');
      centerGrad.addColorStop(0.12, 'rgba(131, 24, 67, 0.4)');
      centerGrad.addColorStop(0.5, 'rgba(159, 18, 57, 0.7)');
      centerGrad.addColorStop(0.88, 'rgba(131, 24, 67, 0.4)');
      centerGrad.addColorStop(1, 'rgba(30, 4, 12, 0.6)');
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, w, h);

      // 양측 골드 자수 테두리 (Gold Embroidery Borders)
      const borderWidth = 32;
      const drawGoldBorder = (bx: number) => {
        // 골드 리본
        const goldGrad = ctx.createLinearGradient(bx, 0, bx + borderWidth, 0);
        goldGrad.addColorStop(0, '#78350f');
        goldGrad.addColorStop(0.5, '#fbbf24');
        goldGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = goldGrad;
        ctx.fillRect(bx, 0, borderWidth, h);

        // 자수 다이아몬드 패턴
        ctx.fillStyle = '#451a03';
        for (let py = 0; py < h; py += 24) {
          ctx.beginPath();
          ctx.moveTo(bx + borderWidth * 0.5, py);
          ctx.lineTo(bx + borderWidth - 4, py + 12);
          ctx.lineTo(bx + borderWidth * 0.5, py + 24);
          ctx.lineTo(bx + 4, py + 12);
          ctx.closePath();
          ctx.fill();

          // 중앙 골드 포인트
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(bx + borderWidth * 0.5 - 2, py + 10, 4, 4);
          ctx.fillStyle = '#451a03';
        }
      };

      drawGoldBorder(12);
      drawGoldBorder(w - borderWidth - 12);
    },
    repeatX,
    repeatY
  );
}

/**
 * 5. 고딕 대성당 장미창(Rose Window) 스테인드글라스 텍스처 (1024×1024)
 */
export function getStainedGlassRoseTexture(): THREE.CanvasTexture {
  return getOrCreateTexture(
    'stained-glass-rose',
    1024,
    1024,
    (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = w * 0.48;

      // 배경 암흑 (납선 림)
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, w, h);

      // 방사형 고딕 12꽃잎 스테인드글라스
      const numPetals = 12;
      const jewelColors = [
        '#0284c7', // 코발트 사파이어
        '#b91c1c', // 루비 레드
        '#d97706', // 앰버 토파즈
        '#7e22ce', // 아메시스트 바이올렛
        '#059669', // 에메랄드 그린
        '#0ea5e9', // 스카이 블루
      ];

      // 1. 외곽 고딕 아치 링
      for (let i = 0; i < numPetals * 2; i++) {
        const a1 = (i / (numPetals * 2)) * Math.PI * 2;
        const a2 = ((i + 1) / (numPetals * 2)) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR, a1, a2);
        ctx.arc(cx, cy, maxR * 0.78, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = jewelColors[i % jewelColors.length];
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#020408';
        ctx.stroke();
      }

      // 2. 중간 12 란셋 엽편 (Petals)
      for (let i = 0; i < numPetals; i++) {
        const angle = (i / numPetals) * Math.PI * 2;
        const a1 = angle - (Math.PI / numPetals) * 0.85;
        const a2 = angle + (Math.PI / numPetals) * 0.85;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR * 0.76, a1, a2);
        ctx.closePath();
        ctx.fillStyle = jewelColors[(i * 2 + 1) % jewelColors.length];
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#020408';
        ctx.stroke();

        // 내부 서브 디테일 (트레포일 / 삼엽형)
        const midR = maxR * 0.52;
        const px = cx + Math.cos(angle) * midR;
        const py = cy + Math.sin(angle) * midR;
        ctx.beginPath();
        ctx.arc(px, py, maxR * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = jewelColors[(i * 3 + 2) % jewelColors.length];
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#020408';
        ctx.stroke();
      }

      // 3. 중심 메달리온 (Holy Light Medallion)
      const centerR = maxR * 0.28;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, centerR);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.3, '#f59e0b');
      grad.addColorStop(0.7, '#b45309');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
      ctx.fill();

      // 중심 십자가 납선
      ctx.strokeStyle = '#090a0f';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(cx, cy - centerR);
      ctx.lineTo(cx, cy + centerR);
      ctx.moveTo(cx - centerR, cy);
      ctx.lineTo(cx + centerR, cy);
      ctx.stroke();

      // 외곽 두꺼운 철제 림
      ctx.strokeStyle = '#03050a';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.stroke();
    },
    1,
    1
  );
}

/**
 * 6. 고딕 뾰족 아치 란셋 창문 스테인드글라스 텍스처 (Lancet Window)
 */
export function getStainedGlassLancetTexture(theme: 'blue' | 'amber' | 'purple' = 'blue'): THREE.CanvasTexture {
  return getOrCreateTexture(
    `stained-glass-lancet-${theme}`,
    512,
    1024,
    (ctx, w, h) => {
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, w, h);

      const colorPalette = {
        blue: ['#0369a1', '#0284c7', '#38bdf8', '#1e40af', '#b91c1c'],
        amber: ['#b45309', '#d97706', '#f59e0b', '#fbbf24', '#7c2d12'],
        purple: ['#6b21a8', '#7e22ce', '#a855f7', '#c084fc', '#0284c7'],
      }[theme];

      // 다이아몬드 쿼리(Diamond Quarries) 격자
      const stepX = 42;
      const stepY = 64;

      for (let y = 30; y < h - 30; y += stepY) {
        for (let x = 30; x < w - 30; x += stepX) {
          const shift = ((y / stepY) % 2) * (stepX * 0.5);
          const px = x + shift;

          ctx.beginPath();
          ctx.moveTo(px, y - stepY * 0.5);
          ctx.lineTo(px + stepX * 0.5, y);
          ctx.lineTo(px, y + stepY * 0.5);
          ctx.lineTo(px - stepX * 0.5, y);
          ctx.closePath();

          const colorIdx = Math.floor((Math.sin(px * 0.1) + Math.cos(y * 0.1) + 2) * 3) % colorPalette.length;
          ctx.fillStyle = colorPalette[colorIdx];
          ctx.fill();

          ctx.strokeStyle = '#05070e';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      // 아치형 테두리 납선 프레임
      ctx.strokeStyle = '#020408';
      ctx.lineWidth = 20;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // 중앙 십자가 또는 성물 엠블럼
      ctx.fillStyle = '#fef08a';
      const my = h * 0.45;
      ctx.beginPath();
      ctx.arc(w / 2, my, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#020408';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(w / 2 - 8, my - 32, 16, 64);
      ctx.fillRect(w / 2 - 24, my - 12, 48, 16);
    },
    1,
    1
  );
}

/**
 * 7. 밝은 대리석 제단 텍스처 (Carrara Marble Altar)
 */
export function getMarbleTexture(): THREE.CanvasTexture {
  return getOrCreateTexture(
    'carrara-marble',
    512,
    512,
    (ctx, w, h) => {
      // 밝은 아이보리/백색 대리석 바탕
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, w, h);

      // 연한 회색/골드 마블 마블링(대리석 결)
      for (let v = 0; v < 14; v++) {
        ctx.strokeStyle = v % 3 === 0 ? 'rgba(217, 119, 6, 0.12)' : 'rgba(100, 116, 139, 0.18)';
        ctx.lineWidth = 1 + Math.random() * 3;
        ctx.beginPath();
        let currX = Math.random() * w;
        let currY = 0;
        ctx.moveTo(currX, currY);

        while (currY < h) {
          currX += (Math.random() - 0.5) * 45;
          currY += 25 + Math.random() * 35;
          ctx.lineTo(currX, currY);
        }
        ctx.stroke();
      }

      // 표면 은은한 광택 노이즈
      for (let i = 0; i < 2000; i++) {
        const nx = Math.random() * w;
        const ny = Math.random() * h;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(nx, ny, 2, 2);
      }
    },
    2,
    2
  );
}
