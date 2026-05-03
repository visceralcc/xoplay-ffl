// Shared primitives: logos, color stripes, badges, position pills, score numbers

function Mono({children, style={}}) {
  return <span style={{fontFamily:'"JetBrains Mono", ui-monospace, Menlo, monospace', fontSize:11, letterSpacing:0.4, ...style}}>{children}</span>;
}

// Abstract logo — generated from franchise colors. Simple geometric marks.
function FranchiseMark({franchise, size=64, variant=0}) {
  const f = franchise;
  const id = `mark-${f.id}-${variant}`;
  // Different geometric marks per franchise
  const marks = {
    oak: (
      <g>
        <rect x="0" y="0" width={size} height={size} fill={f.primary}/>
        <path d={`M ${size*0.15} ${size*0.85} L ${size*0.5} ${size*0.15} L ${size*0.85} ${size*0.85} Z`} fill={f.secondary}/>
        <rect x={size*0.42} y={size*0.6} width={size*0.16} height={size*0.25} fill={f.primary}/>
      </g>
    ),
    mia: (
      <g>
        <rect x="0" y="0" width={size} height={size} fill={f.primary}/>
        <circle cx={size*0.35} cy={size*0.5} r={size*0.28} fill={f.secondary}/>
        <circle cx={size*0.65} cy={size*0.5} r={size*0.28} fill={f.primary} stroke={f.secondary} strokeWidth={size*0.04}/>
      </g>
    ),
    bro: (
      <g>
        <rect x="0" y="0" width={size} height={size} fill={f.primary}/>
        <rect x={size*0.2} y={size*0.2} width={size*0.6} height={size*0.6} fill="none" stroke={f.secondary} strokeWidth={size*0.06}/>
        <rect x={size*0.4} y={size*0.4} width={size*0.2} height={size*0.2} fill={f.secondary}/>
      </g>
    ),
    san: (
      <g>
        <rect x="0" y="0" width={size} height={size} fill={f.primary}/>
        <path d={`M 0 ${size*0.7} Q ${size*0.25} ${size*0.5} ${size*0.5} ${size*0.7} T ${size} ${size*0.7} L ${size} ${size} L 0 ${size} Z`} fill={f.secondary}/>
        <circle cx={size*0.75} cy={size*0.3} r={size*0.12} fill={f.secondary}/>
      </g>
    ),
    prt: (
      <g>
        <rect x="0" y="0" width={size} height={size} fill={f.primary}/>
        <path d={`M ${size*0.1} ${size*0.8} L ${size*0.35} ${size*0.2} L ${size*0.5} ${size*0.6} L ${size*0.65} ${size*0.2} L ${size*0.9} ${size*0.8} Z`} fill={f.secondary}/>
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block', borderRadius: XO.radius.sm}}>
      {marks[f.id] || marks.oak}
    </svg>
  );
}

// Position label — Barlow Condensed SemiBold, neutral gray (franchise color owns branding)
function Pos({code, size='sm'}) {
  const fs = size==='lg' ? 18 : size==='sm' ? 15 : 16;
  const h  = size==='lg' ? 26 : size==='sm' ? 20 : 22;
  const w  = size==='lg' ? 40 : size==='sm' ? 32 : 36;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      color: XO.gray[700], // ~80% gray (dark 80%)
      fontFamily:'"Barlow Condensed", sans-serif', fontWeight:600,
      fontSize:fs, letterSpacing:0.4, lineHeight:1,
      height:h, minWidth:w, padding:'0 4px',
    }}>{code}</span>
  );
}

// Injury status
function Injury({status}) {
  if (!status) return null;
  const colors = { Q: XO.injury.Q, D: XO.injury.D, O: XO.injury.O, IR: XO.injury.IR };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:16, height:16, borderRadius:2,
      background: colors[status] || XO.gray[400], color:'#fff',
      fontSize:9, fontWeight:700, fontFamily:'"Barlow Condensed", sans-serif',
      letterSpacing:0.3,
    }}>{status}</span>
  );
}

// Live dot
function LiveDot({size=8}) {
  return (
    <span style={{position:'relative', display:'inline-block', width:size, height:size}}>
      <span style={{
        position:'absolute', inset:0, borderRadius:'50%',
        background: XO.status.live,
      }}/>
      <span style={{
        position:'absolute', inset:-4, borderRadius:'50%',
        border:`1px solid ${XO.status.live}`, opacity:0.4,
      }}/>
    </span>
  );
}

// Label - uppercase tiny monospace
function Label({children, style={}, color}) {
  return <div style={{
    fontFamily:'"Barlow Condensed", sans-serif', fontWeight:600,
    textTransform:'uppercase', letterSpacing:1.2, fontSize:11,
    color: color || XO.gray[500], ...style,
  }}>{children}</div>;
}

// Tabular-number score
function ScoreNum({value, size=72, color=XO.gray[950]}) {
  return (
    <span style={{
      fontFamily:'"Barlow Condensed", sans-serif', fontWeight:700,
      fontSize:size, lineHeight:0.9, color, fontVariantNumeric:'tabular-nums',
      letterSpacing:-1,
    }}>{value}</span>
  );
}

// A headshot placeholder — silhouette / number
function Headshot({num=0, bg=XO.gray[200], fg=XO.gray[500], size=44}) {
  return (
    <div style={{
      width:size, height:size, background:bg, borderRadius:XO.radius.md,
      display:'flex', alignItems:'flex-end', justifyContent:'center',
      overflow:'hidden', position:'relative', flexShrink:0,
    }}>
      <svg viewBox="0 0 44 44" width={size} height={size}>
        <circle cx="22" cy="16" r="8" fill={fg} opacity="0.7"/>
        <path d="M 6 44 Q 6 28 22 28 Q 38 28 38 44 Z" fill={fg} opacity="0.7"/>
      </svg>
    </div>
  );
}

Object.assign(window, { Mono, FranchiseMark, Pos, Injury, LiveDot, Label, ScoreNum, Headshot });
