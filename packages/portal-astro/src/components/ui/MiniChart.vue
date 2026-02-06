<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';

export interface MiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  smooth?: boolean;
}

const props = withDefaults(defineProps<MiniChartProps>(), {
  width: 200,
  height: 60,
  color: 'blue',
  smooth: true,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

const colorMap = {
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#a855f7',
};

const drawChart = () => {
  if (!canvasRef.value || props.data.length === 0) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = props.width * dpr;
  canvas.height = props.height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, props.width, props.height);

  const max = Math.max(...props.data, 1);
  const min = Math.min(...props.data, 0);
  const range = max - min || 1;

  const padding = 4;
  const chartHeight = props.height - padding * 2;
  const chartWidth = props.width - padding * 2;
  const stepX = chartWidth / (props.data.length - 1 || 1);

  ctx.beginPath();
  ctx.strokeStyle = colorMap[props.color];
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  props.data.forEach((value, index) => {
    const x = padding + index * stepX;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else if (props.smooth && index > 0) {
      const prevX = padding + (index - 1) * stepX;
      const prevY = padding + chartHeight - ((props.data[index - 1] - min) / range) * chartHeight;
      const cpX = (prevX + x) / 2;
      ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      if (index === props.data.length - 1) {
        ctx.lineTo(x, y);
      }
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  if (props.smooth) {
    ctx.lineTo(padding + chartWidth, props.height - padding);
    ctx.lineTo(padding, props.height - padding);
    ctx.closePath();
    ctx.fillStyle = `${colorMap[props.color]}20`;
    ctx.fill();
  }
};

onMounted(() => {
  drawChart();
});

watch(() => [props.data, props.width, props.height, props.color, props.smooth], () => {
  drawChart();
}, { deep: true });
</script>

<template>
  <canvas
    ref="canvasRef"
    :style="{ width: `${width}px`, height: `${height}px` }"
    class="block"
  />
</template>
