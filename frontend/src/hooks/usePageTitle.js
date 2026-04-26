/**
 * usePageTitle.js
 * LOW-2: Sets document.title per-page to improve accessibility and bookmarking.
 * Usage: usePageTitle('Assessment Results') → "Assessment Results | Breathometer"
 */
import { useEffect } from 'react'

const APP_NAME = 'Breathometer'

export default function usePageTitle(title) {
    useEffect(() => {
        const prev = document.title
        document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
        return () => { document.title = prev }
    }, [title])
}
