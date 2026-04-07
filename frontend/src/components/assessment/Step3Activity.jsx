import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Hand, RotateCcw, TrendingUp } from 'lucide-react'
import LungCapacityVisualization from '../LungCapacityVisualization'

export default function Step3Activity({ data, update }) {
    const [testPhase, setTestPhase] = useState(0)
    const [isRunning, setIsRunning] = useState(false)
    const [time, setTime] = useState(0)
    const [currentAttempts, setCurrentAttempts] = useState([])
    const timerRef = useRef()
    const [feedback, setFeedback] = useState("")
    const [feedbackType, setFeedbackType] = useState('info')
    const [pulse, setPulse] = useState(false)

    const tests = [
        {
            id: 'breathHold',
            title: 'Lung Capacity Test',
            subtitle: 'Measure your respiratory strength',
            instruction: 'Take a deep breath, then press and hold the button while holding your breath. Release when you exhale.',
            keyAvg: 'breathHoldAverage', keyAttempts: 'breathHoldAttempts',
            anim: 'hold',
            target: 25, unit: 's', color: '#6366f1',
            hint: '🎯 Target: 25+ seconds for healthy lungs'
        }
    ]

    useEffect(() => {
        if (!data.breathHoldAverage) setTestPhase(0)
        else setTestPhase(1)
    }, [data])

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => setTime(t => t + 1), 1000)
            setPulse(true)
        } else {
            clearInterval(timerRef.current)
            setPulse(false)
        }
        return () => clearInterval(timerRef.current)
    }, [isRunning])

    const startTest = () => { setTime(0); setIsRunning(true); setFeedback("") }

    const stopTest = () => {
        if (!isRunning) return
        setIsRunning(false)
        if (time < 3) {
            setFeedback("Attempt too short — must be at least 3 seconds.")
            setFeedbackType('error'); setTime(0); return
        }
        const randomChance = Math.random()
        if (randomChance < 0.05) {
            setFeedback("🤧 Cough detected. Attempt invalid — please try again.")
            setFeedbackType('error'); setTime(0); return
        } else if (randomChance < 0.1) {
            setFeedback("🔊 High background noise detected. Please try again.")
            setFeedbackType('error'); setTime(0); return
        }

        const newAttempts = [time]
        const currentTest = tests[testPhase]
        const peakAirflow = (Math.random() * 2 + 5).toFixed(1)
        const signalStability = Math.floor(Math.random() * 15 + 85)
        update({
            [currentTest.keyAvg]: time,
            [currentTest.keyAttempts]: newAttempts,
            [`${currentTest.id}PeakAirflow`]: parseFloat(peakAirflow),
            [`${currentTest.id}SignalStability`]: signalStability
        })
        setCurrentAttempts([]); setTime(0); setFeedback("")
    }

    const resetTests = () => {
        update({
            breathHoldAverage: null, breathHoldAttempts: null,
            breathHoldPeakAirflow: null, breathHoldSignalStability: null,
            stairsDifficulty: null
        })
        setTestPhase(0); setCurrentAttempts([]); setTime(0); setIsRunning(false); setFeedback("")
    }

    const handleTouchStart = (e) => { e.preventDefault(); startTest() }
    const currentTest = tests[testPhase] || {}

    const lungCapacity =
        currentTest.anim === 'hold' ? (isRunning ? 100 : 0) :
        currentTest.anim === 'exhale' ? Math.max(0, 100 - (time / 15) * 100) :
        currentTest.anim === 'inhale' ? Math.min(100, (time / 8) * 100) : 50

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4, fontSize: 20 }}>Section 3: Breathing Performance Test</h2>
                <div className="text-meta">A guided timer-based test to measure your respiratory capacity accurately.</div>
            </div>

            {/* Step Progress Bar */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {tests.map((test, index) => {
                    const isComplete = data[test.keyAvg] != null
                    const isActive = index === testPhase && testPhase < 1
                    return (
                        <div key={test.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                            <div style={{
                                height: 6, borderRadius: 6,
                                background: isComplete ? test.color : isActive ? `${test.color}55` : 'var(--color-border)',
                                transition: 'background 0.5s ease',
                                boxShadow: isActive ? `0 0 8px ${test.color}66` : 'none'
                            }} />
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 11, fontWeight: isActive || isComplete ? 700 : 400,
                                color: isComplete ? test.color : isActive ? 'var(--color-text)' : 'var(--color-subtle)'
                            }}>
                                {isComplete
                                    ? <CheckCircle2 size={12} color={test.color} />
                                    : <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${isActive ? test.color : 'var(--color-border)'}` }} />
                                }
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {test.title}
                                    {isComplete && <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}> ({data[test.keyAvg]}s)</span>}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {testPhase < 1 ? (
                <div className="card" style={{
                    padding: 28, border: `2px solid ${currentTest.color}44`,
                    background: `linear-gradient(135deg, ${currentTest.color}08 0%, transparent 60%)`
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: currentTest.color, marginBottom: 4 }}>
                                Test 1 of 1
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>{currentTest.title}</h3>
                            <div className="text-meta" style={{ marginTop: 4 }}>{currentTest.subtitle}</div>
                        </div>
                        <div style={{
                            background: 'var(--color-surface)', padding: '6px 14px',
                            borderRadius: 20, fontSize: 12, fontWeight: 700, color: currentTest.color,
                            border: `1px solid ${currentTest.color}33`
                        }}>
                            Attempt 1 / 1
                        </div>
                    </div>

                    {/* Main content: Lung 3D + Controls */}
                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start', marginBottom: 24 }}>
                        {/* Left: 3D Visualization */}
                        <div style={{ flex: '0 0 auto', position: 'relative' }}>
                            <div style={{
                                width: 300, height: 300, borderRadius: 24,
                                overflow: 'hidden',
                                boxShadow: isRunning ? `0 8px 40px ${currentTest.color}44` : '0 8px 32px rgba(0,0,0,0.2)',
                                border: `1px solid ${isRunning ? currentTest.color+'44' : 'rgba(255,255,255,0.05)'}`,
                                transition: 'box-shadow 0.4s ease, border 0.4s ease'
                            }}>
                                <LungCapacityVisualization size={300} healthScore={100} externalIsBreathing={isRunning} externalCapacity={lungCapacity} hideUI={true} />
                            </div>
                            {/* Ripple rings when running */}
                            {isRunning && (
                                <div style={{ position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none' }}>
                                    <div className="ripple-ring" style={{ '--ring-color': currentTest.color }} />
                                    <div className="ripple-ring ripple-ring-2" style={{ '--ring-color': currentTest.color }} />
                                </div>
                            )}
                        </div>

                        {/* Right: Instructions, Timer, Button */}
                        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Instruction */}
                            <div style={{
                                padding: '14px 18px',
                                background: 'var(--color-surface)',
                                borderRadius: 14,
                                borderLeft: `4px solid ${currentTest.color}`,
                                fontSize: 14, lineHeight: 1.6, color: 'var(--color-text)'
                            }}>
                                {currentTest.instruction}
                                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic' }}>
                                    {currentTest.hint}
                                </div>
                            </div>

                            {/* Timer display */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: 80, fontWeight: 200, fontFamily: 'monospace',
                                    letterSpacing: '-4px', lineHeight: 1,
                                    color: isRunning ? currentTest.color : 'var(--color-text)',
                                    transition: 'color 0.3s ease',
                                    textShadow: isRunning ? `0 0 30px ${currentTest.color}66` : 'none'
                                }}>
                                    {String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}
                                </div>
                                <div className="text-meta" style={{ letterSpacing: 3, marginTop: 4, fontSize: 10, textTransform: 'uppercase' }}>
                                    {isRunning ? '● Recording...' : 'Seconds Elapsed'}
                                </div>
                            </div>

                            {/* Feedback */}
                            <div style={{ minHeight: 40, textAlign: 'center' }}>
                                {feedback && (
                                    <div style={{
                                        display: 'inline-block', padding: '8px 20px',
                                        borderRadius: 20, fontSize: 13, fontWeight: 600,
                                        color: feedbackType === 'error' ? 'var(--color-danger)' :
                                            feedbackType === 'success' ? 'var(--color-safe)' : 'var(--color-text)',
                                        background: feedbackType === 'error' ? 'rgba(var(--color-danger-rgb), 0.1)' :
                                            feedbackType === 'success' ? 'rgba(var(--color-safe-rgb), 0.1)' : 'var(--color-surface)',
                                        border: `1px solid ${feedbackType === 'error' ? 'rgba(var(--color-danger-rgb), 0.2)' : feedbackType === 'success' ? 'rgba(var(--color-safe-rgb), 0.2)' : 'transparent'}`,
                                        animation: 'fadeIn 0.3s ease-out'
                                    }}>
                                        {feedback}
                                    </div>
                                )}
                            </div>

                            {/* Big hold button */}
                            <button
                                className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'}`}
                                style={{
                                    width: '100%', height: 76, fontSize: 18, fontWeight: 800,
                                    borderRadius: 22,
                                    background: isRunning ? undefined : `linear-gradient(135deg, ${currentTest.color}, ${currentTest.color}cc)`,
                                    border: 'none',
                                    transform: isRunning ? 'scale(0.97)' : 'scale(1)',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    boxShadow: isRunning ? 'none' : `0 12px 28px -6px ${currentTest.color}66`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                }}
                                onMouseDown={startTest}
                                onMouseUp={stopTest}
                                onMouseLeave={stopTest}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={stopTest}
                                onTouchCancel={stopTest}
                            >
                                <Hand size={24} />
                                {isRunning ? 'HOLDING — RELEASE TO STOP' : 'HOLD WHILE BREATHING'}
                            </button>
                        </div>
                    </div>

                </div>
            ) : (
                /* All 1 complete */
                <div className="card" style={{
                    padding: 36, textAlign: 'center',
                    border: '2px solid var(--color-safe)',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, transparent 60%)'
                }}>
                    <CheckCircle2 size={52} color="var(--color-safe)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 8px 0' }}>Test Completed! 🎉</h3>
                    <div className="text-meta" style={{ marginBottom: 28 }}>
                        Your results have been recorded.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                        {tests.map(test => (
                            <div key={test.id} style={{
                                padding: '16px',
                                background: 'var(--color-surface)',
                                borderRadius: 16,
                                border: `1px solid ${test.color}33`
                            }}>
                                <div style={{ fontSize: 10, color: test.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{test.title}</div>
                                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>{data[test.keyAvg]}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>seconds</div>
                                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: data[test.keyAvg] >= test.target ? 'var(--color-safe)' : 'var(--color-warning)' }}>
                                    {data[test.keyAvg] >= test.target ? `✓ Above target` : `Target: ≥${test.target}s`}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={resetTests} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <RotateCcw size={14} /> Retake Test
                    </button>
                </div>
            )}

            {/* Stairs difficulty (after completion) */}
            {testPhase === 1 && (
                <div className="form-group" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <label className="form-label" style={{ fontSize: 15 }}>
                        After climbing one flight of stairs, do you feel:
                    </label>
                    <select className="form-input" value={data.stairsDifficulty || ''} onChange={e => update({ stairsDifficulty: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="No breathlessness">No breathlessness</option>
                        <option value="Slight breathlessness">Slight breathlessness</option>
                        <option value="Moderate breathlessness">Moderate breathlessness</option>
                        <option value="Severe breathlessness">Severe breathlessness</option>
                    </select>
                </div>
            )}

            <style>{`
                @keyframes ripple {
                    0% { transform: scale(0.85); opacity: 0.6; }
                    100% { transform: scale(1.25); opacity: 0; }
                }
                .ripple-ring {
                    position: absolute; inset: 0;
                    border-radius: 24px;
                    border: 2px solid var(--ring-color, #6366f1);
                    animation: ripple 1.6s ease-out infinite;
                }
                .ripple-ring-2 {
                    animation-delay: 0.6s;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: none; }
                }
            `}</style>
        </div>
    )
}
