import { useEffect, useRef, useState } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts'
import { TrendingUp, Activity, Wind, Zap } from 'lucide-react'

// Generate a rich, multi-harmonic breath waveform
const generateWaveform = () => {
    const data = []
    for (let i = 0; i < 60; i++) {
        const t = (i / 60) * Math.PI * 6
        const breath = Math.sin(t) * 0.7 + Math.sin(t * 1.3) * 0.3
        const noise = (Math.random() - 0.5) * 0.05
        const flow = parseFloat((breath + noise).toFixed(3))
        data.push({ t: i, flow, phase: flow > 0.05 ? 'inhale' : flow < -0.05 ? 'exhale' : 'rest' })
    }
    return data
}

const waveData = generateWaveform()

// Calculate waveform stats
const flowValues = waveData.map(d => d.flow)
const peakFlow = Math.max(...flowValues).toFixed(2)
const troughFlow = Math.min(...flowValues).toFixed(2)
const avgFlow = (flowValues.reduce((a, b) => a + Math.abs(b), 0) / flowValues.length).toFixed(2)
// Cycle count = number of zero crossings / 2
let crossings = 0
for (let i = 1; i < flowValues.length; i++) {
    if ((flowValues[i - 1] > 0) !== (flowValues[i] > 0)) crossings++
}
const cycleCount = Math.floor(crossings / 2)
const bpm = Math.round((cycleCount / 60) * 60)

const GRADIENT_ID = 'breathFlowGradient'
const INHALE_GRADIENT_ID = 'inhaleGradient'

const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const v = payload[0].value
        const phase = v > 0.05 ? 'Inhalation' : v < -0.05 ? 'Exhalation' : 'Rest'
        const phaseColor = v > 0.05 ? '#22c55e' : v < -0.05 ? '#f97316' : '#94a3b8'
        return (
            <div style={{
                background: 'rgba(15,23,42,0.92)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '12px',
                color: '#f1f5f9',
                minWidth: 140,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: phaseColor }} />
                    <span style={{ fontWeight: 700, color: phaseColor }}>{phase}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>Flow Rate</div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px', color: '#f1f5f9' }}>
                    {Math.abs(v).toFixed(3)} <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>L/s</span>
                </div>
                <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>t = {payload[0].payload.t}s</div>
            </div>
        )
    }
    return null
}

const StatPill = ({ icon: Icon, label, value, color = 'var(--color-primary)', unit = '' }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        flex: '1 1 130px',
        minWidth: 120,
        transition: 'box-shadow 0.2s',
    }}
        className="stat-pill"
    >
        <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
        }}>
            <Icon size={16} color={color} strokeWidth={2.5} />
        </div>
        <div>
            <div style={{ fontSize: 10, color: 'var(--color-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
                {value}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-muted)', marginLeft: 2 }}>{unit}</span>
            </div>
        </div>
    </div>
)

export default function BreathWaveform() {
    const [animated, setAnimated] = useState(false)
    const [visibleCount, setVisibleCount] = useState(0)
    const intervalRef = useRef(null)

    // Animate waveform drawing by progressively revealing data points
    useEffect(() => {
        setVisibleCount(0)
        setAnimated(false)
        let count = 0
        intervalRef.current = setInterval(() => {
            count += 2
            setVisibleCount(count)
            if (count >= waveData.length) {
                clearInterval(intervalRef.current)
                setAnimated(true)
            }
        }, 30)
        return () => clearInterval(intervalRef.current)
    }, [])

    const displayData = animated ? waveData : waveData.slice(0, visibleCount)

    return (
        <div className="bw-root">
            {/* Zone Legend */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="bw-legend-item">
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(34,197,94,0.6)' }} />
                    <span>Inhalation</span>
                </div>
                <div className="bw-legend-item">
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(249,115,22,0.6)' }} />
                    <span>Exhalation</span>
                </div>
                <div className="bw-legend-item">
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(148,163,184,0.3)' }} />
                    <span>Rest / Transition</span>
                </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={displayData} margin={{ top: 10, right: 16, left: 8, bottom: 20 }}>
                    <defs>
                        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity={0.05} />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id={INHALE_GRADIENT_ID} x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                        dataKey="t"
                        tick={{ fontSize: 10, fill: 'var(--color-subtle)' }}
                        label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -12, fontSize: 11, fill: 'var(--color-muted)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--color-border)' }}
                        tickCount={10}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: 'var(--color-subtle)' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        domain={[-1.2, 1.2]}
                        tickCount={7}
                        label={{ value: 'L/s', angle: -90, position: 'insideLeft', offset: 16, fontSize: 10, fill: 'var(--color-muted)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {/* Zero reference line */}
                    <ReferenceLine y={0} stroke="var(--color-subtle)" strokeDasharray="4 4" strokeWidth={1} />
                    {/* Positive zone (inhale) */}
                    <Area
                        type="monotone"
                        dataKey={(d) => d.flow > 0 ? d.flow : null}
                        stroke="none"
                        fill="url(#inhaleGradient)"
                        connectNulls={false}
                        isAnimationActive={false}
                        dot={false}
                        strokeWidth={0}
                    />
                    {/* Main waveform */}
                    <Area
                        type="monotone"
                        dataKey="flow"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                        fill={`url(#${GRADIENT_ID})`}
                        activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: 'white', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <StatPill icon={TrendingUp} label="Peak Flow" value={peakFlow} unit="L/s" color="#22c55e" />
                <StatPill icon={Activity} label="Trough Flow" value={Math.abs(troughFlow)} unit="L/s" color="#f97316" />
                <StatPill icon={Wind} label="Mean Flow" value={avgFlow} unit="L/s" color="var(--color-primary)" />
                <StatPill icon={Zap} label="Resp. Rate" value={bpm} unit="BPM" color="#a78bfa" />
            </div>

            <style>{`
                .bw-root { width: 100%; }
                .bw-legend-item {
                    display: flex; align-items: center; gap: 6;
                    font-size: 11px; font-weight: 600;
                    color: var(--color-subtle);
                    letter-spacing: 0.3px;
                }
                .stat-pill:hover {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    )
}
