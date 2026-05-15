/**
 * AccessibleFormField — Phase 4 WCAG 2.1 AA compliant form field
 *
 * Enforces:
 * - Persistent visible label (never placeholder-only) [SC 3.3.2]
 * - "Required" text indicator — not just * [SC 3.3.2]
 * - Error: icon + text, never red-only [SC 1.4.1]
 * - aria-describedby wiring to error + hint [SC 4.1.2]
 * - No outline:none — focus-visible ring always present [SC 2.4.7]
 */
import { useId } from 'react'
import { AlertCircle, Info } from 'lucide-react'

export default function AccessibleFormField({
  label,
  id,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  autoComplete,
  children,         // renders custom input (e.g. password wrapper)
  className = '',
  inputRef,
}) {
  const uid      = useId()
  const fieldId  = id || `field-${uid}`
  const errorId  = `${fieldId}-error`
  const hintId   = `${fieldId}-hint`
  const ariaDesc = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`aff-group ${error ? 'aff-group--error' : ''} ${className}`}>
      {/* Label — always visible, always linked */}
      <label className="aff-label" htmlFor={fieldId}>
        {label}
        {required && (
          <span className="aff-required" aria-label="required">
            {' '}(required)
          </span>
        )}
      </label>

      {/* Hint — above field, before error per WCAG 3.3.2 */}
      {hint && (
        <div id={hintId} className="aff-hint" role="note">
          <Info size={11} aria-hidden="true" />
          {hint}
        </div>
      )}

      {/* Input slot — either children or default <input> */}
      {children
        ? <div className="aff-input-slot">{children}</div>
        : (
          <input
            ref={inputRef}
            id={fieldId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={ariaDesc}
            className="form-input aff-input"
          />
        )
      }

      {/* Error — icon + text, never color alone [SC 1.4.1] */}
      {error && (
        <div id={errorId} className="aff-error" role="alert" aria-live="polite">
          <AlertCircle size={12} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <style>{`
        .aff-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .aff-label {
          font-size: 0.8125rem;   /* 13px rem — WCAG 1.4.4 */
          font-weight: 600;
          color: var(--color-text-2, var(--color-text));
          line-height: 1.4;
          cursor: default;
        }
        .aff-required {
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--color-muted);
          margin-left: 1px;
        }
        .aff-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;     /* 12px rem */
          color: var(--color-muted);
          line-height: 1.5;
        }
        .aff-input-slot {
          position: relative;
        }
        .aff-input {
          /* WCAG 2.4.7: must-have focus ring — never outline:none */
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .aff-input:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-faded, rgba(37,99,235,0.15));
        }
        .aff-group--error .aff-input,
        .aff-group--error .form-input {
          border-color: var(--color-danger) !important;
          box-shadow: 0 0 0 2px rgba(220,38,38,0.12) !important;
        }
        .aff-error {
          display: flex;
          align-items: flex-start;
          gap: 5px;
          font-size: 0.75rem;     /* 12px rem */
          font-weight: 500;
          color: var(--color-danger);
          line-height: 1.4;
          margin-top: 2px;
        }
        .aff-error svg {
          flex-shrink: 0;
          margin-top: 1px;
        }
      `}</style>
    </div>
  )
}
