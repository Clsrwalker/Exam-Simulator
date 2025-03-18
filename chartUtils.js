let requestId = null;

/** 转换 Submissions => chart 数据 */
export function transformData(subs, metric) {
  return subs.map((sub, idx) => {
    const val = (metric === 'score') 
      ? (sub.totalScore || 0)
      : (sub.timeSpent || 0);
    const index = idx + 1; 
    let examTitle = sub.examId?.title || 'No Title';
    if (examTitle.length > 20) {
      examTitle = examTitle.slice(0, 20) + '...';
    }
    return { index, value: val, examTitle };
  }).reverse(); // 把最新的放到最右边
}

/** 绘制Canvas图表 */
export function drawCanvasChart(canvas, labelDiv, chartData, metric) {
  const ctx = canvas.getContext('2d');
  const cw  = canvas.width;
  const ch  = canvas.height;

  // 如果有之前的动画请求，先取消
  if (requestId) {
    window.cancelAnimationFrame(requestId);
  }
  ctx.clearRect(0,0,cw,ch);

  const offsetLeft=60, offsetRight=20, offsetTop=20, offsetBottom=50;
  const chartW = cw - offsetLeft - offsetRight;
  const chartH = ch - offsetTop - offsetBottom;
  const stepX = chartW / (chartData.length + 1);

  const values = chartData.map(d => d.value);
  let rawMax = Math.max(...values);
  if (rawMax === -Infinity) rawMax=0;
  const maxVal = rawMax < 20 ? 20 : rawMax+10;
  const minVal = 0;
  const range = maxVal - minVal;

  // 坐标轴
  ctx.strokeStyle='#000';
  ctx.beginPath();
  ctx.moveTo(offsetLeft, offsetTop);
  ctx.lineTo(offsetLeft, offsetTop+chartH);
  ctx.lineTo(offsetLeft+chartW, offsetTop+chartH);
  ctx.stroke();

  ctx.font='14px monospace';
  ctx.fillStyle='#000';

  // X刻度
  for(let i=0; i<chartData.length; i++){
    const x=offsetLeft+stepX*(i+1), y=offsetTop+chartH;
    ctx.beginPath();
    ctx.moveTo(x,y); 
    ctx.lineTo(x,y-5);
    ctx.stroke();
    ctx.textAlign='center';
    ctx.fillText((i+1).toString(), x, y+15);
  }

  // X轴标题
  ctx.save();
  ctx.textAlign='center';
  ctx.font='14px sans-serif';
  ctx.translate(offsetLeft + chartW/2, offsetTop+chartH+40);
  ctx.fillText("Exam Count", 0, 0);
  ctx.restore();

  // Y刻度
  const vStep=4;
  const stepVal=range/vStep;
  ctx.textAlign='right';
  for(let i=0;i<=vStep;i++){
    const val=minVal+stepVal*i;
    const vy=offsetTop+chartH - (val/range)*chartH;
    ctx.beginPath();
    ctx.moveTo(offsetLeft, vy);
    ctx.lineTo(offsetLeft-5, vy);
    ctx.stroke();

    if(metric==='time'){
      ctx.fillText(val.toFixed(0)+'m', offsetLeft-8, vy+3);
    } else {
      ctx.fillText(val.toFixed(0), offsetLeft-8, vy+3);
    }
  }

  // Y轴中部写文本
  ctx.save();
  ctx.translate(offsetLeft-42, offsetTop+chartH/2);
  ctx.rotate(-Math.PI/2);
  ctx.textAlign='center';
  ctx.font='14px sans-serif';
  ctx.fillStyle='#000';
  ctx.fillText(metric==='score' ? 'Score' : 'TimeSpent(min)', 0,0);
  ctx.restore();

  // 计算每个点的位置
  const points = chartData.map((d,i) => {
    const x=offsetLeft+stepX*(i+1);
    const ratio=(d.value-minVal)/range;
    const y=offsetTop+chartH - ratio*chartH;
    return { x, y, val:d.value, index:d.index, title:d.examTitle };
  });

  // 用于动画的起点（从最底部往上）
  const flats = points.map(p => ({ x:p.x, y:offsetTop+chartH }));

  // 绑定鼠标事件
  attachMouseMove(canvas, labelDiv, points, metric);

  let frames=0;
  function animate(){
    requestId=window.requestAnimationFrame(animate);
    frames+=2;
    ctx.clearRect(offsetLeft+1,offsetTop,chartW-2,chartH);

    for(let i=0;i<flats.length;i++){
      if(flats[i].y>points[i].y){
        flats[i].y-=2; // 每帧让点上升一些
      }
    }
    // 连线
    drawLine(ctx, flats);

    // 画点 + 显示数值
    ctx.fillStyle='#000';
    for(let i=0;i<flats.length;i++){
      const px=flats[i].x, py=flats[i].y, val=points[i].val;
      if(metric==='time'){
        ctx.fillText(`${val}m`, px, py-10);
      } else {
        ctx.fillText(`${val}`, px, py-10);
      }
      ctx.beginPath();
      ctx.arc(px,py,3,0,2*Math.PI);
      ctx.fill();
    }

    if(frames>=chartH){
      window.cancelAnimationFrame(requestId);
    }
  }
  requestId=window.requestAnimationFrame(animate);
}

function drawLine(ctx, pts){
  if(!pts.length) return;
  ctx.beginPath();
  ctx.strokeStyle='#82ca9d';
  ctx.lineWidth=2;
  ctx.moveTo(pts[0].x, pts[0].y);
  for(let i=1; i<pts.length; i++){
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
}

/** 鼠标悬停提示 */
function attachMouseMove(canvas, labelDiv, pts, metric){
  canvas.onmousemove=(e)=>{
    labelDiv.style.display='none';
    labelDiv.innerHTML='';
    canvas.style.cursor='default';

    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    for(const p of pts){
      const dx=mx-p.x, dy=my-p.y;
      if(dx*dx+dy*dy<64){
        labelDiv.style.display='block';
        labelDiv.style.left=(p.x+20)+'px';
        labelDiv.style.top=(p.y+20)+'px';
        const valStr=(metric==='time')?`${p.val} min`:p.val;
        labelDiv.innerHTML=`
          <b>Exam #${p.index}</b><br/>
          Value: ${valStr}<br/>
          Title: ${p.title}
        `;
        canvas.style.cursor='pointer';
        break;
      }
    }
  };
}
