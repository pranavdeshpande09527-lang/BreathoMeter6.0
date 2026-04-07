import React, { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Bot, User, Activity, Mic, Paperclip, Sparkles, Zap, Wind, Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const QUICK_PROMPTS = [
  { icon: <Wind size={14} />, label: 'Air Quality Tips', text: 'What can I do to improve my indoor air quality?' },
  { icon: <Activity size={14} />, label: 'My Breathing Score', text: 'Explain what my breathing score means for my health.' },
  { icon: <Heart size={14} />, label: 'Risk Factors', text: 'What are the main health risks from poor air quality?' },
  { icon: <Zap size={14} />, label: 'Quick Actions', text: 'What should I do if my AQI is unhealthy today?' },
]

export default function HavaPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'hava',
      text: "Hello! I'm **Hava**, your AI Breathing & Air Quality Assistant. I'm here to help you understand your respiratory health, interpret your breathing scores, and provide personalised advice based on your data.\n\nHow can I assist you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const theme = document.documentElement.getAttribute('data-theme') || 'light'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async (textOverride) => {
    const text = (textOverride || inputValue).trim()
    if (!text) return

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    try {
      const response = await api.ai.chat(text)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'hava',
        text: response.reply || "I'm sorry, I couldn't process that.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'hava',
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSend()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Render markdown-like bold
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      return part.split('\n').map((line, j) => (
        <React.Fragment key={`${i}-${j}`}>
          {line}
          {j < part.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))
    })
  }

  return (
    <div className="hava-page">
      {/* Ambient background orbs */}
      <div className="hava-page-orb hava-page-orb--1" aria-hidden="true" />
      <div className="hava-page-orb hava-page-orb--2" aria-hidden="true" />

      {/* Header */}
      <header className="hava-page-header">
        <button className="hava-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="hava-page-header-center">
          <div className="hava-page-avatar">
            <Activity size={22} color="#fff" />
            <span className="hava-page-avatar-dot" aria-hidden="true" />
          </div>
          <div>
            <div className="hava-page-name">Hava AI</div>
            <div className="hava-page-status">
              <span className="hava-page-status-dot" />
              Always available · Personalised health assistant
            </div>
          </div>
        </div>
        <div className="hava-page-header-badge">
          <Sparkles size={12} />
          AI-Powered
        </div>
      </header>

      {/* Messages */}
      <main className="hava-page-messages" id="hava-messages">
        {/* Quick prompts — only show at top */}
        {messages.length === 1 && (
          <div className="hava-quick-prompts">
            <p className="hava-quick-label">Quick questions</p>
            <div className="hava-quick-grid">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  className="hava-quick-btn"
                  onClick={() => handleSend(qp.text)}
                >
                  {qp.icon}
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`hava-page-msg-row ${msg.sender === 'user' ? 'hava-page-msg-row--user' : 'hava-page-msg-row--hava'}`}
          >
            {msg.sender === 'hava' && (
              <div className="hava-page-msg-avatar">
                <Bot size={14} color="#fff" />
              </div>
            )}
            <div className={`hava-page-bubble ${msg.sender === 'user' ? 'hava-page-bubble--user' : 'hava-page-bubble--hava'}`}>
              <p className="hava-page-bubble-text">{renderText(msg.text)}</p>
              <div className="hava-page-bubble-time">{msg.time}</div>
            </div>
            {msg.sender === 'user' && (
              <div className="hava-page-msg-avatar hava-page-msg-avatar--user">
                <User size={14} strokeWidth={2.5} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="hava-page-msg-row hava-page-msg-row--hava">
            <div className="hava-page-msg-avatar">
              <Bot size={14} color="#fff" />
            </div>
            <div className="hava-page-bubble hava-page-bubble--hava hava-page-typing">
              <span className="hava-dot" />
              <span className="hava-dot" />
              <span className="hava-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="hava-page-input-wrap">
        <form className="hava-page-input-form" onSubmit={handleSubmit}>
          <div className="hava-page-input-box">
            <textarea
              ref={inputRef}
              className="hava-page-textarea"
              placeholder="Ask Hava about your breathing, AQI, risks..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              aria-label="Message Hava"
            />
            <button
              type="submit"
              className="hava-page-send-btn"
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send"
            >
              <Send size={17} strokeWidth={2.5} />
            </button>
          </div>
          <p className="hava-page-disclaimer">
            Hava provides AI-generated health insights. Always consult a doctor for medical advice.
          </p>
        </form>
      </footer>

      <style>{`
        .hava-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--color-bg, #f8fafc);
          position: relative;
          overflow: hidden;
          font-family: var(--font-family, 'Inter', sans-serif);
        }

        /* Ambient orbs */
        .hava-page-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .hava-page-orb--1 {
          width: 480px; height: 480px;
          top: -120px; left: -120px;
          background: radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%);
        }
        .hava-page-orb--2 {
          width: 400px; height: 400px;
          bottom: -80px; right: -80px;
          background: radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%);
        }
        [data-theme='dark'] .hava-page-orb--1 {
          background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%);
        }
        [data-theme='dark'] .hava-page-orb--2 {
          background: radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%);
        }

        /* Header */
        .hava-page-header {
          position: sticky;
          top: 0;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid rgba(226,232,240,0.6);
          box-shadow: 0 2px 16px rgba(0,0,0,0.04);
          z-index: 10;
        }
        [data-theme='dark'] .hava-page-header {
          background: rgba(11,17,32,0.92);
          border-bottom-color: rgba(255,255,255,0.07);
          box-shadow: 0 2px 20px rgba(0,0,0,0.28);
        }

        .hava-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px; height: 38px;
          background: var(--color-surface, #f1f5f9);
          border: 1.5px solid var(--color-border, #e2e8f0);
          border-radius: 50%;
          color: var(--color-text, #0f172a);
          cursor: pointer;
          transition: all 0.16s;
          flex-shrink: 0;
        }
        .hava-back-btn:hover {
          background: var(--color-bg, #f8fafc);
          transform: translateX(-2px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .hava-page-header-center {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .hava-page-avatar {
          position: relative;
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(37,99,235,0.30);
        }
        .hava-page-avatar-dot {
          position: absolute;
          bottom: 1px; right: 1px;
          width: 11px; height: 11px;
          background: #10b981;
          border-radius: 50%;
          border: 2px solid white;
          animation: hava-pulse-dot 2.5s ease-in-out infinite;
        }
        @keyframes hava-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.75; }
        }

        .hava-page-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text, #0f172a);
          letter-spacing: -0.2px;
        }
        .hava-page-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: var(--color-subtle, #94a3b8);
          font-weight: 400;
          margin-top: 1px;
        }
        .hava-page-status-dot {
          width: 6px; height: 6px;
          background: #10b981;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .hava-page-header-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(124,58,237,0.10) 100%);
          border: 1px solid rgba(37,99,235,0.15);
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: #2563eb;
          white-space: nowrap;
        }
        [data-theme='dark'] .hava-page-header-badge {
          background: rgba(37,99,235,0.15);
          border-color: rgba(37,99,235,0.25);
          color: #93c5fd;
        }

        /* Messages */
        .hava-page-messages {
          flex: 1;
          overflow-y: auto;
          padding: 28px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 1;
          max-width: 760px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }

        /* Quick prompts */
        .hava-quick-prompts {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 8px;
        }
        .hava-quick-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--color-subtle, #94a3b8);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin: 0;
        }
        .hava-quick-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .hava-quick-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--color-surface, #f8fafc);
          border: 1.5px solid var(--color-border, #e2e8f0);
          border-radius: 12px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--color-text-2, #475569);
          cursor: pointer;
          transition: all 0.16s;
          text-align: left;
          font-family: inherit;
        }
        .hava-quick-btn:hover {
          background: var(--color-bg, #f1f5f9);
          border-color: var(--color-primary, #2563eb);
          color: var(--color-primary, #2563eb);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37,99,235,0.10);
        }
        .hava-quick-btn svg {
          color: var(--color-primary, #2563eb);
          flex-shrink: 0;
        }

        /* Message rows */
        .hava-page-msg-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          animation: hava-msg-in 0.26s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes hava-msg-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hava-page-msg-row--user {
          flex-direction: row-reverse;
        }

        /* Avatar */
        .hava-page-msg-avatar {
          width: 30px; height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          box-shadow: 0 2px 8px rgba(37,99,235,0.22);
        }
        .hava-page-msg-avatar--user {
          background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
          box-shadow: 0 2px 8px rgba(15,23,42,0.18);
        }
        [data-theme='dark'] .hava-page-msg-avatar--user {
          background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
        }

        /* Bubbles */
        .hava-page-bubble {
          max-width: 72%;
          border-radius: 18px;
          padding: 12px 16px;
          position: relative;
        }
        .hava-page-bubble--hava {
          background: var(--color-surface, #f8fafc);
          border: 1px solid var(--color-border, #e2e8f0);
          border-bottom-left-radius: 5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
        }
        [data-theme='dark'] .hava-page-bubble--hava {
          background: rgba(30,41,59,0.85);
          border-color: rgba(255,255,255,0.08);
        }
        .hava-page-bubble--user {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          border-bottom-right-radius: 5px;
          box-shadow: 0 4px 16px rgba(37,99,235,0.28);
        }

        .hava-page-bubble-text {
          font-size: 14px;
          line-height: 1.65;
          color: var(--color-text, #0f172a);
          margin: 0;
          word-break: break-word;
        }
        .hava-page-bubble--user .hava-page-bubble-text {
          color: #fff;
        }

        .hava-page-bubble-time {
          font-size: 10.5px;
          color: var(--color-subtle, #94a3b8);
          margin-top: 5px;
          text-align: right;
        }
        .hava-page-bubble--user .hava-page-bubble-time {
          color: rgba(255,255,255,0.65);
        }

        /* Typing indicator */
        .hava-page-typing {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 14px 18px;
          min-width: 60px;
        }
        .hava-dot {
          width: 7px; height: 7px;
          background: var(--color-subtle, #94a3b8);
          border-radius: 50%;
          animation: hava-bounce 1.3s ease-in-out infinite;
        }
        .hava-dot:nth-child(2) { animation-delay: 0.18s; }
        .hava-dot:nth-child(3) { animation-delay: 0.36s; }
        @keyframes hava-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        /* Input area */
        .hava-page-input-wrap {
          position: sticky;
          bottom: 0;
          background: rgba(255,255,255,0.90);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-top: 1px solid rgba(226,232,240,0.6);
          padding: 16px 20px 20px;
          z-index: 10;
        }
        [data-theme='dark'] .hava-page-input-wrap {
          background: rgba(11,17,32,0.95);
          border-top-color: rgba(255,255,255,0.07);
        }

        .hava-page-input-form {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hava-page-input-box {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--color-surface, #f8fafc);
          border: 1.5px solid var(--color-border, #e2e8f0);
          border-radius: 16px;
          padding: 10px 10px 10px 16px;
          transition: all 0.18s;
        }
        .hava-page-input-box:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
          background: var(--color-bg, #fff);
        }

        .hava-page-textarea {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          font-weight: 400;
          color: var(--color-text, #0f172a);
          font-family: inherit;
          resize: none;
          line-height: 1.5;
          max-height: 120px;
          overflow-y: auto;
          padding: 2px 0;
        }
        .hava-page-textarea::placeholder {
          color: var(--color-subtle, #94a3b8);
        }

        .hava-page-send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          cursor: pointer;
          transition: all 0.16s;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(37,99,235,0.30);
        }
        .hava-page-send-btn:hover:not(:disabled) {
          transform: scale(1.06);
          box-shadow: 0 6px 18px rgba(37,99,235,0.40);
        }
        .hava-page-send-btn:active:not(:disabled) {
          transform: scale(0.94);
        }
        .hava-page-send-btn:disabled {
          opacity: 0.38;
          cursor: not-allowed;
          box-shadow: none;
        }

        .hava-page-disclaimer {
          font-size: 11px;
          color: var(--color-subtle, #94a3b8);
          text-align: center;
          margin: 0;
        }

        /* Scrollbar */
        .hava-page-messages::-webkit-scrollbar { width: 5px; }
        .hava-page-messages::-webkit-scrollbar-track { background: transparent; }
        .hava-page-messages::-webkit-scrollbar-thumb { background: var(--color-border, #e2e8f0); border-radius: 4px; }

        /* Responsive */
        @media (max-width: 600px) {
          .hava-page-messages { padding: 20px 12px 16px; }
          .hava-page-input-wrap { padding: 12px 12px 16px; }
          .hava-page-header { padding: 12px 16px; }
          .hava-page-header-badge { display: none; }
          .hava-quick-grid { grid-template-columns: repeat(2, 1fr); }
          .hava-page-bubble { max-width: 85%; }
        }
      `}</style>
    </div>
  )
}
