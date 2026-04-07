import { ShieldCheck, Bot, Clock, CheckCircle2 } from 'lucide-react'

const variants = {
    ai: { icon: Bot, label: 'AI-assisted analysis', color: 'var(--color-primary)' },
    doctor: { icon: ShieldCheck, label: 'Doctor verified', color: 'var(--color-safe)' },
    verified: { icon: CheckCircle2, label: 'Clinically reviewed', color: 'var(--color-safe)' },
    timed: { icon: Clock, label: null, color: 'var(--color-muted)' },
}

export default function TrustTag({ type = 'ai', customLabel }) {
    const v = variants[type] || variants.ai
    const Icon = v.icon
    const text = customLabel || v.label

    return (
        <span className="trust-tag" aria-label={text}>
            <Icon size={11} color={v.color} aria-hidden="true" />
            <span>{text}</span>
        </span>
    )
}
