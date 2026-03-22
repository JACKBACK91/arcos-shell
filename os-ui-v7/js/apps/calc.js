/* apps/calc.js */
Shell.register('calc', {
  title:'Calculator', icon:'🔢', w:320, h:520,
  build(body) {
    body.className += ' calc-wrap';
    const rows = [
      [{l:'%',c:'op'},{l:'CE',c:'clr'},{l:'C',c:'clr'},{l:'⌫',c:'op'}],
      [{l:'¹/x',c:'op'},{l:'x²',c:'op'},{l:'²√x',c:'op'},{l:'÷',c:'op'}],
      [{l:'7'},{l:'8'},{l:'9'},{l:'×',c:'op'}],
      [{l:'4'},{l:'5'},{l:'6'},{l:'−',c:'op'}],
      [{l:'1'},{l:'2'},{l:'3'},{l:'+',c:'op'}],
      [{l:'+/−'},{l:'0'},{l:'.'},{l:'=',c:'eq'}],
    ];
    body.innerHTML = `
      <div class="calc-hist" id="ch"></div>
      <div class="calc-disp" id="cv">0</div>
      <div class="calc-grid">
        ${rows.map(row => row.map(b =>
          `<button class="cb ${b.c||''}" onclick="cKey('${b.l}')">${b.l}</button>`
        ).join('')).join('')}
      </div>`;
    let expr='', prevOp='', prevVal=null, justEq=false;
    window.cKey = function(k) {
      const cv=body.querySelector('#cv'), ch=body.querySelector('#ch');
      if(k==='C'||k==='CE'){expr='';cv.textContent='0';ch.textContent='';prevOp='';prevVal=null;justEq=false;return;}
      if(k==='⌫'){expr=expr.slice(0,-1)||'';cv.textContent=expr||'0';return;}
      if(k==='+/−'){expr=expr?String(-parseFloat(expr)):'0';cv.textContent=expr;return;}
      if(k==='%'){expr=expr?String(parseFloat(expr)/100):'0';cv.textContent=expr;return;}
      if(k==='x²'){const v=parseFloat(expr||cv.textContent);expr=String(v*v);cv.textContent=expr;ch.textContent=`sqr(${v}) =`;return;}
      if(k==='¹/x'){const v=parseFloat(expr||cv.textContent);expr=v?String(1/v):'Error';cv.textContent=expr;ch.textContent=`1/${v} =`;return;}
      if(k==='²√x'){const v=parseFloat(expr||cv.textContent);expr=String(Math.sqrt(v));cv.textContent=expr;ch.textContent=`√${v} =`;return;}
      if(k==='='){
        if(!prevOp||!expr)return;
        try{const e=`${prevVal}${prevOp.replace('×','*').replace('÷','/').replace('−','-')}${expr}`;
          ch.textContent=`${prevVal} ${prevOp} ${expr} =`;
          const r=Function('"use strict";return('+e+')')();
          cv.textContent=parseFloat(r.toFixed(10));expr='';prevOp='';prevVal=null;justEq=true;
        }catch{cv.textContent='Error';expr='';}
        return;
      }
      if(['÷','×','−','+'].includes(k)){prevVal=expr||cv.textContent;prevOp=k;ch.textContent=`${prevVal} ${k}`;expr='';justEq=false;return;}
      if(justEq){expr=k;justEq=false;}else expr+=k;
      cv.textContent=expr;
    };
  }
});
